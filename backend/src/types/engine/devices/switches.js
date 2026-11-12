
'use strict';

const { selectSku } = require('../select.js');
const { addFlag } = require('../ctx.js');
// Switch selection per floor
// Algorithm Step 3.5
// Consumes: Requirements + PoE budget + select()
// Produces: SelectionResult (access switches and, when needed, a core switch)
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

function splitEvenly(total, floorCount) {
  const base = Math.floor(total / floorCount);
  const remainder = total % floorCount;

  return Array.from(
    { length: floorCount },
    (_, index) => base + (index < remainder ? 1 : 0)
  );
}

function calculatePerFloorPorts({ edgePorts, poeEdgePorts, apCountsPerFloor }) {
  if (!Number.isInteger(edgePorts) || edgePorts < 0) {
    throw new Error('edgePorts must be a non-negative integer.');
  }

  if (!Number.isInteger(poeEdgePorts) || poeEdgePorts < 0) {
    throw new Error('poeEdgePorts must be a non-negative integer.');
  }

  if (poeEdgePorts > edgePorts) {
    throw new Error('poeEdgePorts cannot exceed edgePorts.');
  }

  if (
    !Array.isArray(apCountsPerFloor) ||
    apCountsPerFloor.length === 0 ||
    !apCountsPerFloor.every(
      count => Number.isInteger(count) && count >= 0
    )
  ) {
    throw new Error('apCountsPerFloor must contain non-negative integer counts.');
  }

  const edgePortsByFloor = splitEvenly(edgePorts, apCountsPerFloor.length);
  const poePortsByFloor = splitEvenly(poeEdgePorts, apCountsPerFloor.length);

  return apCountsPerFloor.map((apCount, index) => ({
    floor: index + 1,
    requiredPorts: edgePortsByFloor[index] + apCount,
    requiredPoePorts: poePortsByFloor[index] + apCount
  }));
}

function applyGrowthMultiplier(perFloorRequirements, growthPercent) {
  if (
    !Array.isArray(perFloorRequirements) ||
    perFloorRequirements.length === 0
  ) {
    throw new Error('perFloorRequirements must be a non-empty array.');
  }

  if (
    !Number.isInteger(growthPercent) ||
    growthPercent < 0 ||
    growthPercent > 100
  ) {
    throw new Error('growthPercent must be an integer from 0 to 100.');
  }

  const numerator = 100 + growthPercent;
  const roundUp = value =>
    Math.floor((value * numerator + 99) / 100);

  return perFloorRequirements.map(floor => {
    if (
      !Number.isInteger(floor.requiredPorts) ||
      floor.requiredPorts < 0 ||
      !Number.isInteger(floor.requiredPoePorts) ||
      floor.requiredPoePorts < 0
    ) {
      throw new Error('Floor port requirements must be non-negative integers.');
    }

    return {
      ...floor,
      requiredPorts: roundUp(floor.requiredPorts),
      requiredPoePorts: roundUp(floor.requiredPoePorts)
    };
  });
}

function calculateCoreSwitchQuantity({ redundancyRequired = false } = {}) {
  if (typeof redundancyRequired !== 'boolean') {
    throw new Error('redundancyRequired must be a boolean.');
  }

  return redundancyRequired ? 2 : 1;
}

function calculateAccessSwitchUplinks({ floorCount, redundancyRequired = false }) {
  if (!Number.isInteger(floorCount) || floorCount < 1) {
    throw new Error('floorCount must be a positive integer.');
  }

  if (typeof redundancyRequired !== 'boolean') {
    throw new Error('redundancyRequired must be a boolean.');
  }

  // A single-floor site does not require inter-floor access uplinks.
  if (floorCount === 1) return 0;

  return redundancyRequired ? 2 : 1;
}

function getSwitchSpecs(switchSku) {
  if (!switchSku || typeof switchSku !== 'object') {
    return null;
  }

  const specs = switchSku.switch_specs ?? switchSku;

  return {
    ...specs,
    port_count:
      specs.port_count ??
      (
        Number.isInteger(specs.copper_ports) &&
        Number.isInteger(specs.sfp_ports)
          ? specs.copper_ports + specs.sfp_ports
          : undefined
      ),
  };
}

function getPoePortCapabilities(switchSku) {
  const description = `${switchSku?.name ?? ''} ${switchSku?.description ?? ''}`;
  const specs = getSwitchSpecs(switchSku);
  const totalPoePorts = specs?.poe_ports;

  if (!Number.isInteger(totalPoePorts) || totalPoePorts < 0) {
    return { af: 0, at: 0, bt3: 0 };
  }

  if (specs.poe_standard !== undefined) {
    if (!['af', 'at', 'bt3'].includes(specs.poe_standard)) {
      return { af: 0, at: 0, bt3: 0 };
    }

    return {
      af: totalPoePorts,
      at: specs.poe_standard === 'af' ? 0 : totalPoePorts,
      bt3: specs.poe_standard === 'bt3' ? totalPoePorts : 0
    };
  }

  const mixedMatch = description.match(
    /(\d+)\s*-?\s*Port\s+PoE\+\s*&\s*(\d+)\s*-?\s*Port\s+PoE\+\+/i
  );

  if (mixedMatch) {
    const poePlusPorts = Number(mixedMatch[1]);
    const poePlusPlusPorts = Number(mixedMatch[2]);

    if (poePlusPorts + poePlusPlusPorts !== totalPoePorts) {
      return { af: 0, at: 0, bt3: 0 };
    }

    return {
      af: totalPoePorts,
      at: totalPoePorts,
      bt3: poePlusPlusPorts
    };
  }

  if (/PoE\+\+/i.test(description)) {
    return { af: totalPoePorts, at: totalPoePorts, bt3: totalPoePorts };
  }

  if (/PoE\+/i.test(description)) {
    return { af: totalPoePorts, at: totalPoePorts, bt3: 0 };
  }

  return { af: 0, at: 0, bt3: 0 };
}

function getSupportedPoeStandards(switchSku) {
  const capabilities = getPoePortCapabilities(switchSku);
  return new Set(
    Object.entries(capabilities)
      .filter(([, count]) => count > 0)
      .map(([standard]) => standard)
  );
}

function supportsPoeRequirement(switchSku, requiredStandard) {
  return getSupportedPoeStandards(switchSku).has(requiredStandard);
}

function switchMeetsRequirements({
  switchSku,
  requiredPorts,
  requiredPoePorts,
  requiredPoeBudgetW,
  requiredPoeStandard = 'af',
  requiredUplinks = 0
}) {
  const specs = getSwitchSpecs(switchSku);

  if (!specs) return false;

  const numericRequirements = [
    [requiredPorts, 'requiredPorts'],
    [requiredPoePorts, 'requiredPoePorts'],
    [requiredPoeBudgetW, 'requiredPoeBudgetW'],
    [requiredUplinks, 'requiredUplinks']
  ];

  for (const [value, name] of numericRequirements) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${name} must be a non-negative number.`);
    }
  }

  if (
    !Number.isInteger(specs.port_count) ||
    !Number.isInteger(specs.poe_ports) ||
    !Number.isFinite(specs.poe_budget_w)
  ) {
    return false;
  }

  if (specs.port_count < requiredPorts + requiredUplinks) {
    return false;
  }

  if (specs.poe_ports < requiredPoePorts) {
    return false;
  }

  if (specs.poe_budget_w < requiredPoeBudgetW) {
    return false;
  }

  const capabilities = getPoePortCapabilities(switchSku);
  if (!['af', 'at', 'bt3'].includes(requiredPoeStandard)) {
    throw new Error('requiredPoeStandard must be af, at, or bt3.');
  }

  if (capabilities[requiredPoeStandard] < requiredPoePorts) {
    return false;
  }

  if (
    !Number.isInteger(specs.sfp_ports) ||
    specs.sfp_ports < requiredUplinks
  ) {
    return requiredUplinks === 0;
  }

  return true;
}

function getMinimumIdenticalSwitchQuantity({
  switchSku,
  requiredPorts,
  requiredPoePorts,
  requiredPoeBudgetW,
  requiredPoeStandard = 'af',
  requiredUplinks = 0
}) {
  const specs = getSwitchSpecs(switchSku);

  if (
    !Number.isInteger(requiredPorts) || requiredPorts < 0 ||
    !Number.isInteger(requiredPoePorts) || requiredPoePorts < 0 ||
    !Number.isFinite(requiredPoeBudgetW) || requiredPoeBudgetW < 0 ||
    !Number.isInteger(requiredUplinks) || requiredUplinks < 0
  ) {
    throw new Error('Switch requirements must be non-negative numbers, with integer port counts.');
  }

  if (!['af', 'at', 'bt3'].includes(requiredPoeStandard)) {
    throw new Error('requiredPoeStandard must be af, at, or bt3.');
  }

  if (
    !specs ||
    !Number.isInteger(specs.port_count) ||
    specs.port_count <= 0 ||
    !Number.isInteger(specs.poe_ports) ||
    specs.poe_ports < 0 ||
    !Number.isFinite(specs.poe_budget_w) ||
    specs.poe_budget_w < 0
  ) {
    return null;
  }

  if (
    requiredUplinks > 0 &&
    (!Number.isInteger(specs.sfp_ports) || specs.sfp_ports < requiredUplinks)
  ) {
    return null;
  }

  const usablePorts = specs.port_count - requiredUplinks;
  const capabilities = getPoePortCapabilities(switchSku);
  const capablePoePorts = capabilities[requiredPoeStandard];

  if (usablePorts <= 0) return null;
  if (requiredPoePorts > 0 && capablePoePorts <= 0) return null;

  const quantities = [
    Math.ceil(requiredPorts / usablePorts),
    requiredPoePorts === 0 ? 1 : Math.ceil(requiredPoePorts / capablePoePorts),
    requiredPoeBudgetW === 0 ? 1 : Math.ceil(requiredPoeBudgetW / specs.poe_budget_w)
  ];

  return Math.max(1, ...quantities);
}

function addSingleHomingLimitation(ctx) {
  if (!ctx || !Array.isArray(ctx.flags)) {
    throw new Error('ctx.flags must be an array.');
  }

  const code = 'EDGE_DEVICES_SINGLE_HOMED';

  if (ctx.flags.some(flag => flag.code === code)) {
    return ctx.flags;
  }

  addFlag(
    ctx,
    code,
    'Edge devices stay single-homed; redundant access uplinks do not provide dual-homing for edge devices.'
  );

  return ctx.flags;
}

function selectCoreSwitch({
  catalog,
  vendor,
  requirements,
  plan,
  cePick,
  ctx,
  accessSwitches,
  uplinksPerSwitch,
  coreSwitchQuantity,
}) {
  if (uplinksPerSwitch === 0) {
    return { ok: true, coreSwitch: null };
  }

  if (!Array.isArray(catalog) || !Array.isArray(accessSwitches)) {
    throw new TypeError('catalog and accessSwitches must be arrays.');
  }
  if (!requirements || !['fiber', 'copper', undefined].includes(requirements.backbone)) {
    throw new TypeError('requirements.backbone must be fiber or copper when provided.');
  }
  if (!['CE', 'HP'].includes(plan)) {
    throw new TypeError('plan must be CE or HP.');
  }
  if (!ctx || !Array.isArray(ctx.unmet) || !Array.isArray(ctx.flags)) {
    throw new TypeError('ctx from createCtx() is required.');
  }
  if (!Number.isInteger(uplinksPerSwitch) || uplinksPerSwitch < 1) {
    throw new TypeError('uplinksPerSwitch must be a positive integer when a core is required.');
  }
  if (!Number.isInteger(coreSwitchQuantity) || coreSwitchQuantity < 1) {
    throw new TypeError('coreSwitchQuantity must be a positive integer.');
  }

  const totalAccessSwitchUnits = accessSwitches.reduce(
    (total, accessSwitch) => total + accessSwitch.qty,
    0,
  );
  const requiredAccessPorts = Math.ceil(
    totalAccessSwitchUnits * uplinksPerSwitch / coreSwitchQuantity,
  );
  const fiberBackbone = requirements.backbone === 'fiber';
  const backbone = fiberBackbone ? 'fiber' : 'copper';
  const pool = catalog.filter(
    (sku) => sku.category === 'switch' && sku.vendor === vendor,
  ).map((sku) => ({
    ...sku,
    status: String(sku.status ?? sku.lifecycle_status ?? '').toUpperCase(),
  }));
  const getCorePortCounts = (switchSku) => {
    const specs = getSwitchSpecs(switchSku);
    const copperPorts = specs?.copper_ports === undefined &&
      Number.isInteger(specs?.port_count) &&
      Number.isInteger(specs?.sfp_ports)
      ? specs.port_count - specs.sfp_ports
      : specs?.copper_ports;
    const sfpPorts = specs?.sfp_ports;

    if (
      !Number.isInteger(copperPorts) || copperPorts < 0 ||
      !Number.isInteger(sfpPorts) || sfpPorts < 0
    ) {
      return null;
    }

    return { copperPorts, sfpPorts };
  };
  const meetsCorePortRequirements = (switchSku) => {
    const ports = getCorePortCounts(switchSku);
    if (!ports) return false;

    return ports.copperPorts + ports.sfpPorts >= requiredAccessPorts + 1 &&
      (!fiberBackbone || ports.sfpPorts >= requiredAccessPorts);
  };
  const hasKnownSufficientCore = pool.some(
    (switchSku) =>
      ['ACTIVE', 'SUNSETTING'].includes(switchSku.status) &&
      typeof switchSku.price === 'number' &&
      Number.isFinite(switchSku.price) &&
      meetsCorePortRequirements(switchSku),
  );
  const hasUnknownCorePorts =
    !hasKnownSufficientCore &&
    pool.some(
      (switchSku) =>
        ['ACTIVE', 'SUNSETTING'].includes(switchSku.status) &&
        typeof switchSku.price === 'number' &&
        Number.isFinite(switchSku.price) &&
        getCorePortCounts(switchSku) === null,
    );

  if (hasUnknownCorePorts) {
    addFlag(
      ctx,
      'CORE_SWITCH_PORTS_UNKNOWN',
      `Some ${vendor} switches have unknown copper_ports or sfp_ports; unknown port capacity is not assumed to satisfy the core-switch requirement.`,
    );
  }

  const coreCePick =
    cePick?.coreSwitch?.sku ??
    cePick?.coreSwitch ??
    cePick?.sku ??
    cePick;

  const result = selectSku({
    pool,
    predicate: meetsCorePortRequirements,
    plan: plan === 'CE' ? 'cost_efficient' : 'high_performance',
    category: 'switch',
    vendor,
    ctx: { ...ctx, unmet: [] },
    qty: coreSwitchQuantity,
    cePick: plan === 'HP' ? coreCePick : undefined,
  });

  if (!result.ok) {
    const reason =
      `No purchasable ${vendor} core switch meets the ${backbone} backbone ` +
      `port requirements (${requiredAccessPorts} access uplinks per core switch and one gateway link).`;
    const unmet = { category: 'switch', vendor, reason };
    ctx.unmet.push(unmet);
    return { ok: false, unmet };
  }

  if (result.sku.vendor !== vendor) {
    throw new Error(
      `Core switch vendor consistency defect: expected ${vendor}, got ${result.sku.vendor}.`,
    );
  }

  return {
    ok: true,
    coreSwitch: {
      sku: result.sku,
      qty: coreSwitchQuantity,
      flags: result.flags ?? [],
    },
  };
}

function selectSwitches({
  catalog,
  vendor,
  requirements,
  poeBudget,
  apSelection,
  plan,
  cePick,
  ctx,
}) {
  if (!Array.isArray(catalog)) {
    throw new TypeError('catalog must be an array.');
  }

  if (!requirements || !requirements.wireless) {
    throw new TypeError('requirements.wireless is required.');
  }

  if (plan !== 'CE' && plan !== 'HP') {
    throw new TypeError('plan must be CE or HP.');
  }

  if (!ctx || !Array.isArray(ctx.unmet) || !Array.isArray(ctx.flags)) {
    throw new TypeError('ctx from createCtx() is required.');
  }

  if (!poeBudget || !Array.isArray(poeBudget.perFloor)) {
    throw new TypeError('poeBudget.perFloor is required.');
  }

  const planKey = plan === 'CE' ? 'cost_efficient' : 'high_performance';
  const wirelessPlan = requirements.wireless[plan];
  const apCountsPerFloor = wirelessPlan?.perFloor;

  if (!Array.isArray(apCountsPerFloor) || apCountsPerFloor.length === 0) {
    throw new TypeError(`requirements.wireless.${plan}.perFloor is required.`);
  }

  if (poeBudget.perFloor.length !== apCountsPerFloor.length) {
    throw new Error('PoE budget floor count must match wireless requirements.');
  }

  const floorCount = apCountsPerFloor.length;
  const redundancyRequired =
    String(requirements.redundancy ?? '').toLowerCase() === 'required';

  const accessUplinks = calculateAccessSwitchUplinks({
    floorCount,
    redundancyRequired,
  });

  const coreSwitchQuantity = calculateCoreSwitchQuantity({
    redundancyRequired,
  });

  const baseFloorRequirements = calculatePerFloorPorts({
    edgePorts: requirements.edgePorts ?? 0,
    poeEdgePorts: requirements.poeEdgePorts ?? 0,
    apCountsPerFloor,
  });

  const floorRequirements = plan === 'HP'
    ? applyGrowthMultiplier(
        baseFloorRequirements,
        Math.round((requirements.g ?? 0) * 100)
      )
    : baseFloorRequirements;

  const apSku = apSelection?.ok === true ? apSelection.sku : null;
  const apSpecs = apSku?.ap_specs ?? apSku?.access_point_specs ?? apSku;
  const requiredPoeStandard =
    apSpecs?.poe_standard ?? apSku?.poe_standard;

  if (
    apCountsPerFloor.some(count => count > 0) &&
    !['af', 'at', 'bt3'].includes(requiredPoeStandard)
  ) {
    throw new TypeError(
      'Selected AP must provide a valid poe_standard (af, at, or bt3).'
    );
  }

  const switchPool = catalog
    .filter(sku =>
      sku.category === 'switch' &&
      sku.vendor === vendor
    )
    .map(sku => ({
      ...sku,
      status: String(
        sku.status ?? sku.lifecycle_status ?? ''
      ).toUpperCase(),
    }));

  const accessSwitches = [];

  for (let index = 0; index < floorCount; index += 1) {
    const floor = floorRequirements[index];
    const budget = poeBudget.perFloor[index];

    if (!budget || !Number.isFinite(budget.budgetW)) {
      throw new TypeError(`Missing valid PoE budget for floor ${index + 1}.`);
    }

    const floorPoeStandard =
      apCountsPerFloor[index] > 0
        ? requiredPoeStandard
        : 'af';

    const predicate = switchSku =>
      getMinimumIdenticalSwitchQuantity({
        switchSku,
        requiredPorts: floor.requiredPorts,
        requiredPoePorts: floor.requiredPoePorts,
        requiredPoeBudgetW: budget.budgetW,
        requiredPoeStandard: floorPoeStandard,
        requiredUplinks: accessUplinks,
      }) !== null;

    const ceFloorPick =
      cePick?.accessSwitches?.[index]?.sku ??
      cePick?.[index]?.sku ??
      cePick?.sku ??
      cePick;

    const result = selectSku({
      pool: switchPool,
      predicate,
      plan: planKey,
      category: 'switch',
      vendor,
      ctx,
      qty: 1,
      cePick: plan === 'HP' ? ceFloorPick : undefined,
    });

    if (!result.ok) {
      return result;
    }

    const quantity = getMinimumIdenticalSwitchQuantity({
      switchSku: result.sku,
      requiredPorts: floor.requiredPorts,
      requiredPoePorts: floor.requiredPoePorts,
      requiredPoeBudgetW: budget.budgetW,
      requiredPoeStandard: floorPoeStandard,
      requiredUplinks: accessUplinks,
    });

    accessSwitches.push({
      floor: floor.floor,
      sku: result.sku,
      qty: quantity,
      uplinksPerSwitch: accessUplinks,
      flags: result.flags ?? [],
    });
  }

  if (redundancyRequired) {
    addSingleHomingLimitation(ctx);
  }

  const coreResult = selectCoreSwitch({
    catalog,
    vendor,
    requirements,
    plan,
    cePick,
    ctx,
    accessSwitches,
    uplinksPerSwitch: accessUplinks,
    coreSwitchQuantity,
  });

  if (!coreResult.ok) {
    return coreResult;
  }

  return {
    ok: true,
    accessSwitches,
    coreSwitch: coreResult.coreSwitch,
    coreSwitchQuantity,
    uplinksPerFloor: accessUplinks,
    flags: ctx.flags,
  };
}

module.exports = {
  selectSwitches,
  selectCoreSwitch,
  calculatePerFloorPorts,
  applyGrowthMultiplier,
  getPoePortCapabilities,
  getSupportedPoeStandards,
  supportsPoeRequirement,
  switchMeetsRequirements,
  getMinimumIdenticalSwitchQuantity,
  calculateAccessSwitchUplinks,
  calculateCoreSwitchQuantity,
  addSingleHomingLimitation,
};
