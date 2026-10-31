
'use strict';
// Switch selection per floor
// Algorithm Step 3.5
// Consumes: Requirements + PoE budget + select()
// Produces: SelectionResult[] (access switches, core switch)
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

function getPoePortCapabilities(switchSku) {
  const description = `${switchSku?.name ?? ''} ${switchSku?.description ?? ''}`;
  const totalPoePorts = switchSku?.switch_specs?.poe_ports;

  if (!Number.isInteger(totalPoePorts) || totalPoePorts < 0) {
    return { af: 0, at: 0, bt3: 0 };
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
  const specs = switchSku?.switch_specs;

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
  const specs = switchSku?.switch_specs;

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

  const { addFlag } = require('../ctx.js');
  addFlag(
    ctx,
    code,
    'Edge devices stay single-homed; redundant access uplinks do not provide dual-homing for edge devices.'
  );

  return ctx.flags;
}

function selectSwitches({ catalog, vendor, requirements, poeBudget, plan, cePick, ctx }) {
  throw new Error('NWP-ENGINE-012 not implemented');
}

module.exports = {
  selectSwitches,
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
