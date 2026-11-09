'use strict';

// NWP-ENGINE-016: logical topology data for one plan.
// Pure function: no I/O, no clock, no randomness. Assumptions go to ctx.ledger, advisories to ctx.flags.
// Logical only: nodes and edges, never coordinates. The client lays the graph out (dagre).
//
// Edge direction: `source` is the side closer to the Internet, so the data path reads from the Internet inward.
// The one exception is the management edge, which runs from the controller to the gateway.
//
// Consumes: plan (vendor, complete, items, bom), requirements, NormalizedInput, the catalog snapshot.
// Produces: { nodes, edges }, or null when an incomplete plan lacks the gateway/switch/AP skeleton (the front end shows "unavailable"). A partial plan with the skeleton is drawn and flagged TOPOLOGY_PARTIAL.
//
// Node ids are stable: `<role>-<sku>-<index>`, with the index counted per SKU in plan order.
// WAN nodes are `wan-<index>`; client groups are `client-<kind>`.

const { addLedger, addFlag, ValidationError } = require('../ctx.js');

// Client groups in drawing order. Allocation order is separate (PoE devices claim PoE ports first).
const CLIENT_GROUPS = Object.freeze([
  { kind: 'wired_pcs', inputKey: 'wiredPcs', label: 'Wired PCs', edgeType: 'access', needsPoe: false },
  { kind: 'wifi_devices', inputKey: 'wifiDevices', label: 'Wi-Fi devices', edgeType: 'access', needsPoe: false },
  { kind: 'voip_phones', inputKey: 'voipPhones', label: 'VoIP phones', edgeType: 'poe', needsPoe: true },
  { kind: 'cameras', inputKey: 'cameras', label: 'IP cameras', edgeType: 'poe', needsPoe: true },
  // NormalizedInput carries no count for other devices, so this group has no `count` and claims no port capacity.
  { kind: 'other_devices', inputKey: null, label: 'Other devices', edgeType: 'access', needsPoe: false },
]);

const compact = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

// Mirrors calculateAccessSwitchUplinks in switches.js (kept local so this module does not pull in selection code).
function accessUplinksPerSwitch(floors, redundancyRequired) {
  if (floors === 1) return 0;
  return redundancyRequired ? 2 : 1;
}

// Same arithmetic as the selector: ports = copper + SFP, uplinks are taken out of that, PoE ports are a subset.
function switchCapacity(row, uplinks) {
  const copper = Number.isInteger(row?.copper_ports) ? row.copper_ports : null;
  const sfp = Number.isInteger(row?.sfp_ports) ? row.sfp_ports : 0;
  const poe = Number.isInteger(row?.poe_ports) ? row.poe_ports : null;
  const edgePorts = copper === null ? 0 : Math.max(0, copper + sfp - uplinks);
  return {
    edgePorts,
    poePorts: Math.min(poe ?? 0, edgePorts),
    copperKnown: copper !== null,
    poeKnown: poe !== null,
  };
}

// First-fit across the pool in plan order. Anything that does not fit goes on the last unit and is counted as overflow.
function allocate(pool, count, needsPoe, overflow) {
  const assigned = new Map();
  let remaining = count;

  for (const unit of pool) {
    if (remaining === 0) break;
    const room = needsPoe ? Math.min(unit.poeFree, unit.edgeFree) : unit.edgeFree;
    const take = Math.min(remaining, Math.max(room, 0));
    if (take > 0) {
      assigned.set(unit.id, take);
      unit.edgeFree -= take;
      if (needsPoe) unit.poeFree -= take;
      remaining -= take;
    }
  }

  if (remaining > 0) {
    const last = pool[pool.length - 1];
    assigned.set(last.id, (assigned.get(last.id) ?? 0) + remaining);
    overflow.total += remaining;
  }

  return assigned;
}

const positiveInt = (value) => (Number.isInteger(value) && value > 0 ? value : 0);

function buildTopology(plan, reqs, input, ctx, catalog) {
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.items) || !plan.bom || !Array.isArray(plan.bom.lines)) {
    throw new ValidationError('plan', 'Plan must have items and a bom with lines.');
  }
  if (!reqs || typeof reqs !== 'object') {
    throw new ValidationError('reqs', 'Requirements must be an object.');
  }
  if (!input || typeof input !== 'object') {
    throw new ValidationError('input', 'Normalized input must be an object.');
  }
  if (!ctx || !Array.isArray(ctx.ledger) || !Array.isArray(ctx.flags)) {
    throw new ValidationError('ctx', 'ctx from createCtx() is required.');
  }
  if (!Array.isArray(catalog)) {
    throw new ValidationError('catalog', 'Must be the catalog snapshot array.');
  }

  // An incomplete plan is drawn only when it still holds the barebones skeleton (gateway, at least one switch,
  // at least one access point); otherwise it gets no topology. A partial drawing raises TOPOLOGY_PARTIAL.
  const isPartial = plan.complete !== true;
  if (isPartial) {
    const present = (category) =>
      (Array.isArray(plan.items) ? plan.items : []).some((item) => item.category === category && item.qty > 0);
    if (!present('gateway') || !present('switch') || !present('access_point')) return null;
  }

  // Catalog rows are read here for engineering specs only and are never copied into the output.
  const catalogBySku = new Map();
  for (const row of catalog) {
    if (row && row.vendor === plan.vendor && !catalogBySku.has(row.sku)) catalogBySku.set(row.sku, row);
  }

  const bomLines = plan.bom.lines;
  const describe = (item) => {
    const line =
      bomLines.find((candidate) => candidate.category === item.category && candidate.sku === item.sku) ??
      bomLines.find((candidate) => candidate.sku === item.sku);
    const row = catalogBySku.get(item.sku);
    const rowStatus = row && (row.status === 'ACTIVE' || row.status === 'SUNSETTING') ? row.status : undefined;
    return { sku: item.sku, label: line?.name ?? row?.name ?? item.sku, status: line?.status ?? rowStatus, row };
  };

  const items = plan.items.filter((item) => item.qty > 0);
  const gatewayItem = items.find((item) => item.category === 'gateway');
  const controllerItem = items.find((item) => item.category === 'controller');
  const apItem = items.find((item) => item.category === 'access_point');
  const switchItems = items.filter((item) => item.category === 'switch');

  if (!gatewayItem) {
    throw new ValidationError('plan.items', 'A complete plan must contain a gateway item.');
  }

  if (isPartial) {
    addFlag(
      ctx,
      'TOPOLOGY_PARTIAL',
      `The ${plan.vendor} (${plan.planType}) plan is incomplete, so the topology shows only the devices that could be selected (gateway, switches and access points) and is not a full design.`
    );
  }

  const nodes = [];
  const edges = [];
  const addNode = (node) => {
    nodes.push(compact(node));
    return node.id;
  };
  const addEdge = (source, target, type, medium, count) => {
    edges.push(compact({ id: `edge-${source}--${target}`, source, target, type, medium, count }));
  };

  // ---- Internet / WAN (AC3) ----
  const gateway = describe(gatewayItem);
  const dualWanWanted = reqs.redundancy === 'backupWan' || reqs.redundancy === 'required';
  let wanCount = 1;

  if (dualWanWanted) {
    if (gateway.row?.dual_wan === true) {
      wanCount = 2;
    } else if (gateway.row?.dual_wan === false) {
      addFlag(
        ctx,
        'TOPOLOGY_DUAL_WAN_UNAVAILABLE',
        `Dual WAN is needed for the stated downtime tolerance, but the selected gateway (${gateway.sku}) does not support it; a single WAN link is drawn.`
      );
    } else {
      addFlag(
        ctx,
        'TOPOLOGY_DUAL_WAN_UNKNOWN',
        `Dual WAN is needed for the stated downtime tolerance, but the catalog does not say whether the selected gateway (${gateway.sku}) supports it; a single WAN link is drawn.`
      );
    }
  }

  const wanIds = [];
  for (let index = 0; index < wanCount; index += 1) {
    let label = 'Internet';
    if (wanCount === 2) label = index === 0 ? 'Internet (primary link)' : 'Internet (backup link)';
    wanIds.push(addNode({ id: `wan-${index}`, role: 'wan', layer: 'wan', label }));
  }

  // ---- Gateway, logical firewall, controller (AC1) ----
  const integratesController =
    !controllerItem && Array.isArray(gateway.row?.capabilities) && gateway.row.capabilities.includes('controller');

  const gatewayId = addNode({
    id: `gateway-${gateway.sku}-0`,
    role: 'gateway',
    layer: 'gateway',
    label: gateway.label,
    sku: gateway.sku,
    qty: gatewayItem.qty,
    status: gateway.status,
    integrates: integratesController ? ['firewall', 'controller'] : ['firewall'],
  });

  // The firewall is always a separate logical node tied to the gateway SKU (no vendor has a dedicated firewall).
  const firewallId = addNode({
    id: `firewall-${gateway.sku}-0`,
    role: 'firewall',
    layer: 'gateway',
    label: gateway.label,
    sku: gateway.sku,
    integratedWith: gatewayId,
  });

  let controllerId = null;
  if (controllerItem) {
    const controller = describe(controllerItem);
    controllerId = addNode({
      id: `controller-${controller.sku}-0`,
      role: 'controller',
      layer: 'management',
      label: controller.label,
      sku: controller.sku,
      qty: controllerItem.qty,
      status: controller.status,
    });
  }

  // ---- Switches: one node per unit, so each device can attach to exactly one switch ----
  // The first switch item is the core; every later switch item is an access switch.
  // With a single switch item there is no separate access layer, so the core units also serve the edge.
  const skuCounters = new Map();
  const nextIndex = (sku) => {
    const index = skuCounters.get(sku) ?? 0;
    skuCounters.set(sku, index + 1);
    return index;
  };

  const switchUnits = [];
  switchItems.forEach((item, itemIndex) => {
    const info = describe(item);
    const layer = itemIndex === 0 ? 'core' : 'access';
    for (let unit = 0; unit < item.qty; unit += 1) {
      const id = addNode({
        id: `switch-${item.sku}-${nextIndex(item.sku)}`,
        role: 'switch',
        layer,
        label: info.label,
        sku: item.sku,
        qty: 1,
        status: info.status,
      });
      switchUnits.push({ id, layer, sku: item.sku, row: info.row });
    }
  });

  const coreUnits = switchUnits.filter((unit) => unit.layer === 'core');
  const accessUnits = switchUnits.filter((unit) => unit.layer === 'access');
  const poolUnits = accessUnits.length > 0 ? accessUnits : coreUnits;

  // ---- Access points: one grouped node with the plan total (TOPO-003 AC10) ----
  const apQty = apItem ? apItem.qty : 0;
  let apId = null;
  if (apItem) {
    const ap = describe(apItem);
    apId = addNode({
      id: `access_point-${ap.sku}-0`,
      role: 'access_point',
      layer: 'edge',
      label: ap.label,
      sku: ap.sku,
      qty: apItem.qty,
      status: ap.status,
    });
  }

  // ---- Client groups: one grouped node per kind, carrying a count ----
  const groupNodeIds = {};
  const groupCounts = {};
  for (const group of CLIENT_GROUPS) {
    if (group.kind === 'other_devices') {
      if (input.otherDevices?.hasOtherDevices === true) {
        groupNodeIds[group.kind] = addNode({
          id: `client-${group.kind}`,
          role: 'client_group',
          layer: 'edge',
          label: group.label,
          clientKind: group.kind,
        });
      }
      continue;
    }

    const count = positiveInt(input[group.inputKey]);
    groupCounts[group.kind] = count;
    if (count === 0) continue;

    if (group.kind === 'wifi_devices' && apId === null) {
      addFlag(
        ctx,
        'TOPOLOGY_WIFI_DEVICES_WITHOUT_AP',
        'Wi-Fi devices were reported but the plan has no access points, so the Wi-Fi device group is not drawn.'
      );
      continue;
    }

    groupNodeIds[group.kind] = addNode({
      id: `client-${group.kind}`,
      role: 'client_group',
      layer: 'edge',
      label: group.label,
      count,
      clientKind: group.kind,
    });
  }

  // ---- Attachment: fixed fill rule over the pool, in plan order (AC4) ----
  const redundancyRequired = String(reqs.redundancy ?? '').toLowerCase() === 'required';
  const uplinks = accessUnits.length > 0 ? accessUplinksPerSwitch(input.floors, redundancyRequired) : 0;

  // With no switch at all, edge devices hang off the gateway with no port limit.
  const pool = (poolUnits.length > 0 ? poolUnits : [{ id: gatewayId, unlimited: true }]).map((unit) => {
    if (unit.unlimited) return { id: unit.id, edgeFree: Infinity, poeFree: Infinity, capacity: null };
    const capacity = switchCapacity(unit.row, uplinks);
    return { id: unit.id, sku: unit.sku, edgeFree: capacity.edgePorts, poeFree: capacity.poePorts, capacity };
  });

  const needsPoe = apQty > 0 || (groupCounts.voip_phones ?? 0) > 0 || (groupCounts.cameras ?? 0) > 0;
  const missingSpecs = [
    ...new Set(
      pool
        .filter((unit) => unit.capacity && (!unit.capacity.copperKnown || (needsPoe && !unit.capacity.poeKnown)))
        .map((unit) => unit.sku)
    ),
  ];
  if (missingSpecs.length > 0) {
    addFlag(
      ctx,
      'TOPOLOGY_SWITCH_SPECS_MISSING',
      `Port counts are missing in the catalog for switch ${missingSpecs.join(', ')}, so devices cannot be spread across its ports; the unplaced devices are drawn on the last switch.`
    );
  }

  const overflow = { total: 0 };
  // PoE devices claim PoE ports first; wired devices then fill whatever ports remain.
  const apAssigned = apQty > 0 ? allocate(pool, apQty, true, overflow) : new Map();
  const assigned = {};
  for (const kind of ['voip_phones', 'cameras', 'wired_pcs']) {
    const count = groupCounts[kind] ?? 0;
    const group = CLIENT_GROUPS.find((candidate) => candidate.kind === kind);
    assigned[kind] = count > 0 ? allocate(pool, count, group.needsPoe, overflow) : new Map();
  }

  if (overflow.total > 0) {
    addFlag(
      ctx,
      'TOPOLOGY_ATTACHMENT_OVERFLOW',
      `${overflow.total} device connection(s) did not fit on the selected switches' reported ports; they are drawn on the last switch. Check the port counts of the selected switches.`
    );
  }

  addLedger(
    ctx,
    'topology.attachment',
    'assumed layout',
    'ESTIMATE: access points, phones and cameras are filled onto PoE ports and wired devices onto the remaining ports, switch by switch in plan order. The real attachment depends on cabling and room layout, which this planning stage does not know.'
  );

  // ---- Edges (AC2) ----
  wanIds.forEach((wanId) => addEdge(wanId, gatewayId, 'wan', 'logical'));
  addEdge(gatewayId, firewallId, 'uplink', 'logical');
  if (controllerId) addEdge(controllerId, gatewayId, 'management', 'logical');

  coreUnits.forEach((core) => addEdge(gatewayId, core.id, 'uplink', 'copper'));

  const backboneMedium = reqs.backbone === 'fiber' ? 'fiber' : 'copper';
  accessUnits.forEach((access) => {
    coreUnits.forEach((core) => addEdge(core.id, access.id, 'uplink', backboneMedium));
  });

  if (apId) {
    for (const [unitId, count] of apAssigned) addEdge(unitId, apId, 'poe', 'copper', count);
  }

  for (const group of CLIENT_GROUPS) {
    const nodeId = groupNodeIds[group.kind];
    if (!nodeId) continue;

    if (group.kind === 'wifi_devices') {
      // Wi-Fi devices reach the network through the access points, not through switch ports.
      addEdge(apId, nodeId, 'access', 'wireless');
    } else if (group.kind === 'other_devices') {
      // No count is known, so the group claims no capacity: it hangs off the first unit that still has a free port.
      const target = pool.find((unit) => unit.edgeFree > 0) ?? pool[0];
      addEdge(target.id, nodeId, 'access', 'copper');
    } else {
      for (const [unitId, count] of assigned[group.kind]) {
        addEdge(unitId, nodeId, group.edgeType, 'copper', count);
      }
    }
  }

  return { nodes, edges };
}

module.exports = { buildTopology };