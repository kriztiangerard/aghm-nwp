'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculatePerFloorPorts,
  applyGrowthMultiplier
} = require('../../src/types/engine/devices/switches.js');

test('adds each floor AP count to evenly distributed edge and PoE ports', () => {
  const result = calculatePerFloorPorts({
    edgePorts: 10,
    poeEdgePorts: 4,
    apCountsPerFloor: [2, 1, 3]
  });

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 6, requiredPoePorts: 4 },
    { floor: 2, requiredPorts: 4, requiredPoePorts: 2 },
    { floor: 3, requiredPorts: 6, requiredPoePorts: 4 }
  ]);
});

test('distributes remainders to earlier floors', () => {
  const result = calculatePerFloorPorts({
    edgePorts: 10,
    poeEdgePorts: 4,
    apCountsPerFloor: [0, 0, 0]
  });

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 4, requiredPoePorts: 2 },
    { floor: 2, requiredPorts: 3, requiredPoePorts: 1 },
    { floor: 3, requiredPorts: 3, requiredPoePorts: 1 }
  ]);
});

test('supports a single floor', () => {
  const result = calculatePerFloorPorts({
    edgePorts: 8,
    poeEdgePorts: 3,
    apCountsPerFloor: [2]
  });

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 10, requiredPoePorts: 5 }
  ]);
});

test('rejects PoE edge ports greater than total edge ports', () => {
  assert.throws(
    () => calculatePerFloorPorts({
      edgePorts: 3,
      poeEdgePorts: 4,
      apCountsPerFloor: [1, 1]
    }),
    /poeEdgePorts cannot exceed edgePorts/
  );
});

test('rejects invalid AP counts', () => {
  assert.throws(
    () => calculatePerFloorPorts({
      edgePorts: 4,
      poeEdgePorts: 2,
      apCountsPerFloor: [2, -1]
    }),
    /apCountsPerFloor must contain non-negative integer counts/
  );
});

test('applies 30 percent growth and rounds up', () => {
  const result = applyGrowthMultiplier([
    { floor: 1, requiredPorts: 11, requiredPoePorts: 3 }
  ], 30);

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 15, requiredPoePorts: 4 }
  ]);
});

test('applies growth independently to each floor', () => {
  const result = applyGrowthMultiplier([
    { floor: 1, requiredPorts: 10, requiredPoePorts: 2 },
    { floor: 2, requiredPorts: 11, requiredPoePorts: 3 }
  ], 30);

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 13, requiredPoePorts: 3 },
    { floor: 2, requiredPorts: 15, requiredPoePorts: 4 }
  ]);
});

test('leaves requirements unchanged when growth is zero', () => {
  const result = applyGrowthMultiplier([
    { floor: 1, requiredPorts: 11, requiredPoePorts: 3 }
  ], 0);

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 11, requiredPoePorts: 3 }
  ]);
});

test('rejects invalid growth percentages', () => {
  assert.throws(
    () => applyGrowthMultiplier([
      { floor: 1, requiredPorts: 10, requiredPoePorts: 2 }
    ], 30.5),
    /growthPercent must be an integer from 0 to 100/
  );
});