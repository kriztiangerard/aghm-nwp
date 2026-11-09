'use strict';

const {
  ValidationError,
  validateCatalogSku,
  validateBom,
} = require('./contracts');
const { GENERIC_VENDOR_NAME } = require('./params');

const BOM_CATEGORIES = new Set([
  'gateway',
  'controller',
  'switch',
  'access_point',
  'enclosure',
]);

const CATEGORY_ORDER = [
  'gateway',
  'controller',
  'switch',
  'access_point',
  'enclosure',
];

function toMoney(cents) {
  return cents / 100;
}

function buildBom(plan, catalog) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new ValidationError('plan', 'Must be a plan object.');
  }

  if (!Array.isArray(plan.items)) {
    throw new ValidationError('plan.items', 'Must be an array.');
  }

  if (!Array.isArray(catalog)) {
    throw new ValidationError('catalog', 'Must be a catalog snapshot array.');
  }

  const selected = new Map();

  plan.items.forEach((item, index) => {
    const path = `plan.items[${index}]`;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ValidationError(path, 'Must be an equipment item object.');
    }

    if (!BOM_CATEGORIES.has(item.category)) {
      throw new ValidationError(
        `${path}.category`,
        'Must be one of gateway, controller, switch, access_point, enclosure.',
      );
    }

    if (typeof item.sku !== 'string' || item.sku.trim().length === 0) {
      throw new ValidationError(`${path}.sku`, 'Must be a non-empty string.');
    }

    if (!Number.isInteger(item.qty) || item.qty < 0) {
      throw new ValidationError(
        `${path}.qty`,
        'Must be a non-negative integer.',
      );
    }

    if (item.qty === 0) return;

    const key = JSON.stringify([item.category, item.sku]);
    const existing = selected.get(key);

    if (existing) {
      existing.qty += item.qty;
      if (!Number.isSafeInteger(existing.qty)) {
        throw new ValidationError(`${path}.qty`, 'Aggregated quantity is too large.');
      }
    } else {
      selected.set(key, {
        category: item.category,
        sku: item.sku,
        qty: item.qty,
      });
    }
  });

  const lines = [];
  const currencies = new Set();

  for (const item of selected.values()) {
    const matches = catalog.filter(
      (row) => row && row.category === item.category && row.sku === item.sku,
    );

    if (matches.length === 0) {
      throw new ValidationError(
        `plan.items.${item.category}.${item.sku}`,
        `Selected SKU '${item.sku}' was not found in the supplied catalog snapshot.`,
      );
    }

    if (matches.length > 1) {
      throw new ValidationError(
        `catalog.${item.sku}`,
        `Selected SKU '${item.sku}' has multiple matching catalog rows.`,
      );
    }

    const sku = matches[0];
    validateCatalogSku(sku);

    if (sku.status === 'DISCONTINUED') {
      throw new ValidationError(
        `catalog.${item.sku}.status`,
        `Selected SKU '${item.sku}' is discontinued.`,
      );
    }

    if (sku.vendor === GENERIC_VENDOR_NAME && sku.category !== 'enclosure') {
      throw new ValidationError(
        `catalog.${item.sku}.vendor`,
        'Generic catalog equipment is only supported for enclosures.',
      );
    }

    currencies.add(sku.currency);

    const unitPriceCents =
      sku.price === null ? null : Math.round(sku.price * 100);
    const lineTotalCents =
      unitPriceCents === null ? null : unitPriceCents * item.qty;

    if (
      unitPriceCents !== null &&
      (!Number.isSafeInteger(unitPriceCents) ||
        !Number.isSafeInteger(lineTotalCents))
    ) {
      throw new ValidationError(
        `catalog.${item.sku}.price`,
        'Price calculation exceeds the safe integer range.',
      );
    }

    const line = {
      category: sku.category,
      sku: sku.sku,
      name: sku.name,
      vendor: sku.vendor,
      qty: item.qty,
      unitPrice:
        unitPriceCents === null ? null : toMoney(unitPriceCents),
      lineTotal:
        lineTotalCents === null ? null : toMoney(lineTotalCents),
      status: sku.status,
      isGeneric: sku.vendor === GENERIC_VENDOR_NAME,
    };

    if (sku.price_source !== undefined) {
      line.priceSource = sku.price_source;
    }
    if (sku.is_stale !== undefined) {
      line.isStale = sku.is_stale;
    }
    if (sku.price_updated_at !== undefined) {
      line.priceUpdatedAt = sku.price_updated_at;
    }

    lines.push({ ...line, _unitPriceCents: unitPriceCents, _lineTotalCents: lineTotalCents });
  }

  if (currencies.size > 1) {
    throw new ValidationError(
      'bom.currency',
      `All selected catalog items must use one currency; found ${[...currencies].sort().join(', ')}.`,
    );
  }

  lines.sort((a, b) => {
    const categoryDifference =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return categoryDifference || a.sku.localeCompare(b.sku);
  });

  const hasUnpricedLine = lines.some((line) => line._unitPriceCents === null);
  const pricedLines = lines.filter((line) => line._lineTotalCents !== null);
  const totalCents = pricedLines.reduce(
    (sum, line) => sum + line._lineTotalCents,
    0,
  );

  if (!Number.isSafeInteger(totalCents)) {
    throw new ValidationError('bom.total', 'Total exceeds the safe integer range.');
  }

  const bom = {
    currency: currencies.size === 0 ? 'PHP' : [...currencies][0],
    lines: lines.map(({ _unitPriceCents, _lineTotalCents, ...line }) => line),
    total: pricedLines.length === 0 ? null : toMoney(totalCents),
    totalIsPartial:
      lines.length === 0 ||
      hasUnpricedLine ||
      (Array.isArray(plan.unmet) && plan.unmet.length > 0),
  };

  validateBom(bom);
  return bom;
}

module.exports = {
  buildBom,
  assembleBom: buildBom,
};
