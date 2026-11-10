'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCtx } = require('../../ctx.js');
const { buildTopology } = require('../../steps/topology.js');
const { catalog, makePlan, requirements, input, deepFreeze } = require('../../fixtures/e16-fixtures.js');

const build = (plan = makePlan(), reqs = requirements(), inp = input(), cat = catalog) => {
  const ctx = createCtx();
  const topology = buildTopology(plan, reqs, inp, ctx, cat);
  return { topology, ctx };
};
const byId = (topology, id) => topology.nodes.find((node) => node.id === id);
const edgesOf = (topology, type) => topology.edges.filter((edge) => edge.type === type);

test('AC1: nodes for WAN, gateway, separate firewall, controller, switches, AP and client groups', () => {
  const { topology } = build();
  const roles = new Set(topology.nodes.map((node) => node.role));
  ['wan', 'gateway', 'firewall', 'controller', 'switch', 'access_point', 'client_group'].forEach((role) =>
    assert.ok(roles.has(role), `missing role ${role}`)
  );

  const firewall = byId(topology, 'firewall-GW1-0');
  assert.equal(firewall.integratedWith, 'gateway-GW1-0');
  assert.deepEqual(byId(topology, 'gateway-GW1-0').integrates, ['firewall']);

  const groups = Object.fromEntries(
    topology.nodes.filter((node) => node.role === 'client_group').map((node) => [node.clientKind, node.count])
  );
  assert.equal(groups.wired_pcs, 5);
  assert.equal(groups.wifi_devices, 40);
  assert.equal(groups.voip_phones, 2);
  assert.equal(groups.cameras, 2);
  assert.ok('other_devices' in groups);
});

test('AC1: device nodes carry exact sku, qty and a layer hint', () => {
  const { topology } = build();
  assert.equal(byId(topology, 'gateway-GW1-0').layer, 'gateway');
  assert.equal(byId(topology, 'controller-CTL-0').layer, 'management');
  assert.equal(byId(topology, 'switch-CORE-0').layer, 'core');
  assert.equal(byId(topology, 'switch-ACC-0').layer, 'access');
  const ap = byId(topology, 'access_point-AP1-0');
  assert.equal(ap.sku, 'AP1');
  assert.equal(ap.qty, 6);
  assert.equal(ap.layer, 'edge');
  assert.equal(byId(topology, 'switch-ACC-0').status, 'SUNSETTING');
});

test('AC1: the first switch item is the core even when it shares a SKU with the access switches', () => {
  const plan = makePlan({
    items: [
      { category: 'gateway', sku: 'GW1', qty: 1 },
      { category: 'switch', sku: 'ACC', qty: 2 },
      { category: 'switch', sku: 'ACC', qty: 2 },
      { category: 'access_point', sku: 'AP1', qty: 2 },
    ],
  });
  const { topology } = build(plan);
  const ids = topology.nodes.filter((node) => node.role === 'switch').map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length, 'node ids must be unique');
  assert.deepEqual(
    topology.nodes.filter((node) => node.role === 'switch').map((node) => node.layer),
    ['core', 'core', 'access', 'access']
  );
});

test('AC2: every required link exists with a valid type', () => {
  const { topology } = build();
  const valid = new Set(['wan', 'uplink', 'poe', 'access', 'management']);
  topology.edges.forEach((edge) => assert.ok(valid.has(edge.type), `bad type ${edge.type}`));

  const has = (source, target, type) =>
    topology.edges.some((edge) => edge.source === source && edge.target === target && edge.type === type);
  assert.ok(has('wan-0', 'gateway-GW1-0', 'wan'));
  assert.ok(has('gateway-GW1-0', 'firewall-GW1-0', 'uplink'));
  assert.ok(has('controller-CTL-0', 'gateway-GW1-0', 'management'));
  assert.ok(has('gateway-GW1-0', 'switch-CORE-0', 'uplink'));
  assert.ok(has('switch-CORE-0', 'switch-ACC-0', 'uplink'));
  assert.ok(edgesOf(topology, 'poe').some((edge) => edge.target === 'access_point-AP1-0'));
  assert.ok(edgesOf(topology, 'access').some((edge) => edge.target === 'client-wired_pcs'));
  topology.edges.forEach((edge) => {
    assert.ok(byId(topology, edge.source), `unknown source ${edge.source}`);
    assert.ok(byId(topology, edge.target), `unknown target ${edge.target}`);
  });
});

test('AC2: the backbone medium follows the requirement', () => {
  const fiber = build().topology;
  assert.ok(fiber.edges.some((edge) => edge.source.startsWith('switch-CORE') && edge.medium === 'fiber'));
  const copper = build(makePlan(), { ...requirements(), backbone: 'copper' }).topology;
  assert.ok(copper.edges.some((edge) => edge.source.startsWith('switch-CORE') && edge.medium === 'copper'));
});

test('AC3: dual WAN is drawn when required and the gateway supports it', () => {
  const { topology, ctx } = build();
  assert.equal(topology.nodes.filter((node) => node.role === 'wan').length, 2);
  assert.ok(!ctx.flags.some((flag) => flag.code.startsWith('TOPOLOGY_DUAL_WAN')));
});

test('AC3: a gateway without dual WAN gets one WAN link and a flag', () => {
  const plan = makePlan({ items: makePlan().items.map((item) => (item.category === 'gateway' ? { ...item, sku: 'GW-NODUAL' } : item)) });
  const { topology, ctx } = build(plan);
  assert.equal(topology.nodes.filter((node) => node.role === 'wan').length, 1);
  assert.ok(ctx.flags.some((flag) => flag.code === 'TOPOLOGY_DUAL_WAN_UNAVAILABLE'));
});

test('AC3: unknown dual-WAN support gets one WAN link and a different flag', () => {
  const plan = makePlan({ items: makePlan().items.map((item) => (item.category === 'gateway' ? { ...item, sku: 'GW-UNKNOWN' } : item)) });
  const { topology, ctx } = build(plan);
  assert.equal(topology.nodes.filter((node) => node.role === 'wan').length, 1);
  assert.ok(ctx.flags.some((flag) => flag.code === 'TOPOLOGY_DUAL_WAN_UNKNOWN'));
});

test('AC3: no redundancy requirement means one WAN link and no flag', () => {
  // Enough PoE ports for every PoE device so no unrelated attachment flag fires.
  const roomy = catalog.map((row) => (row.sku === 'ACC' ? { ...row, poe_ports: 10 } : row));
  const { topology, ctx } = build(makePlan(), { ...requirements(), redundancy: 'none' }, input(), roomy);
  assert.equal(topology.nodes.filter((node) => node.role === 'wan').length, 1);
  assert.equal(ctx.flags.length, 0);
});

test('AC4: identical inputs give identical output with stable ids', () => {
  const first = build().topology;
  const second = build().topology;
  assert.deepEqual(first, second);
  first.nodes.forEach((node) => assert.match(node.id, /^(wan-\d+|client-[a-z_]+|[a-z_]+-[A-Za-z0-9-]+-\d+)$/));
  assert.equal(new Set(first.nodes.map((node) => node.id)).size, first.nodes.length);
});

test('AC4: APs fill PoE ports in switch order and each AP lands on exactly one switch', () => {
  const { topology } = build();
  const apEdges = edgesOf(topology, 'poe').filter((edge) => edge.target === 'access_point-AP1-0');
  assert.equal(apEdges.reduce((sum, edge) => sum + edge.count, 0), 6);
  // each ACC unit has 4 PoE ports, so the first unit takes 4 and the second takes the remaining 2
  assert.deepEqual(
    apEdges.map((edge) => [edge.source, edge.count]),
    [['switch-ACC-0', 4], ['switch-ACC-1', 2]]
  );
});

test('AC4: wired devices are counted exactly once across switches', () => {
  const { topology } = build();
  const total = edgesOf(topology, 'access')
    .filter((edge) => edge.target === 'client-wired_pcs')
    .reduce((sum, edge) => sum + edge.count, 0);
  assert.equal(total, 5);
});

test('AC4: the attachment is recorded in the ledger as an ESTIMATE', () => {
  const { ctx } = build();
  const entry = ctx.ledger.find((item) => item.field === 'topology.attachment');
  assert.ok(entry);
  assert.match(entry.reason, /^ESTIMATE:/);
});

test('overflow beyond the reported ports raises a flag instead of dropping devices', () => {
  const { topology, ctx } = build(makePlan(), requirements(), input({ wiredPcs: 500 }));
  assert.ok(ctx.flags.some((flag) => flag.code === 'TOPOLOGY_ATTACHMENT_OVERFLOW'));
  const total = edgesOf(topology, 'access')
    .filter((edge) => edge.target === 'client-wired_pcs')
    .reduce((sum, edge) => sum + edge.count, 0);
  assert.equal(total, 500);
});

test('missing switch port specs raise a flag', () => {
  const cat = catalog.map((row) => (row.sku === 'ACC' ? { ...row, copper_ports: undefined, poe_ports: undefined } : row));
  const { ctx } = build(makePlan(), requirements(), input(), cat);
  assert.ok(ctx.flags.some((flag) => flag.code === 'TOPOLOGY_SWITCH_SPECS_MISSING'));
});

test('Wi-Fi devices without any AP raise a flag and are not drawn', () => {
  const plan = makePlan({ items: makePlan().items.filter((item) => item.category !== 'access_point') });
  const { topology, ctx } = build(plan);
  assert.ok(ctx.flags.some((flag) => flag.code === 'TOPOLOGY_WIFI_DEVICES_WITHOUT_AP'));
  assert.equal(byId(topology, 'client-wifi_devices'), undefined);
});

test('the topology is logical only: no coordinates, and no catalog fields or IDs leak in', () => {
  const { topology } = build();
  const text = JSON.stringify(topology);
  assert.doesNotMatch(text, /"(x|y|position|width|height)"/);
  assert.doesNotMatch(text, /copper_ports|sfp_ports|poe_ports|dual_wan|vlanId|ipAddress/);
});

test('an incomplete plan with the gateway/switch/AP skeleton is drawn and flagged TOPOLOGY_PARTIAL', () => {
  const plan = makePlan({ complete: false, unmet: [{ category: 'controller', vendor: 'V', reason: 'none' }] });
  plan.items = plan.items.filter((item) => item.category !== 'controller');
  const { topology, ctx } = build(plan);
  assert.ok(topology);
  assert.ok(ctx.flags.some((flag) => flag.code === 'TOPOLOGY_PARTIAL'));
  assert.equal(byId(topology, 'controller-CTL-0'), undefined);
});

test('an incomplete plan missing the gateway, a switch or an AP gets no topology', () => {
  const without = (category) =>
    makePlan({ complete: false, items: makePlan().items.filter((item) => item.category !== category) });
  ['gateway', 'switch', 'access_point'].forEach((category) => {
    const { topology, ctx } = build(without(category));
    assert.equal(topology, null, `${category} missing should give null`);
    assert.equal(ctx.flags.length, 0);
  });
});

test('a complete plan without a gateway item throws', () => {
  const plan = makePlan({ items: makePlan().items.filter((item) => item.category !== 'gateway') });
  assert.throws(() => build(plan), /gateway/i);
});

test('a complete plan with a single switch item has no separate access layer', () => {
  const plan = makePlan({
    items: [
      { category: 'gateway', sku: 'GW1', qty: 1 },
      { category: 'switch', sku: 'ACC', qty: 1 },
      { category: 'access_point', sku: 'AP1', qty: 2 },
    ],
  });
  const { topology } = build(plan, requirements(), input({ floors: 1 }));
  const switches = topology.nodes.filter((node) => node.role === 'switch');
  assert.equal(switches.length, 1);
  assert.equal(switches[0].layer, 'core');
  assert.ok(edgesOf(topology, 'poe').some((edge) => edge.source === switches[0].id));
});

test('inputs are not mutated', () => {
  const plan = deepFreeze(makePlan());
  const reqs = deepFreeze(requirements());
  const inp = deepFreeze(input());
  const cat = deepFreeze(JSON.parse(JSON.stringify(catalog)));
  assert.doesNotThrow(() => buildTopology(plan, reqs, inp, createCtx(), cat));
});

test('argument checks', () => {
  assert.throws(() => buildTopology(makePlan(), requirements(), input(), null, catalog));
  assert.throws(() => buildTopology(makePlan(), requirements(), input(), createCtx(), null));
});