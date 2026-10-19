
'use strict';

const { select } = require('../select.js');
const { wirelessRequirements } = require('../requirements/wireless.js');
const { addFlag } = require('../ctx.js');

function getApSpecs(sku) {
  return sku.ap_specs || sku.apSpecs || sku;
}

function getWifiStandard(sku) {
  const specs = getApSpecs(sku);
  const value = specs.wifi_standard ?? specs.wifiStandard;
  return Number(value);
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
  selectSku = select,
  wirelessRequirementsFn = wirelessRequirements,
}) {
  if (!requirements?.wireless) {
    throw new TypeError('requirements.wireless is required.');
  }

  if (plan !== 'CE' && plan !== 'HP') {
    throw new TypeError("plan must be 'CE' or 'HP'.");
  }

  const target = requirements.wireless.standard;

  const choose = (wireless) =>
    selectSku({
      catalog,
      vendor,
      category: 'access_point',
      constraints: (sku) => matchesGeneration(sku, wireless.standard),
      plan,
      cePick,
      ctx,
    });

  let wireless = requirements.wireless;
  let result = choose(wireless);
  let usedFallback = false;

  if (!result.ok && target === '6E') {
    if (!input) {
      throw new TypeError(
        'input is required to recompute wireless requirements for Wi-Fi 6 fallback.'
      );
    }

    const recalculated = wirelessRequirementsFn(input, ctx, '6');
    wireless = recalculated.wireless || recalculated;

    result = choose(wireless);
    usedFallback = result.ok;
  }

  if (!result.ok) {
    return result;
  }

  const flags = [...(result.flags || [])];

  if (usedFallback) {
    const message = `6E unavailable in ${vendor} at this tier`;
    const flag = { code: 'WIFI_6E_FALLBACK', message };

    flags.push(flag);

    if (ctx) {
      addFlag(ctx, flag.code, flag.message);
    }
  }

  return {
    ...result,
    qty: wireless[plan].total,
    flags,
    maxPowerDrawW: getMaxPowerDrawW(result.sku),
  };
}

module.exports = { selectAccessPoints };
