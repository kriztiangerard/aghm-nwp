'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createCtx } = require('../../src/types/engine/ctx');
const {
  selectDefaultVendors,
} = require('../../src/types/engine/default-vendor');

const vendors = [
  {
    name: 'Vendor A',
    managementModes: ['dashboard'],
  },
  {
    name: 'Vendor B',
    managementModes: ['cli'],
  },
];

function makePlan({
  vendor,
  planType = 'CE',
  complete = true,
  total = 1000,
  totalIsPartial = false,
} = {}) {
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

function select(plans, management = 'notSure') {
  const ctx = createCtx();

  const result = selectDefaultVendors(
    plans,
    { management, monthlyBudgetBand: 'under15k' },
    vendors,
    ctx,
  );

  return { result, ctx };
}

test('selects the lowest-total complete plan independently for CE and HP', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', planType: 'CE', total: 2000 }),
    makePlan({ vendor: 'Vendor B', planType: 'CE', total: 1000 }),
    makePlan({ vendor: 'Vendor A', planType: 'HP', total: 5000 }),
    makePlan({ vendor: 'Vendor B', planType: 'HP', total: 4000 }),
  ];

  const { result } = select(plans);

  assert.deepEqual(result, {
    CE: 'Vendor B',
    HP: 'Vendor B',
  });
});

test('excludes incomplete plans from default selection', () => {
  const plans = [
    makePlan({
      vendor: 'Vendor A',
      complete: false,
      total: 100,
    }),
    makePlan({
      vendor: 'Vendor B',
      complete: true,
      total: 200,
    }),
  ];

  const { result } = select(plans);

  assert.equal(result.CE, 'Vendor B');
  assert.equal(result.HP, null);
});

test('filters by management mode when compatible candidates exist', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: 2000 }),
    makePlan({ vendor: 'Vendor B', total: 1000 }),
  ];

  const { result } = select(plans, 'dashboard');

  assert.equal(result.CE, 'Vendor A');
});

test('drops management filter when it would leave no candidates', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: 2000 }),
  ];

  const { result, ctx } = select(plans, 'cli');

  assert.equal(result.CE, 'Vendor A');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'defaultVendor.CE.managementFilter' &&
        entry.valueUsed === 'ignored',
    ),
  );
});

test('ranks non-partial totals ahead of partial totals', () => {
  const plans = [
    makePlan({
      vendor: 'Vendor A',
      total: 500,
      totalIsPartial: true,
    }),
    makePlan({
      vendor: 'Vendor B',
      total: 2000,
      totalIsPartial: false,
    }),
  ];

  const { result } = select(plans);

  assert.equal(result.CE, 'Vendor B');
});

test('uses vendor descriptor order to break equal-total ties', () => {
  const plans = [
    makePlan({ vendor: 'Vendor B', total: 1000 }),
    makePlan({ vendor: 'Vendor A', total: 1000 }),
  ];

  const { result } = select(plans);

  assert.equal(result.CE, 'Vendor A');
});

test('returns null and flags plan types with no complete plans', () => {
  const plans = [
    makePlan({
      vendor: 'Vendor A',
      planType: 'CE',
      complete: false,
    }),
  ];

  const { result, ctx } = select(plans);

  assert.deepEqual(result, {
    CE: null,
    HP: null,
  });

  assert.equal(
    ctx.flags.filter(
      (flag) => flag.code === 'DEFAULT_VENDOR_NO_COMPLETE_PLAN',
    ).length,
    2,
  );
});

test('records that budget filtering is not applied while the cap is null', () => {
  const plans = [
    makePlan({ vendor: 'Vendor A', total: 2000 }),
    makePlan({ vendor: 'Vendor B', total: 1000 }),
  ];

  const { ctx } = select(plans);

  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'defaultVendor.CE.budgetFilter' &&
        entry.valueUsed === 'not applied',
    ),
  );
});
