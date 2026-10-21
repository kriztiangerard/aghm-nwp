// backend/tests/engine/normalize.test.js  (NWP-ENGINE-002)
const test = require('node:test');
const assert = require('node:assert');
const { normalize } = require('../../src/types/engine/normalize');
const { createCtx } = require('../../src/types/engine/ctx');
const { validateNormalizedInput } = require('../../src/types/engine/contracts');
const baseline = require('../fixtures/raw-answers/input1-baseline.json');
const sparse = require('../fixtures/raw-answers/input2-sparse-notsure.json');

const run = (overrides = {}, base = baseline) => {
  const ctx = createCtx();
  const out = normalize({ ...base, ...overrides }, ctx);
  return { out, ledger: JSON.stringify(ctx.ledger) };
};

test('fixtures normalize and pass validateNormalizedInput', () => {
  assert.ok(validateNormalizedInput(run().out));
  assert.ok(validateNormalizedInput(run({}, sparse).out));
});

test('headcount 201 is rejected as outside SME scope', () => {
  assert.throws(() => run({ Q3: 201 }), /outside SME scope/);
});

test('Q25 = No nulls Q25a/Q25b and growth is off', () => {
  const { out } = run({ Q25: 'No', Q25a: '31+', Q25b: 2 });
  assert.strictEqual(out.growth.expected, false);
  assert.strictEqual(out.growth.band, null);
  assert.strictEqual(out.growth.newSites, 0);
});

test('Q15 = No gives 0 VoIP phones', () => {
  assert.strictEqual(run({ Q15: 'No' }).out.voipPhones, 0);
});

test('Q20 "None of the above" with another box is rejected', () => {
  assert.throws(() => run({ Q20: ['None of the above', 'Video conferencing'] }));
});

test('blank Q5 with 8 rooms gives 140 m2 and a ledger line', () => {
  const { out, ledger } = run({ Q5: '', Q6: 8, Q4: 1 });
  assert.deepStrictEqual(out.floorArea, [140]);
  assert.match(ledger, /Floor area estimated from room count/);
});

test('blank Q10 does not invent an internet speed and records a flag', () => {
  const ctx = createCtx();
  const out = normalize({ ...baseline, Q10: null }, ctx);

  assert.strictEqual(out.internetMbps, null);
  assert.ok(
    ctx.flags.some((flag) => flag.code === 'Q10_FALLBACK_UNDEFINED'),
    'Expected a flag when Q10 is blank and no fallback bands are defined',
  );
});

test('Q19 "Not sure" becomes true and is recorded', () => {
  const { out, ledger } = run({ Q19: 'Not sure' });
  assert.strictEqual(out.sensitiveData, true);
  assert.match(ledger, /Not sure/);
});

test('3 large rooms on floor 2 with 2 rooms per floor is rejected', () => {
  const rooms = [1, 2, 3].map(() => ({ floor: 2, occupancy: 20 }));
  assert.throws(() => run({ Q6: 2, Q8: rooms }));
});

test('Q7 Yes with no Q8 entries is rejected', () => {
  assert.throws(
    () => run({ Q7: 'Yes', Q8: [] }),
    /Q7 is Yes/i,
  );
});

test('Q7 No with Q8 entries is rejected', () => {
  assert.throws(
    () => run({
      Q7: 'No',
      Q8: [{ floor: 1, occupancy: 10 }],
    }),
    /Q7 is No/i,
  );
});

test('Q7 Yes with Q8 entries is accepted', () => {
  const { out } = run({
    Q7: 'Yes',
    Q8: [{ floor: 1, occupancy: 10 }],
  });

  assert.ok(validateNormalizedInput(out));
});

test('Q8 accepts frontend capacity and normalizes it to occupancy', () => {
  const { out } = run({
    Q7: 'Yes',
    Q8: [{ floor: 1, capacity: 25 }],
  });

  assert.deepEqual(out.largeRooms, [{ floor: 1, occupancy: 25 }]);
  assert.ok(validateNormalizedInput(out));
});

test('Q7 No with empty Q8 is accepted', () => {
  const { out } = run({ Q7: 'No', Q8: [] });

  assert.ok(validateNormalizedInput(out));
});

test('missing Q7 is rejected', () => {
  const { Q7, ...answers } = baseline;

  assert.throws(
    () => run({ ...answers, Q8: [] }, {}),
    /Yes or No/i,
  );
});


test('live POS with Q19 = No flips Q19 to Yes and records it', () => {
  const { out, ledger } = run({ Q19: 'No', Q20: ['Live POS'] });
  assert.strictEqual(out.sensitiveData, true);
  assert.match(ledger, /POS/);
});

test('Q15 = 10 without VoIP ticked treats VoIP as ticked', () => {
  const { out } = run({ Q15: 10, Q20: ['Cloud storage'] });
  assert.ok(out.apps.includes('VoIP'));
});


test('Q16 camera count without camera option ticked treats cameras as ticked', () => {
  const { out, ledger } = run({
    Q16: 5,
    Q20: [],
  });

  assert.ok(
    out.apps.includes('Security camera viewing'),
    'Expected camera viewing to be added to apps',
  );

  assert.match(
    ledger,
    /Cameras entered but camera viewing not ticked; treated as ticked/,
  );
});

test('CLI management without IT support records a consistency warning', () => {
  const { out, ledger } = run({
    Q23: 'none',
    Q26: 'command_line',
  });

  assert.strictEqual(out.itSupport, 'none');
  assert.strictEqual(out.management, 'cli');
  assert.match(ledger, /CLI management selected without IT support/);
});
test('Q26 CLI management with IT support does not add a consistency warning', () => {
  const { ledger } = run({
    Q23: 'in_house',
    Q26: 'command_line',
  });

  assert.doesNotMatch(
    ledger,
    /CLI management selected without IT support/,
  );
});


test('Q2 skipped defaults to one site and is recorded', () => {
  const { out, ledger } = run({ Q2: undefined });
  assert.strictEqual(out.locations, 'one');
  assert.match(ledger, /one site/);
});

test('blank Q9 defaults to notSure and records the assumption', () => {
  const raw = {
    ...baseline,
    Q9: '',
  };
  const ctx = createCtx();

  const result = normalize(raw, ctx);

  assert.equal(result.existingEquipment, 'notSure');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'existingEquipment' &&
        entry.valueUsed === 'notSure',
    ),
  );
});

test('blank Q11 defaults to notChecked and records the assumption', () => {
  const raw = {
    ...baseline,
    Q11: '',
  };
  const ctx = createCtx();

  const result = normalize(raw, ctx);

  assert.equal(result.connection, 'notChecked');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'connection' &&
        entry.valueUsed === 'notChecked',
    ),
  );
});
test('engine runner returns normalized input and captures validation errors', () => {
  const { run: runEngine } = require('../../src/types/engine');

  const valid = runEngine(baseline);

  assert.ok(valid.normalizedInput);
  assert.deepStrictEqual(valid.errors, []);
  assert.ok(Array.isArray(valid.plans));
  assert.ok(Array.isArray(valid.ledger));

  const invalid = runEngine({ ...baseline, Q3: 201 });

  assert.strictEqual(invalid.normalizedInput, null);
  assert.match(invalid.errors[0].message, /outside SME scope/);
});
