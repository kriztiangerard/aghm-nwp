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
      requiredPorts: Math.ceil((floor.requiredPorts * numerator) / 100),
      requiredPoePorts: Math.ceil((floor.requiredPoePorts * numerator) / 100)
    };
  });
}

function selectSwitches({ catalog, vendor, requirements, poeBudget, plan, cePick, ctx }) {
  throw new Error('NWP-ENGINE-012 not implemented');
}

module.exports = {
  selectSwitches,
  calculatePerFloorPorts,
  applyGrowthMultiplier
};
