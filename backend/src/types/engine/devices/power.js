'use strict';
// Power-protection recommendation (advisory only)
// Algorithm Step 3.8
// Consumes: normalized input, requirements, selected plan items
// Produces: recommendation text, level, estimated load, and minimum UPS rating
// Rules: pure function (no I/O).

const { UPS_LOAD_RATIO } = require('../params');
const { addLedger, addFlag } = require('../ctx');

function recommendPower({ input }) {
  const upsRecommendationLevel =
    input.power === 'frequent'
      ? 'prominent'
      : 'advisory';

  return {
    upsRecommendation: 'UPS recommended for network equipment.',
    upsRecommendationLevel,
  };
}

function computePlanLoadW(planItems, ctx, catalog = []) {
  const countedCategories = new Set([
    'gateway',
    'switch',
    'controller',
    'firewall',
  ]);

  const excludedCategories = new Set([
    'access_point',
    'ap',
    'optic',
    'enclosure',
  ]);

  const catalogBySku = new Map(
    catalog.map((device) => [device.sku, device])
  );

  let estimatedLoadW = 0;
  let knownDeviceCount = 0;
  const flaggedUnknownSkus = new Set();

  for (const item of planItems || []) {
    if (!item || excludedCategories.has(item.category)) continue;
    if (!countedCategories.has(item.category)) continue;

    const sku =
      item.sku && typeof item.sku === 'object'
        ? item.sku
        : catalogBySku.get(item.sku) || item;

    const skuName = sku.sku || item.sku || 'unknown SKU';

    // Only standalone hardware controllers contribute separate device load.
    // Software, cloud, and integrated controllers are not separate appliances.
    if (item.category === 'controller' && sku.controller_type !== 'hardware') {
      if (!sku.controller_type && !flaggedUnknownSkus.has(skuName)) {
        addFlag(
          ctx,
          'POWER_DRAW_UNKNOWN',
          `Cannot determine power draw for ${skuName}: controller type is missing. UPS rating may be understated.`
        );
        flaggedUnknownSkus.add(skuName);
      }
      continue;
    }

    const qty = item.qty;

    if (!Number.isInteger(qty) || qty <= 0) {
      if (!flaggedUnknownSkus.has(skuName)) {
        addFlag(
          ctx,
          'POWER_DRAW_UNKNOWN',
          `Cannot estimate power draw for ${skuName}: quantity is missing or invalid. UPS rating may be understated.`
        );
        flaggedUnknownSkus.add(skuName);
      }
      continue;
    }

    if (
      typeof sku.max_draw_w !== 'number' ||
      !Number.isFinite(sku.max_draw_w) ||
      sku.max_draw_w < 0
    ) {
      if (!flaggedUnknownSkus.has(skuName)) {
        addFlag(
          ctx,
          'POWER_DRAW_UNKNOWN',
          `Maximum power draw is unavailable for ${skuName}. UPS rating may be understated.`
        );
        flaggedUnknownSkus.add(skuName);
      }
      continue;
    }

    estimatedLoadW += sku.max_draw_w * qty;
    knownDeviceCount += 1;
  }

  addLedger(
    ctx,
    'powerProtection.estimatedLoadW',
    estimatedLoadW,
    'Sum of maximum power draw multiplied by quantity for selected gateways, switches, controllers, and standalone firewalls. Access points and other PoE devices are excluded because their load is represented by switch draw.'
  );

  return {
    estimatedLoadW: knownDeviceCount > 0 ? estimatedLoadW : null,
    knownDeviceCount,
  };
}

function buildPowerProtection(reqs, input, planItems, ctx, catalog = []) {
  const level = reqs?.upsRecommendationLevel ?? 'advisory';

  if (reqs?.upsRecommendationLevel === undefined) {
    addLedger(
      ctx,
      'upsRecommendationLevel',
      'advisory',
      'Defaulted to advisory because the requirements did not provide a UPS recommendation level.'
    );
  }

  const { estimatedLoadW, knownDeviceCount } = computePlanLoadW(
    planItems,
    ctx,
    catalog
  );

  const UPS_RATIO_BASIS_POINTS = Math.round(UPS_LOAD_RATIO * 10000);

  const minUpsRatingW =
    estimatedLoadW === null
      ? null
      : Math.ceil(
          (estimatedLoadW * 10000) / UPS_RATIO_BASIS_POINTS
        );

  addLedger(
    ctx,
    'powerProtection.UPS_LOAD_RATIO',
    UPS_LOAD_RATIO,
    'UNSOURCED planning assumption (params.js UPS_LOAD_RATIO): estimated equipment load must not exceed 80% of the UPS power rating; verify against a selected UPS manufacturer specification.'
  );

  if (minUpsRatingW !== null) {
    addLedger(
      ctx,
      'powerProtection.minUpsRatingW',
      minUpsRatingW,
      'Minimum UPS rating calculated from estimated equipment load divided by the configured load ratio.'
    );
  }

  const rationale =
    input?.power === 'stable'
      ? 'A UPS is still recommended to protect network equipment from unexpected power interruptions.'
      : 'A UPS is recommended to help protect network equipment during power interruptions.';

  const text =
    `${level === 'prominent' ? 'UPS recommendation: ' : ''}${rationale} ` +
    'The UPS is advisory only and is excluded from the bill of materials and cost estimate.';

  return {
    level,
    text,
    estimatedLoadW,
    minUpsRatingW,
    assumptions: knownDeviceCount === 0
      ? ['No eligible device with a known maximum power draw was available for the load estimate.']
      : [],
  };
}

module.exports = {
  recommendPower,
  computePlanLoadW,
  buildPowerProtection,
};