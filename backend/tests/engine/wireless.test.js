
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  wirelessRequirements
} = require('../../src/types/engine/requirements/wireless.js');

const { createCtx } = require('../../src/types/engine/ctx.js');
const {
  validateRequirements
} = require('../../src/types/engine/contracts.js');

function makeInput(overrides = {}) {
  return {
    contractVersion: 2,
    locations: 'one',
    floors: 1,
    floorArea: [420],
    roomsPerFloor: 8,
    largeRooms: [],
    wiredPcs: 0,
    wifiDevices: 60,
    voipPhones: 0,
    cameras: 0,
    otherDevices: {
      hasOtherDevices: false,
      description: ''
    },
    existingEquipment: 'no',
    existingCabling: 'none',
    internetMbps: 200,
    connection: 'fiber',
    downtime: 'sameDay',
    guestWifi: false,
    sensitiveData: false,
    apps: [],
    housing: 'wall',
    monthlyBudgetBand: 'under15k',
    itSupport: 'outside',
    power: 'stable',
    growth: {
      expected: false,
      band: null,
      newSites: 0
    },
    management: 'dashboard',
    ...overrides
  };
}

test('meets the 420 m² and 60-device Wi-Fi 6 acceptance example', () => {
  const result = wirelessRequirements(makeInput(), createCtx());

  assert.equal(result.standard, '6');
  assert.equal(result.ceiling, 40);

  // Coverage: ceil(420 / 140) = 3 APs.
  assert.equal(result.CE.total, 3);
  assert.deepEqual(result.CE.perFloor, [3]);

  // Capacity: ceil(60 / 40) = 2, so coverage remains the limiting factor.
  assert.equal(result.HP.total, 3);
  assert.deepEqual(result.HP.perFloor, [3]);
});


test('selects Wi-Fi 6E when video conferencing is required', () => {
  const result = wirelessRequirements(
    makeInput({ apps: ['videoConferencing'] }),
    createCtx()
  );
  assert.equal(result.standard, '6E');
  assert.equal(result.ceiling, 55);
});


test('defaults to Wi-Fi 6 when no application requires Wi-Fi 6E', () => {
  const result = wirelessRequirements(
    makeInput({ apps: [] }),
    createCtx()
  );

  assert.equal(result.standard, '6');
  assert.equal(result.ceiling, 40);
});


test('selects Wi-Fi 6E when streaming is required', () => {
  const result = wirelessRequirements(
    makeInput({ apps: ['streaming'] }),
    createCtx()
  );
  assert.equal(result.standard, '6E');
  assert.equal(result.ceiling, 55);
});


test('recalculates exact AP totals when Wi-Fi 6 is explicitly requested', () => {
  const result = wirelessRequirements(
    makeInput({
      floorArea: [420],
      wifiDevices: 120,
      apps: ['videoConferencing'],
      growth: {
        expected: true,
        band: '11-30',
        newSites: 0
      }
    }),
    createCtx(),
    '6'
  );

  assert.equal(result.standard, '6');
  assert.equal(result.ceiling, 40);

  // CE: ceil(120 / 40) = 3; coverage = 3.
  assert.equal(result.CE.total, 3);
  assert.deepEqual(result.CE.perFloor, [3]);

  // HP: ceil(120 * 1.30 / (40 * 0.65)) = 6.
  assert.equal(result.HP.total, 6);
  assert.deepEqual(result.HP.perFloor, [6]);
});

test('recomputes the full result when switching from Wi-Fi 6E to Wi-Fi 6', () => {
  const input = makeInput({
    floorArea: [420],
    wifiDevices: 120,
    apps: ['videoConferencing'],
    growth: {
      expected: true,
      band: '11-30',
      newSites: 0
    }
  });

  const first = wirelessRequirements(input, createCtx());
  const second = wirelessRequirements(input, createCtx(), '6');

  // First call selects Wi-Fi 6E.
  assert.equal(first.standard, '6E');
  assert.equal(first.ceiling, 55);

  // Second call explicitly recalculates using Wi-Fi 6.
  assert.equal(second.standard, '6');
  assert.equal(second.ceiling, 40);
  assert.equal(second.CE.total, 3);
  assert.deepEqual(second.CE.perFloor, [3]);
  assert.equal(second.HP.total, 6);
  assert.deepEqual(second.HP.perFloor, [6]);

  // Confirm the second result has the expected complete structure.
  assert.doesNotThrow(() =>
    validateRequirements({ wireless: second })
  );
});

test('per-floor counts add up to each plan total', () => {
  const result = wirelessRequirements(
    makeInput({
      floors: 2,
      locations: 'twoOrMore',
      floorArea: [280, 280],
      wifiDevices: 120,
      growth: {
        expected: true,
        band: '11-30',
        newSites: 0
      }
    }),
    createCtx()
  );

  assert.equal(
    result.CE.perFloor.reduce((sum, count) => sum + count, 0),
    result.CE.total
  );
  assert.equal(
    result.HP.perFloor.reduce((sum, count) => sum + count, 0),
    result.HP.total

  );
    assert.equal(result.CE.total, 4);
    assert.deepEqual(result.CE.perFloor, [2, 2]);

    assert.equal(result.HP.total, 6);
    assert.deepEqual(result.HP.perFloor, [3, 3]);
});


test('assigns large-room APs to the correct floor and distributes extra APs', () => {
  const result = wirelessRequirements(
    makeInput({
      floors: 2,
      locations: 'twoOrMore',
      floorArea: [140, 140],
      wifiDevices: 120,
      largeRooms: [{ floor: 2, occupancy: 60 }],
      growth: {
        expected: true,
        band: '11-30',
        newSites: 0
      }
    }),
    createCtx()
  );

  // Wi-Fi 6: ceiling = 40.
  // Coverage requires 1 AP per floor.
  // The room is on floor 2 and needs ceil(60 / 40) = 2 dedicated CE APs.
  assert.equal(result.CE.total, 4);
  assert.deepEqual(result.CE.perFloor, [1, 3]);

  // HP room APs: ceil(60 * 1.30 / (40 * 0.65)) = 3.
  // General users: 120 - 60 = 60.
  // HP general capacity: ceil(60 * 1.30 / (40 * 0.65)) = 3.
  // HP base = max(2 coverage APs, 3 capacity APs) = 3.
  // Total HP = 3 base APs + 3 dedicated room APs = 6.
  // One extra AP is distributed to floor 1 by the current algorithm.
  assert.equal(result.HP.total, 6);
  assert.deepEqual(result.HP.perFloor, [2, 4]);

  // Confirm floor counts sum to each plan's total.
  assert.equal(
    result.CE.perFloor.reduce((sum, count) => sum + count, 0),
    result.CE.total
  );
  assert.equal(
    result.HP.perFloor.reduce((sum, count) => sum + count, 0),
    result.HP.total
  );
});


test('returns a valid wireless requirements structure', () => {
  const result = wirelessRequirements(makeInput(), createCtx());

  assert.equal(typeof result.standard, 'string');
  assert.equal(typeof result.ceiling, 'number');

  for (const plan of ['CE', 'HP']) {
    assert.ok(Number.isInteger(result[plan].total));
    assert.ok(result[plan].total >= 0);
    assert.ok(Array.isArray(result[plan].perFloor));
    assert.equal(result[plan].perFloor.length, 1);
  }

  assert.doesNotThrow(() =>
    validateRequirements({ wireless: result })
  );
});


test('matches the large-room example without double-counting room occupants', () => {
  const result = wirelessRequirements(
    makeInput({
      floorArea: [420],
      wifiDevices: 120,
      largeRooms: [{ floor: 1, occupancy: 100 }],
      growth: {
        expected: true,
        band: '11-30',
        newSites: 0
      }
    }),
    createCtx()
  );

  assert.equal(result.standard, '6');
  assert.equal(result.ceiling, 40);

  // Large room: ceil(100 / 40) = 3 CE APs.
  // Remaining general users: 120 - 100 = 20.
  // Coverage/general capacity base: max(3, ceil(20 / 40)) = 3.
  assert.equal(result.CE.total, 6);
  assert.deepEqual(result.CE.perFloor, [6]);

  // Large room HP: ceil(100 * 1.30 / (40 * 0.65)) = 5 APs.
  // General users HP: ceil(20 * 1.30 / (40 * 0.65)) = 1 AP.
  // Coverage/general base remains 3, so total = 3 + 5 = 8.
  assert.equal(result.HP.total, 8);
  assert.deepEqual(result.HP.perFloor, [8]);
});

test('distributes extra capacity APs across floors without changing the total', () => {
  const result = wirelessRequirements(
    makeInput({
      floors: 2,
      locations: 'twoOrMore',
      floorArea: [140, 140],
      wifiDevices: 200,
      growth: {
        expected: false,
        band: null,
        newSites: 0
      }
    }),
    createCtx()
  );

  assert.equal(result.CE.total, 5);
  assert.equal(result.CE.perFloor.reduce((sum, count) => sum + count, 0), 5);
  assert.deepEqual(result.CE.perFloor, [3, 2]);
});

test('uses integer ceiling calculations for High-Performance capacity', () => {
  const result = wirelessRequirements(
    makeInput({
      floorArea: [140],
      wifiDevices: 26,
      growth: {
        expected: true,
        band: '11-30',
        newSites: 0
      }
    }),
    createCtx()
  );

  assert.equal(result.HP.total, 2);
});

test('rounds decimal floor areas up when calculating coverage APs', () => {
  const result = wirelessRequirements(
    makeInput({
      floorArea: [140.5],
      wifiDevices: 0
    }),
    createCtx()
  );

  assert.equal(result.CE.total, 2);
  assert.equal(result.HP.total, 2);
  assert.deepEqual(result.CE.perFloor, [2]);
  assert.deepEqual(result.HP.perFloor, [2]);
});


test('applies the large-room threshold below, at, and above the boundary', () => {
  const calculate = (occupancy) =>
    wirelessRequirements(
      makeInput({
        floorArea: [140],
        wifiDevices: occupancy,
        largeRooms: [{ floor: 1, occupancy }],
      }),
      createCtx()
    );

  const below = calculate(19);
  const at = calculate(20);
  const above = calculate(21);

  assert.equal(below.CE.total, 1);
  assert.equal(at.CE.total, 1);
  assert.equal(above.CE.total, 2);

  assert.equal(below.HP.total, 1);
  assert.equal(at.HP.total, 1);
  assert.equal(above.HP.total, 2);
});


test('applies each growth band to High-Performance capacity', () => {
  const calculate = (growth) =>
    wirelessRequirements(
      makeInput({
        floorArea: [140],
        wifiDevices: 70,
        growth,
      }),
      createCtx()
    );

  const noGrowth = calculate({
    expected: false,
    band: null,
    newSites: 0,
  });

  const lowGrowth = calculate({
    expected: true,
    band: '0-10',
    newSites: 0,
  });

  const mediumGrowth = calculate({
    expected: true,
    band: '11-30',
    newSites: 0,
  });

  const highGrowth = calculate({
    expected: true,
    band: '31+',
    newSites: 0,
  });

  assert.equal(noGrowth.HP.total, 3);
  assert.equal(lowGrowth.HP.total, 4);
  assert.equal(mediumGrowth.HP.total, 4);
  assert.equal(highGrowth.HP.total, 5);
});

test('rounds HP capacity correctly at the 65% utilization boundary', () => {
  const calculate = (wifiDevices) =>
    wirelessRequirements(
      makeInput({
        floorArea: [140],
        wifiDevices,
        growth: {
          expected: false,
          band: null,
          newSites: 0,
        },
      }),
      createCtx()
    );

  assert.equal(calculate(26).HP.total, 1);
  assert.equal(calculate(27).HP.total, 2);
});


test('distributes APs correctly across three floors', () => {
  const result = wirelessRequirements(
    makeInput({
      floors: 3,
      locations: 'twoOrMore',
      floorArea: [140, 140, 140],
      wifiDevices: 200,
      growth: {
        expected: false,
        band: null,
        newSites: 0,
      },
    }),
    createCtx()
  );

  assert.equal(result.CE.total, 5);
  assert.deepEqual(result.CE.perFloor, [2, 2, 1]);

  assert.equal(result.HP.total, 8);
  assert.deepEqual(result.HP.perFloor, [3, 3, 2]);

  assert.equal(
    result.CE.perFloor.reduce((sum, count) => sum + count, 0),
    result.CE.total
  );

  assert.equal(
    result.HP.perFloor.reduce((sum, count) => sum + count, 0),
    result.HP.total
  );
});


test('does not add an extra AP when capacity divides exactly', () => {
  const result = wirelessRequirements(
    makeInput({
      floorArea: [140],
      wifiDevices: 80,
      growth: {
        expected: false,
        band: null,
        newSites: 0,
      },
    }),
    createCtx()
  );

  assert.equal(result.CE.total, 2);
  assert.equal(result.HP.total, 4);
});


test('does not add an extra HP AP when capacity divides to exactly 5.0', () => {
  const result = wirelessRequirements(
    makeInput({
      floorArea: [140],
      wifiDevices: 100,
      growth: {
        expected: true,
        band: '11-30',
        newSites: 0
      }
    }),
    createCtx()
  );

  // 100 * 1.30 / (40 * 0.65) = 5 exactly.
  assert.equal(result.HP.total, 5);
  assert.deepEqual(result.HP.perFloor, [5]);
});
