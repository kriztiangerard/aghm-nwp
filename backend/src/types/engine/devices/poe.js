
'use strict';

// PoE budget per vendor and plan
// Algorithm Step 3.4
// Consumes: Requirements + chosen AP
// Produces: { perFloor: [{ loadW, budgetW }], apDrawW }
// Rules: pure function (no I/O), constants from params.js.

const { POE_HEADROOM } = require('../params');

function computePoeBudget({ requirements, apSelection, plan, ctx }) {
  if (!requirements || typeof requirements !== 'object') {
    throw new TypeError('requirements must be an object');
  }

  const planKey =
    plan === 'CE' || plan === 'Cost-Efficient'
      ? 'CE'
      : plan === 'HP' || plan === 'High-Performance'
        ? 'HP'
        : null;

  if (!planKey) {
    throw new TypeError('plan must be CE or HP');
  }

  const apCounts = requirements.wireless?.[planKey]?.perFloor;

  if (!Array.isArray(apCounts)) {
    throw new TypeError(`Missing per-floor AP counts for ${planKey}`);
  }

  if (apCounts.some(
    count => !Number.isInteger(count) || count < 0
  )) {
    throw new TypeError('AP counts must be non-negative integers');
  }

  const floorCount = apCounts.length;
  const otherLoadW = requirements.otherPoeLoadW ?? 0;

  if (!Number.isFinite(otherLoadW) || otherLoadW < 0) {
    throw new TypeError('otherPoeLoadW must be non-negative');
  }

  const totalAps = apCounts.reduce((sum, count) => sum + count, 0);

  const sku = apSelection?.ok === true
    ? apSelection.sku
    : null;

  const apSpecs =
    sku?.ap_specs ??
    sku?.access_point_specs ??
    sku;

  const rawDrawW = apSpecs?.max_power_draw_w;

  if (totalAps > 0 && !sku) {
    throw new TypeError(
      'A successful AP selection is required when APs are planned'
    );
  }

  if (
    totalAps > 0 &&
    (!Number.isFinite(rawDrawW) || rawDrawW < 0)
  ) {
    throw new TypeError(
      'Selected AP must have a valid max_power_draw_w'
    );
  }

  const apDrawW = totalAps === 0 ? 0 : rawDrawW;
  const growth = planKey === 'HP' ? requirements.g : 0;

  if (
    planKey === 'HP' &&
    (!Number.isFinite(growth) || growth < 0)
  ) {
    throw new TypeError(
      'requirements.g must be non-negative for HP'
    );
  }

  const headroom = POE_HEADROOM * (1 + growth);

  if (floorCount === 0) {
    return { perFloor: [], apDrawW };
  }

  const otherLoadPerFloor = otherLoadW / floorCount;

  const perFloor = apCounts.map(apCount => {
    const loadW = otherLoadPerFloor + apCount * apDrawW;
    const budgetW = Number((loadW * headroom).toFixed(2));

    return { loadW, budgetW };
  });

  return { perFloor, apDrawW };
}

module.exports = { computePoeBudget };
