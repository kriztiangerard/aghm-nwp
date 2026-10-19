
'use strict';

const { selectSku: defaultSelectSku } = require('../select.js');
const { wirelessRequirements } = require('../requirements/wireless.js');
const { addFlag } = require('../ctx.js');

function getApSpecs(sku) {
  return sku.ap_specs || sku.apSpecs || sku;
}

function getWifiStandard(sku) {
  const specs = getApSpecs(sku);
  return Number(specs.wifi_standard ?? specs.wifiStandard);
}

function supports6Ghz(sku) {
  const specs = getApSpecs(sku);
  return (specs.supported_6ghz ?? specs.supported6Ghz) === true;
}

function getMaxPowerDrawW(sku) {
  const specs = getApSpecs(sku);
  return specs.max_power_draw_w ?? specs.maxPowerDrawW ?? null;
}

function matchesGeneration(sku, target) {
  const standard = getWifiStandard(sku);

  if (!Number.isFinite(standard)) {
    return false;
  }

  if (target === '6E') {
    return standard === 6 && supports6Ghz(sku);
  }

  if (target === '6') {
    return standard === 6 && !supports6Ghz(sku);
  }

  return false;
}

function selectAccessPoints({
  catalog,
  vendor,
  requirements,
  plan,
  cePick,
  ctx,
  input,
  selectSku = defaultSelectSku,
  wirelessRequirementsFn = wirelessRequirements,
}) {
  if (!Array.isArray(catalog)) {
    throw new TypeError('catalog must be an array.');
  }

  if (!requirements || !requirements.wireless) {
    throw new TypeError('requirements.wireless is required.');
  }

  if (plan !== 'CE' && plan !== 'HP') {
    throw new TypeError('plan must be CE or HP.');
  }

  if (!ctx) {
    throw new TypeError('ctx is required.');
  }

  const target = requirements.wireless.standard;

  // ENGINE-007 accepts normalized plan names.
  const selectionPlan =
    plan === 'CE' ? 'cost_efficient' : 'high_performance';

  // ENGINE-007 expects a SKU, not a SelectionResult wrapper.
  const ceSku = cePick?.sku ?? cePick;

  const choose = (wireless) => {
    const planRequirements = wireless[plan];

    if (!planRequirements || !Number.isFinite(planRequirements.total)) {
      throw new TypeError(
        `requirements.wireless.${plan}.total must be a number.`
      );
    }

    const pool = catalog.filter(
      (sku) =>
        sku.vendor === vendor &&
        sku.category === 'access_point'
    );

    return selectSku({
      pool,
      predicate: (sku) =>
        matchesGeneration(sku, wireless.standard),
      plan: selectionPlan,
      category: 'access_point',
      vendor,
      ctx,
      qty: planRequirements.total,
      cePick: ceSku,
    });
  };

  let wireless = requirements.wireless;
  let result = choose(wireless);
  let usedFallback = false;

  // If no qualifying 6E AP is available, recalculate using Wi-Fi 6.
  if (!result.ok && target === '6E') {
    if (!input) {
      throw new TypeError(
        'input is required to recalculate wireless requirements for Wi-Fi 6 fallback.'
      );
    }

    const recalculated = wirelessRequirementsFn(input, ctx, '6');

    wireless = recalculated.wireless || recalculated;

    if (!wireless || !wireless[plan]) {
      throw new TypeError(
        'Wireless requirements recalculation returned an invalid result.'
      );
    }

    result = choose(wireless);
    usedFallback = result.ok;
  }

  if (!result.ok) {
    return result;
  }

  const flags = [...(result.flags || [])];

  if (usedFallback) {
    const flag = {
      code: 'WIFI_6E_FALLBACK',
      message: `6E unavailable in ${vendor} at this tier`,
    };

    flags.push(flag);
    addFlag(ctx, flag.code, flag.message);
  }

  return {
    ...result,
    qty: wireless[plan].total,
    flags,
    maxPowerDrawW: getMaxPowerDrawW(result.sku),
  };
}

module.exports = {
  selectAccessPoints,
};
