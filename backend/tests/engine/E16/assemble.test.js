'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCtx } = require('../../ctx.js');
const { validateEngineResult, CONTRACT_VERSION } = require('../../contracts.js');
const {
  assembleLedger,
  assembleFlags,
  assemblePlan,
  assembleEngineResult,
  finalizeEngineResult,
  assertJsonSafe,
} = require('../../steps/assemble.js');
const { catalog, makePlan, requirements, input, deepFreeze } = require('../../fixtures/e16-fixtures.js');

const STAMP = '2026-11-10T00:00:00.000Z';

function sharedCtx(ledger = [], flags = []) {
  const ctx = createCtx();
  ctx.ledger.push(...ledger);
  ctx.flags.push(...flags);
  return ctx;
}

function assemble(plans, overrides = {}) {
  return assembleEngineResult({
    requirements: requirements(),
    sharedCtx: sharedCtx(),
    plans,
    defaultVendor: { CE: 'V', HP: null },
    input: input(),
    catalog,
    ...overrides,
  });
}

test('AC6: shared ledger entries come first, then each plan in plan order, exact duplicates removed', () => {
  const shared = [
    { field: 'otherLocations', valueUsed: 1, reason: 'assumed' },
    { field: 'otherLocations', valueUsed: 1, reason: 'assumed' },
  ];
  const planA = makePlan({ planType: 'CE', ledger: [{ field: 'a', valueUsed: 1, reason: 'r' }, { field: 'otherLocations', valueUsed: 1, reason: 'assumed' }] });
  const planB = makePlan({ planType: 'HP', ledger: [{ field: 'b', valueUsed: 2, reason: 'r' }] });
  const result = assembleLedger(shared, [planA, planB]);
  assert.deepEqual(result.map((entry) => entry.field), ['otherLocations', 'a', 'b']);
});

test('AC6: duplicates are detected regardless of key order, but different values are kept', () => {
  const result = assembleLedger(
    [{ field: 'f', valueUsed: 1, reason: 'r' }, { reason: 'r', valueUsed: 1, field: 'f' }, { field: 'f', valueUsed: 2, reason: 'r' }],
    []
  );
  assert.equal(result.length, 2);
});

test('AC6: a malformed ledger entry is rejected', () => {
  assert.throws(() => assembleLedger([{ field: 'x' }], []), /Ledger entries must be/);
});

test('AC7: shared flags first, then plan flags grouped by plan with a plan scope', () => {
  const planA = makePlan({ planType: 'CE', flags: [{ code: 'A', message: 'a' }] });
  const planB = makePlan({ planType: 'HP', flags: [{ code: 'B', message: 'b' }] });
  const flags = assembleFlags([{ code: 'S', message: 's' }], [planA, planB]);
  assert.deepEqual(flags.map((flag) => flag.code), ['S', 'A', 'B']);
  assert.equal(flags[0].plan, undefined);
  assert.deepEqual(flags[1].plan, { vendor: 'V', planType: 'CE' });
  assert.deepEqual(flags[2].plan, { vendor: 'V', planType: 'HP' });
});

test('AC7: a plan flag identical to a shared flag is not repeated', () => {
  const same = { code: 'SOME_FLAG', message: 'x' };
  const flags = assembleFlags([same], [makePlan({ flags: [{ ...same }] })]);
  assert.equal(flags.length, 1);
});

test('AC7: flags from earlier steps (sunsetting, stale price, ...) pass through unchanged', () => {
  const codes = ['SUNSETTING', 'UNKNOWN_FIELD', 'PARTIAL_PRICE', 'INCOMPLETE_PLAN', 'STALE_PRICE', 'UNDERSTATED_LOAD', 'NOT_RACK_MOUNTABLE', 'GENERIC_ENCLOSURE'];
  const plan = makePlan({ flags: codes.map((code) => ({ code, message: code.toLowerCase() })) });
  const result = assemble([plan]);
  codes.forEach((code) => assert.ok(result.plans[0].flags.some((flag) => flag.code === code), code));
});

test('AC7: a malformed flag is rejected', () => {
  assert.throws(() => assembleFlags([{ code: 'X' }], []), /Flags must be/);
});

test('each plan gets a topology, a configuration plan and limitations', () => {
  const result = assemble([makePlan()]);
  const plan = result.plans[0];
  assert.ok(plan.topology.nodes.length > 0);
  assert.ok(plan.configurationPlan.sections.length > 0);
  assert.ok(plan.limitations.length >= 4);
});

test('topology flags and ledger entries are added to the plan, and the top-level lists include them', () => {
  const result = assemble([makePlan()]);
  assert.ok(result.plans[0].ledger.some((entry) => entry.field === 'topology.attachment'));
  assert.ok(result.ledger.some((entry) => entry.field === 'topology.attachment'));
});

test('result order follows the plans given (CE before HP) and carries the contract version', () => {
  const result = assemble([makePlan({ planType: 'CE' }), makePlan({ planType: 'HP' })]);
  assert.deepEqual(result.plans.map((plan) => plan.planType), ['CE', 'HP']);
  assert.equal(result.contractVersion, CONTRACT_VERSION);
  assert.equal(result.generatedAt, undefined);
});

test('AC11: installationMaterials passes through unchanged and defaultVendor is attached', () => {
  const materials = { items: [{ name: 'Cat6 cable', qty: 3 }], note: 'x' };
  const result = assemble([makePlan({ installationMaterials: materials })], { defaultVendor: { CE: 'V', HP: 'W' } });
  assert.deepEqual(result.plans[0].installationMaterials, materials);
  assert.deepEqual(result.defaultVendor, { CE: 'V', HP: 'W' });
});

test('a plan without installationMaterials stays without it', () => {
  assert.equal('installationMaterials' in assemble([makePlan()]).plans[0], false);
});

test('an incomplete plan without the skeleton has no topology field, but still has limitations', () => {
  const plan = makePlan({ complete: false, items: [{ category: 'gateway', sku: 'GW1', qty: 1 }] });
  const result = assemble([plan]);
  assert.equal('topology' in result.plans[0], false);
  assert.ok(result.plans[0].limitations.some((line) => /incomplete/.test(line)));
});

test('inputs are not mutated', () => {
  const plans = deepFreeze([makePlan()]);
  const shared = sharedCtx([{ field: 'f', valueUsed: 1, reason: 'r' }]);
  deepFreeze(shared);
  assert.doesNotThrow(() => assemble(plans, { sharedCtx: shared, requirements: deepFreeze(requirements()), input: deepFreeze(input()) }));
});

test('assembly is deterministic', () => {
  assert.deepEqual(assemble([makePlan()]), assemble([makePlan()]));
});

test('assemblePlan rejects bad shared ctx and plans', () => {
  assert.throws(() => assembleEngineResult({ requirements: requirements(), sharedCtx: null, plans: [], defaultVendor: { CE: null, HP: null }, input: input(), catalog }), /Shared ctx/);
  assert.throws(() => assembleEngineResult({ requirements: requirements(), sharedCtx: createCtx(), plans: 'x', defaultVendor: { CE: null, HP: null }, input: input(), catalog }), /array of plans/);
});

test('AC10: the finalized result passes validateEngineResult and is stamped', () => {
  const result = finalizeEngineResult(assemble([makePlan(), makePlan({ planType: 'HP' })]), STAMP);
  assert.equal(result.generatedAt, STAMP);
  assert.equal(validateEngineResult(result), true);
});

test('AC10: a placeholder defaultVendor of nulls validates', () => {
  const result = finalizeEngineResult(assemble([makePlan()], { defaultVendor: { CE: null, HP: null } }), STAMP);
  assert.equal(validateEngineResult(result), true);
});

test('AC10: generatedAt must be supplied by the caller', () => {
  const result = assemble([makePlan()]);
  assert.throws(() => finalizeEngineResult(result, undefined), /generatedAt/);
  assert.throws(() => finalizeEngineResult(result, '  '), /generatedAt/);
});

test('AC10: the result survives a JSON round trip unchanged', () => {
  const result = finalizeEngineResult(assemble([makePlan()]), STAMP);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('AC10: the output holds no full catalog rows', () => {
  const text = JSON.stringify(finalizeEngineResult(assemble([makePlan()]), STAMP));
  assert.doesNotMatch(text, /copper_ports|sfp_ports|poe_ports|dual_wan/);
});

test('AC10: assertJsonSafe rejects values that JSON would change or lose', () => {
  assert.doesNotThrow(() => assertJsonSafe({ a: [1, 'x', null, true], b: undefined }));
  assert.throws(() => assertJsonSafe({ a: NaN }), /finite/);
  assert.throws(() => assertJsonSafe({ a: Infinity }), /finite/);
  assert.throws(() => assertJsonSafe({ a: () => 1 }), /not JSON-safe/);
  assert.throws(() => assertJsonSafe({ a: 10n }), /not JSON-safe/);
  assert.throws(() => assertJsonSafe({ a: [undefined] }), /undefined in an array/);
  assert.throws(() => assertJsonSafe({ a: new Date() }), /plain objects/);
  assert.throws(() => assertJsonSafe({ a: new Map() }), /plain objects/);
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => assertJsonSafe(cycle), /Cyclic/);
});

test('AC10: finalizeEngineResult fails when the result is not valid against the contract', () => {
  const result = assemble([makePlan()]);
  result.plans[0].complete = 'yes';
  assert.throws(() => finalizeEngineResult(result, STAMP), /complete/);
});

test('assemblePlan returns a new plan and leaves the original untouched', () => {
  const plan = deepFreeze(makePlan());
  const next = assemblePlan(plan, { reqs: requirements(), input: input(), catalog, sharedLedger: [] });
  assert.notEqual(next, plan);
  assert.equal('topology' in plan, false);
  assert.ok(next.topology);
});