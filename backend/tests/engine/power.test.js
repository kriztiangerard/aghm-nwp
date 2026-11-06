'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  recommendPower,
  computePlanLoadW,
  buildPowerProtection,
} = require('../../src/types/engine/devices/power.js');

const { createCtx } = require('../../src/types/engine/ctx.js');

test('recommendPower marks frequent outages as prominent', () => {
  const result = recommendPower({
    input: { power: 'frequent' },
  });

  assert.equal(result.upsRecommendationLevel, 'prominent');
  assert.equal(
    result.upsRecommendation,
    'UPS recommended for network equipment.'
  );
});

test('recommendPower marks stable power as advisory', () => {
  const result = recommendPower({
    input: { power: 'stable' },
  });

  assert.equal(result.upsRecommendationLevel, 'advisory');
});

test('computePlanLoadW sums eligible device draw multiplied by quantity', () => {
  const ctx = createCtx();

  const planItems = [
    {
      category: 'gateway',
      sku: { sku: 'GW-1', max_draw_w: 30 },
      qty: 1,
    },
    {
      category: 'switch',
      sku: { sku: 'SW-1', max_draw_w: 120 },
      qty: 2,
    },
    {
      category: 'controller',
      sku: 'CTRL-1', controller_type: 'hardware', max_draw_w: 15,
      qty: 1,
    },
  ];

  const result = computePlanLoadW(planItems, ctx);

  assert.equal(result.estimatedLoadW, 285);
  assert.equal(result.knownDeviceCount, 3);
});

test('computePlanLoadW excludes access points and other PoE devices', () => {
  const ctx = createCtx();

  const result = computePlanLoadW([
    {
      category: 'switch',
      sku: { sku: 'SW-1', max_draw_w: 100 },
      qty: 1,
    },
    {
      category: 'access_point',
      sku: { sku: 'AP-1', max_draw_w: 20 },
      qty: 4,
    },
  ], ctx);

  assert.equal(result.estimatedLoadW, 100);
  assert.equal(result.knownDeviceCount, 1);
});

test('computePlanLoadW flags eligible devices with unknown power draw', () => {
  const ctx = createCtx();

  const result = computePlanLoadW([
    {
      category: 'gateway',
      sku: { sku: 'GW-UNKNOWN' },
      qty: 1,
    },
  ], ctx);

  assert.equal(result.estimatedLoadW, null);
  assert.equal(result.knownDeviceCount, 0);
  assert.equal(ctx.flags.length, 1);
  assert.equal(ctx.flags[0].code, 'POWER_DRAW_UNKNOWN');
  assert.match(ctx.flags[0].message, /GW-UNKNOWN/);
  assert.match(ctx.flags[0].message, /understated/i);
});

test('buildPowerProtection defaults a missing recommendation level to advisory', () => {
  const ctx = createCtx();

  const result = buildPowerProtection(
    {},
    { power: 'stable' },
    [{ category: 'switch', sku: { sku: 'SW-1', max_draw_w: 80 }, qty: 1 }],
    ctx
  );

  assert.equal(result.level, 'advisory');
  assert.equal(result.estimatedLoadW, 80);
  assert.equal(result.minUpsRatingW, 100);
  assert.ok(ctx.ledger.some(
    (entry) => entry.field === 'upsRecommendationLevel'
  ));
});

test('buildPowerProtection preserves the supplied recommendation level', () => {
  const ctx = createCtx();

  const result = buildPowerProtection(
    { upsRecommendationLevel: 'prominent' },
    { power: 'frequent' },
    [{ category: 'gateway', sku: { sku: 'GW-1', max_draw_w: 80 }, qty: 1 }],
    ctx
  );

  assert.equal(result.level, 'prominent');
  assert.equal(result.estimatedLoadW, 80);
  assert.equal(result.minUpsRatingW, 100);
});

test('buildPowerProtection keeps the UPS outside BOM and cost calculations', () => {
  const ctx = createCtx();

  const result = buildPowerProtection(
    { upsRecommendationLevel: 'advisory' },
    { power: 'stable' },
    [{ category: 'switch', sku: { sku: 'SW-1', max_draw_w: 80 }, qty: 1 }],
    ctx
  );

  assert.match(result.text, /excluded from the bill of materials and cost estimate/i);
  assert.equal(result.estimatedLoadW, 80);
  assert.equal(result.minUpsRatingW, 100);
});

test('buildPowerProtection returns a null rating when no eligible device has known draw', () => {
  const ctx = createCtx();

  const result = buildPowerProtection(
    { upsRecommendationLevel: 'advisory' },
    { power: 'stable' },
    [{ category: 'gateway', sku: { sku: 'GW-UNKNOWN' }, qty: 1 }],
    ctx
  );

  assert.equal(result.estimatedLoadW, null);
  assert.equal(result.minUpsRatingW, null);
  assert.ok(result.assumptions.length > 0);
});

test('buildPowerProtection rounds the minimum UPS rating up to a whole watt', () => {
  const ctx = createCtx();

  const result = buildPowerProtection(
    { upsRecommendationLevel: 'advisory' },
    { power: 'stable' },
    [
      {
        category: 'switch',
        sku: { sku: 'SW-ROUND', max_draw_w: 81 },
        qty: 1,
      },
    ],
    ctx
  );

  assert.equal(result.estimatedLoadW, 81);
  assert.equal(result.minUpsRatingW, 102);
});


test('power protection records the unsourced UPS ratio assumption', () => {
  const ctx = createCtx();

  buildPowerProtection(
    { upsRecommendationLevel: 'advisory' },
    { power: 'stable' },
    [{ category: 'switch', sku: { sku: 'SW-LEDGER', max_draw_w: 80 }, qty: 1 }],
    ctx
  );

  const ratioEntry = ctx.ledger.find(
    (entry) => entry.field === 'powerProtection.UPS_LOAD_RATIO'
  );

  assert.ok(ratioEntry);
  assert.equal(ratioEntry.valueUsed, 0.8);
  assert.match(ratioEntry.reason, /UNSOURCED/i);
});

test('buildPowerProtection returns the required powerProtection fields', () => {
  const ctx = createCtx();

  const result = buildPowerProtection(
    { upsRecommendationLevel: 'prominent' },
    { power: 'frequent' },
    [{ category: 'gateway', sku: { sku: 'GW-1', max_draw_w: 80 }, qty: 1 }],
    ctx
  );

  assert.deepEqual(
    Object.keys(result).sort(),
    ['level', 'text', 'estimatedLoadW', 'minUpsRatingW', 'assumptions'].sort()
  );
  assert.equal(result.level, 'prominent');
  assert.equal(result.estimatedLoadW, 80);
  assert.equal(result.minUpsRatingW, 100);
  assert.ok(Array.isArray(result.assumptions));
});

test('stable power still returns a UPS rating and rationale', () => {
  const ctx = createCtx();

  const result = buildPowerProtection(
    { upsRecommendationLevel: 'advisory' },
    { power: 'stable' },
    [{ category: 'switch', sku: { sku: 'SW-1', max_draw_w: 80 }, qty: 1 }],
    ctx
  );

  assert.equal(result.level, 'advisory');
  assert.equal(result.minUpsRatingW, 100);
  assert.match(result.text, /unexpected power interruptions/i);
});

test('records the unsourced UPS load-ratio assumption in the ledger', () => {
  const ctx = createCtx();

  buildPowerProtection(
    { upsRecommendationLevel: 'advisory' },
    { power: 'stable' },
    [{ category: 'gateway', sku: { sku: 'GW-LEDGER', max_draw_w: 80 }, qty: 1 }],
    ctx
  );

  const entry = ctx.ledger.find(
    (item) => item.field === 'powerProtection.UPS_LOAD_RATIO'
  );

  assert.ok(entry, 'UPS load-ratio ledger entry should exist');
  assert.equal(entry.valueUsed, 0.8);
  assert.match(entry.reason, /UNSOURCED/i);
});

test('POWER_DRAW_UNKNOWN identifies the SKU and warns about understated rating', () => {
  const ctx = createCtx();

  const result = buildPowerProtection(
    { upsRecommendationLevel: 'advisory' },
    { power: 'stable' },
    [{ category: 'gateway', sku: { sku: 'GW-NO-DRAW' }, qty: 1 }],
    ctx
  );

  const flag = ctx.flags.find(
    (item) => item.code === 'POWER_DRAW_UNKNOWN'
  );

  assert.ok(flag, 'POWER_DRAW_UNKNOWN flag should exist');
  assert.match(flag.message, /GW-NO-DRAW/);
  assert.match(flag.message, /may be understated/i);
  assert.equal(result.estimatedLoadW, null);
  assert.equal(result.minUpsRatingW, null);
});

test('stable power rationale is one sentence and UPS remains excluded from costs', () => {
  const result = buildPowerProtection(
    { upsRecommendationLevel: 'advisory' },
    { power: 'stable' },
    [{ category: 'gateway', sku: { sku: 'GW-STABLE', max_draw_w: 80 }, qty: 1 }],
    createCtx()
  );

  assert.match(result.text, /unexpected power interruptions/i);
  assert.match(result.text, /excluded from the bill of materials and cost estimate/i);
});

test('counts hardware controllers but excludes software, cloud, and integrated controllers', () => {
  const ctx = createCtx();

  const result = computePlanLoadW([
    {
      category: 'controller',
      sku: { sku: 'CTRL-HW', controller_type: 'hardware', max_draw_w: 40 },
      qty: 1,
    },
    {
      category: 'controller',
      sku: { sku: 'CTRL-SW', controller_type: 'software', max_draw_w: 30 },
      qty: 1,
    },
    {
      category: 'controller',
      sku: { sku: 'CTRL-CLOUD', controller_type: 'cloud', max_draw_w: 20 },
      qty: 1,
    },
    {
      category: 'controller',
      sku: { sku: 'CTRL-INTEGRATED', controller_type: 'integrated', max_draw_w: 10 },
      qty: 1,
    },
  ], ctx);

  assert.equal(result.estimatedLoadW, 40);
  assert.equal(result.knownDeviceCount, 1);
});

test('counts a standalone firewall', () => {
  const ctx = createCtx();

  const result = computePlanLoadW([
    {
      category: 'firewall',
      sku: { sku: 'FW-STANDALONE', max_draw_w: 60 },
      qty: 1,
    },
  ], ctx);

  assert.equal(result.estimatedLoadW, 60);
  assert.equal(result.knownDeviceCount, 1);
});

test('counts a gateway with firewall capability only once', () => {
  const ctx = createCtx();

  const result = computePlanLoadW([
    {
      category: 'gateway',
      sku: {
        sku: 'GW-FW',
        max_draw_w: 90,
        capabilities: ['router', 'firewall'],
        firewall_specs: { max_power_draw_w: 90 },
      },
      qty: 1,
    },
  ], ctx);

  assert.equal(result.estimatedLoadW, 90);
  assert.equal(result.knownDeviceCount, 1);
});
