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
    otherDevices: {
      hasOtherDevices: false,
      description: '',
    },
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


test('Q4 = 2 floors derives fiber backbone and supported copper horizontal cabling', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      floors: 2,
      floorArea: [100, 100],
    }),
    ctx,
  );

  assert.strictEqual(result.backbone, 'fiber');

  assert.deepStrictEqual(result.horizontalCablingOptions, [
    'Cat5e',
    'Cat6',
    'Cat6a',
  ]);
});

test('wired devices produce the correct edge port count', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      wiredPcs: 20,
      voipPhones: 5,
      cameras: 4,
    }),
    ctx,
  );

  assert.strictEqual(result.edgePorts, 29);
});

test('PoE devices produce the correct PoE port count', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      wiredPcs: 20,
      voipPhones: 5,
      cameras: 4,
    }),
    ctx,
  );

  assert.strictEqual(result.poeEdgePorts, 9);
});

test('PoE devices produce the correct PoE load', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      wiredPcs: 20,
      voipPhones: 5,
      cameras: 4,
    }),
    ctx,
  );

  assert.strictEqual(result.otherPoeLoadW, 138.6);
});

test('existing equipment adds an advisory while keeping the BOM greenfield', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      existingEquipment: 'yes',
    }),
    ctx,
  );

  assert.strictEqual(result.flags.length, 1);
  assert.strictEqual(result.flags[0].code, 'existing-equipment-advisory');
});

test('free-text Q17 devices are not sized', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      wiredPcs: 20,
      voipPhones: 5,
      cameras: 4,
      otherDevices: {
        hasOtherDevices: true,
        description: '2 door controllers and 1 printer',
      },
    }),
    ctx,
  );

  assert.strictEqual(result.edgePorts, 29);
  assert.strictEqual(result.poeEdgePorts, 9);
  assert.strictEqual(result.otherPoeLoadW, 138.6);
});

test('Q13 = 20, Q15 = 5, Q16 = 4, and free-text Q17 devices produce the expected edge ports', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      wiredPcs: 20,
      voipPhones: 5,
      cameras: 4,
      otherDevices: {
        hasOtherDevices: true,
        description: '2 door controllers and 1 printer',
      },
    }),
    ctx,
  );

  assert.strictEqual(result.edgePorts, 29);
});

test('Q17 free-text devices add a not-sized advisory', () => {
  const ctx = createCtx();

  const result = deriveDeviceRequirements(
    makeInput({
      otherDevices: {
        hasOtherDevices: true,
        description: '2 door controllers and 1 printer',
      },
    }),
    ctx,
  );

  const advisory = result.flags.find(
    (flag) => flag.code === 'other-devices-not-sized',
  );

  assert.ok(advisory);
  assert.match(
    advisory.message,
    /other devices reported but not sized/i,
  );
});
