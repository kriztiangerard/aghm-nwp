'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { selectDefaultVendors } = require('../../src/types/engine/default-vendor.js');
const { createCtx } = require('../../src/types/engine/ctx.js');

const vendors = [
  { name: 'Vendor A', needController: false, managementModes: ['dashboard'] },
  { name: 'Vendor B', needController: false, managementModes: ['cli'] },
  { name: 'Vendor C', needController: false, managementModes: ['dashboard', 'cli'] },
];

function makePlan({
  vendor,
  planType = 'CE',
  complete = true,
  total = 10000,
  totalIsPartial = false,
}) {
  return {
    vendor,
    planType,
    complete,
    bom: {
      total,
      totalIsPartial,
    },
  };
}

function makeInput(overrides = {}) {
  return {
    management: 'notSure',
    monthlyBudgetBand: 'under15k',
    itSupport: 'none',
    downtime: 'waitItOut',
    ...overrides,
  };
}

function runSelector(plans, input = makeInput(), vendorList = vendors) {
  const ctx = createCtx();
  const result = selectDefaultVendors(plans, input, vendorList, ctx);

  return { result, ctx };
}

test('AC1: only complete plans are candidates', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', complete: false, total: 1000 }),
    makePlan({ vendor: 'Vendor B', total: 12000 }),
  ];

  const { result } = runSelector(plans);

  assert.equal(result.CE, 'Vendor B');
});

test('AC2: dashboard preference filters vendors by management mode', () => {
  const plans = [
    makePlan({ vendor: 'Vendor B', total: 5000 }),
    makePlan({ vendor: 'Vendor A', total: 10000 }),
    makePlan({ vendor: 'Vendor C', total: 12000 }),
  ];

  const { result } = runSelector(
    plans,
    makeInput({ management: 'dashboard' })
  );

  assert.equal(result.CE, 'Vendor A');
});

test('AC2: CLI preference filters vendors by management mode', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: 5000 }),
    makePlan({ vendor: 'Vendor B', total: 10000 }),
    makePlan({ vendor: 'Vendor C', total: 12000 }),
  ];

  const { result } = runSelector(
    plans,
    makeInput({ management: 'cli' })
  );

  assert.equal(result.CE, 'Vendor B');
});

test('AC2: notSure does not apply a management filter', () => {
  const plans = [
    makePlan({ vendor: 'Vendor B', total: 5000 }),
    makePlan({ vendor: 'Vendor A', total: 10000 }),
  ];

  const { result } = runSelector(
    plans,
    makeInput({ management: 'notSure' })
  );

  assert.equal(result.CE, 'Vendor B');
});

test('AC3: null budget cap does not filter plans by total', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: 50000 }),
    makePlan({ vendor: 'Vendor B', total: 60000 }),
  ];

  const { result, ctx } = runSelector(plans);

  assert.equal(result.CE, 'Vendor A');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'defaultVendor.budgetFilter' &&
        entry.reason.includes('no budget filtering is applied')
    )
  );
});

test('AC4: non-partial totals rank ahead of cheaper partial totals', () => {
  const plans = [
    makePlan({
      vendor: 'Vendor A',
      total: 5000,
      totalIsPartial: true,
    }),
    makePlan({
      vendor: 'Vendor B',
      total: 12000,
      totalIsPartial: false,
    }),
  ];

  const { result } = runSelector(plans);

  assert.equal(result.CE, 'Vendor B');
});

test('AC4: lowest total wins among non-partial plans', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: 12000 }),
    makePlan({ vendor: 'Vendor B', total: 9000 }),
  ];

  const { result } = runSelector(plans);

  assert.equal(result.CE, 'Vendor B');
});

test('AC4: lowest total wins among partial plans', () => {
  const plans = [
    makePlan({
      vendor: 'Vendor A',
      total: 12000,
      totalIsPartial: true,
    }),
    makePlan({
      vendor: 'Vendor B',
      total: 9000,
      totalIsPartial: true,
    }),
  ];

  const { result } = runSelector(plans);

  assert.equal(result.CE, 'Vendor B');
});

test('AC4: null totals rank last', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: null }),
    makePlan({ vendor: 'Vendor B', total: 12000 }),
  ];

  const { result } = runSelector(plans);

  assert.equal(result.CE, 'Vendor B');
});

test('AC5: earlier vendor wins when totals are equal', () => {
  const plans = [
    makePlan({ vendor: 'Vendor B', total: 10000 }),
    makePlan({ vendor: 'Vendor A', total: 10000 }),
  ];

  const { result } = runSelector(plans);

  assert.equal(result.CE, 'Vendor A');
});

test('AC6: management filter is ignored if it removes every candidate', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: 10000 }),
    makePlan({ vendor: 'Vendor A', planType: 'HP', total: 15000 }),
  ];

  const { result, ctx } = runSelector(
    plans,
    makeInput({ management: 'cli' })
  );

  assert.equal(result.CE, 'Vendor A');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'defaultVendor.CE.managementFilter' &&
        entry.reason.includes('ignored because it left no CE candidates')
    )
  );
});

test('AC7: no complete plan returns null and adds a flag', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', complete: false }),
  ];

  const { result, ctx } = runSelector(plans);

  assert.equal(result.CE, null);
  assert.ok(
    ctx.flags.some(
      (flag) => flag.code === 'DEFAULT_VENDOR_NO_COMPLETE_CE_PLAN'
    )
  );
});

test('AC8: CE and HP defaults are selected independently', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', planType: 'CE', total: 10000 }),
    makePlan({ vendor: 'Vendor B', planType: 'CE', total: 12000 }),
    makePlan({ vendor: 'Vendor B', planType: 'HP', total: 20000 }),
    makePlan({ vendor: 'Vendor C', planType: 'HP', total: 25000 }),
  ];

  const { result, ctx } = runSelector(plans);

  assert.deepEqual(result, {
    CE: 'Vendor A',
    HP: 'Vendor B',
  });

  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'defaultVendor.excludedInputs' &&
        entry.reason.includes('not separate inputs')
    )
  );
});

test('AC9: identical inputs produce identical results and ledger entries', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: 10000 }),
    makePlan({ vendor: 'Vendor B', total: 12000 }),
    makePlan({ vendor: 'Vendor C', planType: 'HP', total: 20000 }),
  ];

  const first = runSelector(plans);
  const second = runSelector(plans);

  assert.deepEqual(first, second);
});
