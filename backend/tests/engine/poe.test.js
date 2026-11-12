
'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  computePoeBudget,
} = require('../../src/types/engine/devices/poe');

describe('NWP-ENGINE-010: PoE budget calculation', () => {
  const apSelection = {
    ok: true,
    sku: { ap_specs: { max_power_draw_w: 20 } },
  };

  test('calculates Cost-Efficient budget', () => {
    const result = computePoeBudget({
      requirements: {
        otherPoeLoadW: 77,
        wireless: { CE: { perFloor: [4] } },
      },
      apSelection,
      plan: 'CE',
    });

    assert.equal(result.apDrawW, 20);
    assert.deepEqual(result.perFloor, [
      { loadW: 157, budgetW: 188.4 },
    ]);
  });

  test('calculates High-Performance budget with 30% growth', () => {
    const result = computePoeBudget({
      requirements: {
        otherPoeLoadW: 77,
        g: 0.30,
        wireless: { HP: { perFloor: [4] } },
      },
      apSelection,
      plan: 'HP',
    });

    assert.deepEqual(result.perFloor, [
      { loadW: 157, budgetW: 244.92 },
    ]);
  });

  test('splits other PoE load evenly across two floors', () => {
    const result = computePoeBudget({
      requirements: {
        otherPoeLoadW: 77,
        wireless: { CE: { perFloor: [2, 2] } },
      },
      apSelection,
      plan: 'CE',
    });

    assert.deepEqual(result.perFloor, [
      { loadW: 78.5, budgetW: 94.2 },
      { loadW: 78.5, budgetW: 94.2 },
    ]);
  });

  test('handles zero APs', () => {
    const result = computePoeBudget({
      requirements: {
        otherPoeLoadW: 77,
        wireless: { CE: { perFloor: [0] } },
      },
      apSelection: null,
      plan: 'CE',
    });

    assert.equal(result.apDrawW, 0);
    assert.deepEqual(result.perFloor, [
      { loadW: 77, budgetW: 92.4 },
    ]);
  });

  test('handles zero floors', () => {
    const result = computePoeBudget({
      requirements: {
        otherPoeLoadW: 77,
        wireless: { CE: { perFloor: [] } },
      },
      apSelection: null,
      plan: 'CE',
    });

    assert.deepEqual(result, {
      perFloor: [],
      apDrawW: 0,
    });
  });

  test('rejects an invalid plan', () => {
    assert.throws(
      () => computePoeBudget({
        requirements: {
          wireless: { CE: { perFloor: [1] } },
        },
        apSelection,
        plan: 'INVALID',
      }),
      /plan must be CE or HP/,
    );
  });

  test('rejects negative AP counts', () => {
    assert.throws(
      () => computePoeBudget({
        requirements: {
          wireless: { CE: { perFloor: [-1] } },
        },
        apSelection,
        plan: 'CE',
      }),
      /AP counts must be non-negative integers/,
    );
  });
});

test('rejects the synthetic SUNSETTING AP when its power draw is missing', () => {
  const syntheticCatalog = require('../fixtures/catalogs/synthetic-catalog-edgecases.json');
  const legacyAp = syntheticCatalog.find(
    (sku) => sku.sku === 'SYN-AP-003',
  );

  assert.ok(legacyAp, 'Synthetic AP fixture must exist');
  assert.equal(legacyAp.status, 'SUNSETTING');
  assert.equal(legacyAp.max_power_draw_w, undefined);

  assert.throws(
    () => computePoeBudget({
      requirements: {
        otherPoeLoadW: 0,
        wireless: { CE: { perFloor: [1] } },
      },
      apSelection: {
        ok: true,
        sku: legacyAp,
        maxPowerDrawW: null,
      },
      plan: 'CE',
    }),
    {
      name: 'TypeError',
      message: 'Selected AP must have a valid max_power_draw_w',
    },
  );
});
