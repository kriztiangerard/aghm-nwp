'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { deriveDeviceRequirements } =
  require('../../src/types/engine/requirements/devices.js');

const { createCtx } =
  require('../../src/types/engine/ctx.js');

function makeInput(overrides = {}) {
  return {
    contractVersion: 1,
    locations: 'one',
    floors: 1,
    floorArea: [100],
    roomsPerFloor: 4,
    largeRooms: [],
    wiredPcs: 0,
    wifiDevices: 0,
    voipPhones: 0,
    cameras: 0,
    otherDevices: [],
    existingEquipment: 'no',
    existingCabling: 'none',
    internetMbps: null,
    connection: 'notChecked',
    downtime: 'waitItOut',
    guestWifi: false,
    sensitiveData: false,
    apps: [],
    housing: 'closet',
    monthlyBudgetBand: 'under15k',
    itSupport: 'none',
    power: 'stable',
    growth: {
      expected: false,
      band: null,
      newSites: 0,
    },
    management: 'dashboard',
    ...overrides,
  };
}

test('Q4 = 2 floors derives fiber backbone', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      floors: 2,
      floorArea: [100, 100],
    }),
    ctx,
  );

  assert.strictEqual(result.backbone, 'fiber');
});

test('wired devices and other devices produce the correct edge port count', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      wiredPcs: 20,
      voipPhones: 5,
      cameras: 4,
      otherDevices: [
        { cls: 'door_controller', count: 2, poe: true },
        { cls: 'network_printer', count: 1, poe: false },
      ],
    }),
    ctx,
  );

  assert.strictEqual(result.edgePorts, 32);
});

test('PoE devices produce the correct PoE port count and load', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      wiredPcs: 20,
      voipPhones: 5,
      cameras: 4,
      otherDevices: [
        { cls: 'door_controller', count: 2, poe: true },
        { cls: 'network_printer', count: 1, poe: false },
      ],
    }),
    ctx,
  );

  assert.strictEqual(result.poeEdgePorts, 11);
  assert.strictEqual(result.otherPoeLoadW, 169.4);
});