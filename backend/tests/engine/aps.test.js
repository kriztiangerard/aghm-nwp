
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  selectAccessPoints,
} = require('../../src/types/engine/devices/aps.js');
const { createCtx } = require('../../src/types/engine/ctx.js');

const vendor = 'Omada';

function makeSku(sku, wifiStandard, supported6Ghz, maxPowerDrawW) {
  return {
    sku,
    vendor,
    category: 'access_point',
    line: 'High-Performance',
    status: 'ACTIVE',
    price: 8500,
    wifiStandard,
    supported6Ghz,
    maxPowerDrawW,
  };
}

function makeRequirements(standard = '6E', ceTotal = 3, hpTotal = 4) {
  return {
    wireless: {
      standard,
      ceiling: standard === '6E' ? 55 : 40,
      CE: { total: ceTotal, perFloor: [ceTotal] },
      HP: { total: hpTotal, perFloor: [hpTotal] },
    },
  };
}

function makeSelector(candidates) {
  const calls = [];

  const selectSku = ({
    vendor: selectedVendor,
    category,
    predicate,
    plan,
    cePick,
    pool,
    qty = 1,
  }) => {
    calls.push({
      vendor: selectedVendor,
      category,
      predicate,
      plan,
      cePick,
      pool,
      qty,
    });

    const available = (pool || candidates).filter(
      (candidate) =>
        candidate.vendor === selectedVendor &&
        candidate.category === category &&
        predicate(candidate)
    );

    if (available.length === 0) {
      return {
        ok: false,
        unmet: {
          category,
          vendor: selectedVendor,
          reason: 'No purchasable SKU meets the requirements',
        },
      };
    }

    const sku = available[0];

    return {
      ok: true,
      sku,
      qty,
      flags: [],
    };
  };

  return { selectSku, calls };
}

test('selects a qualifying Wi-Fi 6E access point when available', () => {
  const ap6E = makeSku('AP-6E', 6, true, 22);
  const selector = makeSelector([ap6E]);
  const ctx = createCtx();

  const result = selectAccessPoints({
    catalog: [ap6E],
    vendor,
    input: {
      apps: ['videoConferencing'],
      floorArea: [100],
      floors: 1,
      wifiDevices: 20,
    },
    requirements: makeRequirements('6E', 3, 4),
    plan: 'CE',
    ctx,
    selectSku: selector.selectSku,
    wirelessRequirementsFn: () => makeRequirements('6E', 3, 4).wireless,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'AP-6E');
  assert.equal(result.qty, 3);
  assert.equal(result.maxPowerDrawW, 22);
  assert.equal(selector.calls.length, 1);
});

test('falls back to Wi-Fi 6 and records a fallback flag when no 6E AP qualifies', () => {
  const ap6 = makeSku('AP-6', 6, false, 15);
  const selector = makeSelector([ap6]);
  const ctx = createCtx();

  const input = {
    apps: ['videoConferencing'],
    floorArea: [100],
    floors: 1,
    wifiDevices: 20,
  };

  let fallbackInput;
  let fallbackStandard;

  const result = selectAccessPoints({
    catalog: [ap6],
    vendor,
    input,
    requirements: makeRequirements('6E', 3, 4),
    plan: 'CE',
    ctx,
    selectSku: selector.selectSku,
    wirelessRequirementsFn: (receivedInput, receivedCtx, standardOverride) => {
      fallbackInput = receivedInput;
      fallbackStandard = standardOverride;
      return makeRequirements('6', 2, 3).wireless;
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'AP-6');
  assert.equal(result.qty, 2);
  assert.equal(result.maxPowerDrawW, 15);
  assert.equal(fallbackInput, input);
  assert.equal(fallbackStandard, '6');

  assert.ok(
    result.flags.some(
      (flag) => flag.message === '6E unavailable in Omada at this tier'
    )
  );

  assert.ok(
    ctx.flags.some(
      (flag) => flag.message === '6E unavailable in Omada at this tier'
    )
  );

  assert.equal(
    ctx.unmet.length,
    0,
    'Successful Wi-Fi 6 fallback should not leave the failed 6E attempt as UNMET'
  );
});

test('uses the High-Performance AP count and passes the CE SKU through', () => {
  const ap6E = makeSku('AP-6E', 6, true, 22);

  const ceSku = {
    ...makeSku('AP-CE', 6, true, 18),
    line_rank: 1,
  };

  const cePick = {
    ok: true,
    sku: ceSku,
    qty: 1,
    flags: [],
  };

  const selector = makeSelector([ap6E]);

  const result = selectAccessPoints({
    catalog: [ap6E],
    vendor,
    input: {
      apps: [],
      floorArea: [100],
      floors: 1,
      wifiDevices: 20,
    },
    requirements: makeRequirements('6E', 3, 4),
    plan: 'HP',
    cePick,
    ctx: createCtx(),
    selectSku: selector.selectSku,
    wirelessRequirementsFn: () =>
      makeRequirements('6E', 3, 4).wireless,
  });

  assert.equal(result.ok, true);
  assert.equal(result.qty, 4);
  assert.equal(selector.calls[0].plan, 'high_performance');
  assert.equal(selector.calls[0].cePick, ceSku);
});

test('does not classify Wi-Fi 7 as Wi-Fi 6E', () => {
  const ap7 = makeSku('AP-7', 7, true, 22);

  const selector = makeSelector([ap7]);

  const result = selectAccessPoints({
    catalog: [ap7],
    vendor,
    input: {
      apps: [],
      floorArea: [100],
      floors: 1,
      wifiDevices: 20,
    },
    requirements: makeRequirements('6E', 3, 4),
    plan: 'CE',
    ctx: createCtx(),
    selectSku: selector.selectSku,
    wirelessRequirementsFn: () => makeRequirements('6', 2, 3).wireless,
  });

  assert.equal(result.ok, false);
  assert.equal(selector.calls.length, 2);
});

test('returns an unmet result when both 6E and Wi-Fi 6 selection fail', () => {
  const ap5 = makeSku('AP-5', 5, false, 12);
  const selector = makeSelector([ap5]);
  const ctx = createCtx();

  const result = selectAccessPoints({
    catalog: [ap5],
    vendor,
    input: {
      apps: [],
      floorArea: [100],
      floors: 1,
      wifiDevices: 20,
    },
    requirements: makeRequirements('6E', 3, 4),
    plan: 'CE',
    ctx,
    selectSku: selector.selectSku,
    wirelessRequirementsFn: () => makeRequirements('6', 2, 3).wireless,
  });

  assert.equal(result.ok, false);
  assert.equal(result.unmet.category, 'access_point');
  assert.equal(
    ctx.flags.some((flag) => flag.code === 'WIFI_6E_FALLBACK'),
    false
  );
});

test('returns null for max power draw when the selected AP has no value', () => {
  const ap6E = makeSku('AP-6E', 6, true, null);
  const selector = makeSelector([ap6E]);

  const result = selectAccessPoints({
    catalog: [ap6E],
    vendor,
    input: {
      apps: [],
      floorArea: [100],
      floors: 1,
      wifiDevices: 20,
    },
    requirements: makeRequirements('6E', 3, 4),
    plan: 'CE',
    ctx: createCtx(),
    selectSku: selector.selectSku,
    wirelessRequirementsFn: () => makeRequirements('6E', 3, 4).wireless,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxPowerDrawW, null);
});
