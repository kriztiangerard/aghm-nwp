'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLimitations, STATIC_LIMITATIONS } = require('../../steps/limitations.js');
const { makePlan, input, bomLine } = require('../../fixtures/e16-fixtures.js');

const build = (plan = makePlan(), inp = input(), ledger = []) => buildLimitations(plan, inp, ledger);
const has = (lines, pattern) => lines.some((line) => pattern.test(line));

test('AC8: the four static limitations always appear, for any plan', () => {
  assert.equal(STATIC_LIMITATIONS.length, 4);
  const complete = build();
  const incomplete = build(makePlan({ complete: false }));
  STATIC_LIMITATIONS.forEach((line) => {
    assert.ok(complete.includes(line));
    assert.ok(incomplete.includes(line));
  });
  assert.match(STATIC_LIMITATIONS[0], /Planning stage only/);
  assert.match(STATIC_LIMITATIONS[0], /site survey/);
  assert.match(STATIC_LIMITATIONS[1], /major network equipment/);
  assert.match(STATIC_LIMITATIONS[1], /cabling/);
  assert.match(STATIC_LIMITATIONS[1], /site survey/);
  assert.match(STATIC_LIMITATIONS[2], /logical design only/);
  assert.match(STATIC_LIMITATIONS[2], /IP addressing/);
  assert.match(STATIC_LIMITATIONS[2], /rack elevations/);
  assert.match(STATIC_LIMITATIONS[2], /coverage analysis/);
  assert.match(STATIC_LIMITATIONS[3], /taxes, shipping, installation fees, promotions/);
  assert.match(STATIC_LIMITATIONS[3], /distributor/);
});

test('AC9: the greenfield notice appears for existingEquipment yes or notSure, not for no', () => {
  assert.ok(has(build(makePlan(), input({ existingEquipment: 'yes' })), /greenfield/));
  assert.ok(has(build(makePlan(), input({ existingEquipment: 'notSure' })), /greenfield/));
  assert.ok(!has(build(makePlan(), input({ existingEquipment: 'no' })), /greenfield/));
});

test('AC9: unmet requirements and an incomplete plan are listed', () => {
  const plan = makePlan({ complete: false, unmet: [{ category: 'switch', vendor: 'V', reason: 'No qualifying switch' }] });
  const lines = build(plan);
  assert.ok(has(lines, /Requirement not met by V \(CE\): switch — No qualifying switch\./));
  assert.ok(has(lines, /incomplete \(complete: false\)/));
  assert.ok(!has(build(), /incomplete/));
});

test('AC9: a partial total is explained, with a different reason for unpriced items', () => {
  const unpriced = makePlan();
  unpriced.bom = { ...unpriced.bom, totalIsPartial: true, lines: [...unpriced.bom.lines, bomLine('enclosure', 'X', 'Cabinet', 1, { unitPrice: null, lineTotal: null })] };
  assert.ok(has(build(unpriced), /no price on file/));

  const other = makePlan();
  other.bom = { ...other.bom, totalIsPartial: true };
  assert.ok(has(build(other), /partial and does not cover every item/));

  assert.ok(!has(build(), /total cost is partial/));
});

test('AC9: each default or estimate in the ledger is listed, except the topology layout entry', () => {
  const ledger = [
    { field: 'roomSize', valueUsed: 20, reason: 'room size assumed' },
    { field: 'topology.attachment', valueUsed: 'assumed layout', reason: 'ESTIMATE: fill rule' },
  ];
  const lines = build(makePlan(), input(), ledger);
  assert.ok(has(lines, /Default or estimate used: roomSize = 20\. room size assumed\./));
  assert.ok(!has(lines, /topology\.attachment/));
});

test('AC9: the assumed-layout note appears only when the plan has a topology', () => {
  assert.ok(!has(build(), /assumed layout/));
  assert.ok(has(build(makePlan({ topology: { nodes: [], edges: [] } })), /assumed layout/));
});

test('AC9: a generic enclosure adds the generic-size note', () => {
  const plan = makePlan();
  plan.bom = { ...plan.bom, lines: [...plan.bom.lines, bomLine('enclosure', 'GEN', 'Generic 9U', 1, { isGeneric: true })] };
  assert.ok(has(build(plan), /generic size/));
  assert.ok(!has(build(), /generic size/));
});

test('no duplicate lines, and the inputs are not mutated', () => {
  const ledger = [
    { field: 'a', valueUsed: 1, reason: 'r' },
    { field: 'a', valueUsed: 1, reason: 'r' },
  ];
  const lines = build(makePlan(), input(), ledger);
  assert.equal(new Set(lines).size, lines.length);
  assert.equal(ledger.length, 2);
});

test('argument checks', () => {
  assert.throws(() => buildLimitations(null, input(), []), TypeError);
  assert.throws(() => buildLimitations(makePlan(), null, []), TypeError);
  assert.throws(() => buildLimitations(makePlan(), input(), 'x'), TypeError);
});