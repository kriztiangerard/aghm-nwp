'use strict';
// NWP-ENGINE-006: price provenance for one catalog device. Pure: no I/O and no clock.
//
// pricingRows: this device's Pricing rows, { source_id, is_stale, ... } (database-named fields).
// device:      the Device row, { price, price_updated_at, ... }.
//
// Returns { price_source, is_stale, price_updated_at } for CatalogSku, or null when provenance cannot be stated.
// A null return means "do not guess": the caller sets price to null and omits the three fields, so buildBom
// marks the line unpriced and the total partial.
//
//   price_source   'synchronized' only when EVERY Pricing row came from a pricing source (source_id set);
//                  otherwise 'manual' (a price that includes any hand-entered row is not purely synchronized).
//   is_stale       true only when EVERY Pricing row is flagged stale.
//   price_updated_at  Device.price_updated_at, the last verified date, as an ISO string.

function toIsoString(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return null;
}

function derivePriceProvenance(pricingRows, device) {
  if (!device || device.price === null || device.price === undefined) return null;
  const updatedAt = toIsoString(device.price_updated_at);
  if (updatedAt === null) return null;
  if (!Array.isArray(pricingRows) || pricingRows.length === 0) return null;

  const allStale = pricingRows.every((row) => row && row.is_stale === true);
  const allSynchronized = pricingRows.every((row) => row && row.source_id !== null && row.source_id !== undefined);

  return {
    price_source: allSynchronized ? 'synchronized' : 'manual',
    is_stale: allStale,
    price_updated_at: updatedAt,
  };
}

module.exports = { derivePriceProvenance, toIsoString };