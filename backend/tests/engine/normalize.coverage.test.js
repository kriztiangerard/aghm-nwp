'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { normalize } = require('../../src/types/engine/normalize');
const params = require('../../src/types/engine/params');
const { createCtx } = require('../../src/types/engine/ctx');

const baseline = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      '../fixtures/raw-answers/input1-baseline.json',
    ),
    'utf8',
  ),
);

function runNormalize(overrides = {}) {
  const ctx = createCtx();
  const raw = { ...baseline, ...overrides };

  const output = normalize(raw, ctx);

  return { output, ctx };
}

test('Q16 No results in zero cameras', () => {
  const { output } = runNormalize({ Q16: 'No' });

  assert.equal(output.cameras, 0);
});

test('Q17 No results in an empty other-device description', () => {
  const { output } = runNormalize({ Q17: 'No' });

  assert.deepEqual(output.otherDevices, {
    hasOtherDevices: false,
    description: '',
  });
});

test('Blank Q8 defaults to no large rooms and records the assumption', () => {
  const { output, ctx } = runNormalize({
    Q7: 'No',
    Q8: '',
  });

  assert.deepEqual(output.largeRooms, []);
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'largeRooms' &&
        entry.reason ===
          'Large-room details not provided; assumed no large rooms',
    ),
  );
});

test('Q10 blank does not invent an internet speed and adds a flag', () => {
  const { output, ctx } = runNormalize({ Q10: null });

  assert.equal(output.internetMbps, null);
  assert.ok(
    ctx.flags.some(
      (flag) => flag.code === 'Q10_FALLBACK_UNDEFINED',
    ),
  );
});

test('Floor area fallback creates one area value per floor', () => {
  const { output, ctx } = runNormalize({
    Q4: 2,
    Q5: '',
    Q6: 8,
  });

  assert.deepEqual(output.floorArea, [
    8 * params.M2_PER_ROOM_FALLBACK,
    8 * params.M2_PER_ROOM_FALLBACK,
  ]);

  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'floorArea' &&
        entry.valueUsed === 8 * params.M2_PER_ROOM_FALLBACK &&
        entry.reason === 'Floor area estimated from room count',
    ),
  );
});

test('Blank Q9 defaults to notSure and records the assumption', () => {
  const { output, ctx } = runNormalize({ Q9: '' });

  assert.equal(output.existingEquipment, 'notSure');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'existingEquipment' &&
        entry.valueUsed === 'notSure' &&
        entry.reason ===
          'Existing network equipment status not answered; treated as Not sure',
    ),
  );
});

test('Q7 Yes with no Q8 entries is rejected', () => {
  assert.throws(
    () => runNormalize({ Q7: 'Yes', Q8: [] }),
    /Q7 is Yes, so Q8 must contain at least one large-room entry/,
  );
});

test('Q7 No with Q8 entries is rejected', () => {
  assert.throws(
    () =>
      runNormalize({
        Q7: 'No',
        Q8: [{ floor: 1, occupancy: 30 }],
      }),
    /Q7 is No, so Q8 must not contain any large-room entries/,
  );
});