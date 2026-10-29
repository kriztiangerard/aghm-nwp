
'use strict';

// Enclosure sizing
// Algorithm Step 3.7
// Racks and cabinets come from the shared infrastructure catalog.

const { addFlag } = require('../ctx.js');

const params = require('../params.js');
const { addLedger } = require('../ctx.js');

const { addUnmet } = require('../ctx.js');
const {
  validateSelectionResult,
} = require('../contracts.js');

/**
 * Calculates rack units required by the selected plan items.
 *
 * Missing rack_units: unknown height; exclude from total and flag.
 * rack_units === 0: not rack-mountable; exclude and flag.
 */

function computeRequiredRackUnits(planItems, ctx) {
  let requiredU = 0;

  for (const item of planItems) {
    const sku = item.sku;
    const qty = item.qty;

    const isRackRelevant =
      sku.category === 'gateway' ||
      sku.category === 'switch' ||
      sku.category === 'firewall' ||
      (sku.category === 'controller' &&
        sku.controller_type === 'hardware');

    if (!isRackRelevant) {
      continue;
    }

    if (sku.rack_units === undefined || sku.rack_units === null) {
      addFlag(
        ctx,
        'RACK_UNITS_UNKNOWN',
        `Rack units are unknown for SKU ${sku.sku}.`,
      );
      continue;
    }

    if (sku.rack_units === 0) {
      addFlag(
        ctx,
        'DEVICE_NOT_RACK_MOUNTABLE',
        `SKU ${sku.sku} requires shelf or wall placement.`,
      );
      continue;
    }

    requiredU += sku.rack_units * qty;
  }

  return { requiredU };
}


function resolveHousingType(housing, requiredU, ctx) {
  if (housing === 'closet') {
    return 'rack';
  }

  if (housing === 'wall') {
    return 'wall';
  }

  if (housing === 'notSure') {
    const valueUsed =
      requiredU <= params.WALL_CABINET_MAX_U ? 'wall' : 'rack';

    const reason =
      valueUsed === 'wall'
        ? `Required ${requiredU}U fits within the ${params.WALL_CABINET_MAX_U}U wall cabinet threshold.`
        : `Required ${requiredU}U exceeds the ${params.WALL_CABINET_MAX_U}U wall cabinet threshold.`;

    addLedger(ctx, 'housing', valueUsed, reason);

    return valueUsed;
  }

  throw new Error(`Unsupported housing preference: ${housing}`);
}

function chooseEnclosure({
  requirements,
  devices,
  ctx,
  catalog = [],
  vendor,
  plan,
  housing,
  requiredU,
}) {
  if (!ctx || !Array.isArray(ctx.unmet)) {
    throw new Error('chooseEnclosure: ctx from createCtx() is required');
  }

  if (!Array.isArray(catalog)) {
    throw new TypeError('chooseEnclosure: catalog must be an array');
  }

  if (requiredU === 0) {
    addLedger(
      ctx,
      'enclosure',
      null,
      'No rack-mountable devices were selected; no enclosure is required.',
    );

    const result = {
      ok: true,
      sku: {
        sku: 'NO-ENCLOSURE',
        vendor: params.GENERIC_VENDOR_NAME,
        name: 'No enclosure required',
        category: 'enclosure',
        status: 'ACTIVE',
        price: 0,
        rack_units: 1,
        form_factor: housing === 'wall' ? 'wall' : 'rack',
      },
      qty: 0,
      flags: [],
    };

    validateSelectionResult(result);
    return result;
  }

  const housingType = resolveHousingType(housing, requiredU, ctx);

  const candidates = catalog
    .filter((sku) =>
      sku.category === 'enclosure' &&
      sku.vendor === params.GENERIC_VENDOR_NAME &&
      sku.form_factor === housingType &&
      sku.price !== null &&
      sku.price !== undefined &&
      Number.isFinite(sku.price) &&
      sku.price >= 0 &&
      Number.isInteger(sku.rack_units) &&
      sku.rack_units >= requiredU &&
      ['ACTIVE', 'SUNSETTING'].includes(sku.status),
    )
    .sort((a, b) =>
      a.rack_units - b.rack_units ||
      a.price - b.price ||
      a.sku.localeCompare(b.sku),
    );

  if (candidates.length === 0) {
    const reason =
      `No priced generic ${housingType} enclosure can accommodate ${requiredU}U.`;

    addUnmet(ctx, 'enclosure', vendor, reason);

    const result = {
      ok: false,
      unmet: {
        category: 'enclosure',
        vendor,
        reason,
      },
    };

    validateSelectionResult(result);
    return result;
  }

  const flags = [{
    code: 'ENCLOSURE_GENERIC',
    message: 'A generic enclosure was selected.',
  }];

  const result = {
    ok: true,
    sku: candidates[0],
    qty: 1,
    flags,
  };

  addFlag(ctx, 'ENCLOSURE_GENERIC', flags[0].message);

  validateSelectionResult(result);
  return result;
}

module.exports = {
  computeRequiredRackUnits,
  resolveHousingType,
  chooseEnclosure,
};
