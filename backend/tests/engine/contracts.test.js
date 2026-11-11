'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONTRACT_VERSION,
  ValidationError,
  validateVendorDescriptors,
  validateBom,
  validatePlan,
  validateEngineResult,
} = require('../../src/types/engine/contracts');

function assertRejects(fn, field) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof ValidationError);
    assert.equal(err.field, field);
    assert.ok(err.message.includes(field));
    return true;
  });
}

const validVendor = () => ({
  name: 'Omada',
  needController: false,
  managementModes: ['dashboard', 'cli'],
});

const validBomLine = () => ({
  category: 'gateway',
  sku: 'TEST-GW-01',
  name: 'Test Gateway',
  vendor: 'Omada',
  qty: 1,
  unitPrice: 10000,
  lineTotal: 10000,
  status: 'ACTIVE',
  isGeneric: false,
});

const validBom = () => ({
  currency: 'PHP',
  lines: [validBomLine()],
  total: 10000,
  totalIsPartial: false,
});

const validPlan = () => ({
  vendor: 'Omada',
  planType: 'CE',
  complete: true,
  items: [{ category: 'gateway', sku: 'TEST-GW-01', qty: 1 }],
  bom: validBom(),
  unmet: [],
  flags: [],
  ledger: [],
  optics: { links: 1, modules: 2, formFactor: 'SFP' },
  powerProtection: { upsRecommendationLevel: 'advisory' },
  limitations: [],
});

const validEngineResult = () => ({
  contractVersion: CONTRACT_VERSION,
  generatedAt: '2026-11-07T10:00:00.000Z',
  requirements: {},
  ledger: [],
  flags: [],
  plans: [validPlan()],
  defaultVendor: {
    CE: 'Omada',
    HP: null,
  },
});

test('validateVendorDescriptors accepts valid unique vendor descriptors', () => {
  assert.equal(
    validateVendorDescriptors([
      validVendor(),
      {
        name: 'UniFi',
        needController: true,
        managementModes: ['dashboard'],
      },
    ]),
    true
  );
});

test('validateVendorDescriptors rejects an empty vendor list', () => {
  assertRejects(() => validateVendorDescriptors([]), 'vendors');
});

test('validateVendorDescriptors rejects duplicate vendor names', () => {
  assertRejects(
    () => validateVendorDescriptors([validVendor(), validVendor()]),
    'vendors[1].name'
  );
});

test('validateVendorDescriptors rejects a non-boolean needController value', () => {
  assertRejects(
    () => validateVendorDescriptors([
      { ...validVendor(), needController: 'false' },
    ]),
    'vendors[0].needController'
  );
});

test('validateVendorDescriptors rejects unsupported management modes', () => {
  assertRejects(
    () => validateVendorDescriptors([
      { ...validVendor(), managementModes: ['dashboard', 'api'] },
    ]),
    'vendors[0].managementModes'
  );
});

test('validateBom accepts a valid priced BOM', () => {
  assert.equal(validateBom(validBom()), true);
});

test('validateBom accepts an unpriced line when the total is partial', () => {
  const bom = validBom();
  bom.lines[0].unitPrice = null;
  bom.lines[0].lineTotal = null;
  bom.total = null;
  bom.totalIsPartial = true;

  assert.equal(validateBom(bom), true);
});

test('validateBom rejects an unsupported line category', () => {
  const bom = validBom();
  bom.lines[0].category = 'router';

  assertRejects(() => validateBom(bom), 'bom.lines[0].category');
});

test('validateBom rejects a non-positive line quantity', () => {
  const bom = validBom();
  bom.lines[0].qty = 0;

  assertRejects(() => validateBom(bom), 'bom.lines[0].qty');
});

test('validateBom rejects mismatched null unit price and line total', () => {
  const bom = validBom();
  bom.lines[0].unitPrice = null;

  assertRejects(() => validateBom(bom), 'bom.lines[0].lineTotal');
});

test('validateBom rejects a negative unit price', () => {
  const bom = validBom();
  bom.lines[0].unitPrice = -1;

  assertRejects(() => validateBom(bom), 'bom.lines[0].unitPrice');
});

test('validateBom rejects a missing or invalid line status', () => {
  const bom = validBom();
  bom.lines[0].status = 'DISCONTINUED';

  assertRejects(() => validateBom(bom), 'bom.lines[0].status');
});

test('validateBom rejects an unpriced line when totalIsPartial is false', () => {
  const bom = validBom();
  bom.lines[0].unitPrice = null;
  bom.lines[0].lineTotal = null;
  bom.total = null;
  bom.totalIsPartial = false;

  assertRejects(() => validateBom(bom), 'bom.totalIsPartial');
});

test('validatePlan accepts a valid plan with BOM and optional fields', () => {
  assert.equal(validatePlan(validPlan()), true);
});

test('validatePlan accepts a plan with null optics', () => {
  const plan = validPlan();
  plan.optics = null;

  assert.equal(validatePlan(plan), true);
});

test('validatePlan rejects an unsupported plan type', () => {
  const plan = validPlan();
  plan.planType = 'STANDARD';

  assertRejects(() => validatePlan(plan), 'plan.planType');
});

test('validatePlan rejects an invalid plan item quantity', () => {
  const plan = validPlan();
  plan.items[0].qty = 1.5;

  assertRejects(() => validatePlan(plan), 'plan.items[0]');
});

test('validatePlan rejects a missing BOM', () => {
  const plan = validPlan();
  delete plan.bom;

  assertRejects(() => validatePlan(plan), 'bom');
});

test('validatePlan rejects malformed optics', () => {
  const plan = validPlan();
  plan.optics = { links: -1, modules: 2, formFactor: 'SFP' };

  assertRejects(() => validatePlan(plan), 'plan.optics');
});

test('validatePlan rejects a non-array limitations field', () => {
  const plan = validPlan();
  plan.limitations = 'No limitation';

  assertRejects(() => validatePlan(plan), 'plan.limitations');
});

test('validateEngineResult accepts a valid result containing a plan', () => {
  assert.equal(validateEngineResult(validEngineResult()), true);
});

test('validateEngineResult rejects an outdated contract version', () => {
  const result = validEngineResult();
  result.contractVersion = CONTRACT_VERSION - 1;

  assertRejects(() => validateEngineResult(result), 'contractVersion');
});

test('validateEngineResult rejects a missing generatedAt value', () => {
  const result = validEngineResult();
  delete result.generatedAt;

  assertRejects(() => validateEngineResult(result), 'generatedAt');
});

test('validateEngineResult rejects a non-array plans field', () => {
  const result = validEngineResult();
  result.plans = {};

  assertRejects(() => validateEngineResult(result), 'plans');
});

test('validateEngineResult rejects a missing default vendor plan key', () => {
  const result = validEngineResult();
  delete result.defaultVendor.HP;

  assertRejects(() => validateEngineResult(result), 'defaultVendor.HP');
});

test('validateEngineResult accepts null when no default vendor is selected', () => {
  const result = validEngineResult();
  result.defaultVendor = { CE: null, HP: null };

  assert.equal(validateEngineResult(result), true);
});
