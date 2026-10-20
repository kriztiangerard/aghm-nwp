'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONTRACT_VERSION,
  validateNormalizedInput,
  validateRequirements,
  validateSelectionResult,
  ValidationError,
} = require('../../src/types/engine/contracts');

const { normalize } = require('../../src/types/engine/normalize');
const { createCtx } = require('../../src/types/engine/ctx');

const baseline = require('../fixtures/raw-answers/input1-baseline.json');

function getValidNormalizedInput() {
  return normalize({ ...baseline }, createCtx());
}

test('valid normalized input passes contract validation', () => {
  assert.equal(validateNormalizedInput(getValidNormalizedInput()), true);
});

test('invalid contract version is rejected', () => {
  const input = getValidNormalizedInput();
  input.contractVersion = CONTRACT_VERSION + 1;

  assert.throws(
    () => validateNormalizedInput(input),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'contractVersion',
  );
});

test('floor-area length must match the number of floors', () => {
  const input = getValidNormalizedInput();
  input.floorArea = [100];

  assert.throws(
    () => validateNormalizedInput(input),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'floorArea',
  );
});

test('negative device counts are rejected', () => {
  const input = getValidNormalizedInput();
  input.cameras = -1;

  assert.throws(
    () => validateNormalizedInput(input),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'cameras',
  );
});

test('invalid location enum is rejected', () => {
  const input = getValidNormalizedInput();
  input.locations = 'multiple';

  assert.throws(
    () => validateNormalizedInput(input),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'locations',
  );
});

test('valid partial requirements pass contract validation', () => {
  assert.equal(
    validateRequirements({
      edgePorts: 24,
      poeEdgePorts: 8,
      otherPoeLoadW: 100,
    }),
    true,
  );
});

test('empty requirements object is rejected', () => {
  assert.throws(
    () => validateRequirements({}),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'reqs',
  );
});

test('negative edge port count is rejected', () => {
  assert.throws(
    () => validateRequirements({ edgePorts: -1 }),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'edgePorts',
  );
});

test('invalid wireless CE total is rejected', () => {
  assert.throws(
    () =>
      validateRequirements({
        wireless: {
          CE: { total: -1 },
        },
      }),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'wireless.CE.total',
  );
});

test('valid successful selection result passes validation', () => {
  assert.equal(
    validateSelectionResult({
      ok: true,
      sku: { sku: 'TEST-SKU' },
      qty: 2,
      flags: [],
    }),
    true,
  );
});

test('negative selection quantity is rejected', () => {
  assert.throws(
    () =>
      validateSelectionResult({
        ok: true,
        sku: { sku: 'TEST-SKU' },
        qty: -1,
        flags: [],
      }),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'qty',
  );
});

test('valid unsuccessful selection result passes validation', () => {
  assert.equal(
    validateSelectionResult({
      ok: false,
      unmet: {
        category: 'switch',
        vendor: 'TP-Link Omada',
        reason: 'No compatible SKU found',
      },
    }),
    true,
  );
});

test('unsuccessful selection with missing unmet details is rejected', () => {
  assert.throws(
    () => validateSelectionResult({ ok: false, unmet: {} }),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'unmet.category',
  );
});

test('selection result without an ok boolean is rejected', () => {
  assert.throws(
    () => validateSelectionResult({}),
    (error) =>
      error instanceof ValidationError &&
      error.field === 'ok',
  );
});