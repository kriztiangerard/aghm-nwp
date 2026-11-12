'use strict';
// NWP-ENGINE-006: turns raw catalog rows (already read from the database) into validated CatalogSku rows.
// Pure: no I/O and no clock (`now` is passed in). catalog-repository.js is the only file that reads the database.
//
// raw = {
//   vendors:      [{ vendor_id, name }]
//   devices:      [{ device_id, vendor_id, product_line_id, sku, price, price_updated_at, name, description,
//                    is_rack_mountable, u_height, lifecycle_status, eos_date, eol_date }]
//   lines:        [{ product_line_id, vendor_id, category, name, line_rank }]
//   specs:        { gateway, switch, ap, firewall, controller, rack }   each an array of rows keyed by device_id
//   capabilities: [{ device_id, capability_desc }]
//   pricing:      [{ device_id, source_id, price, last_updated, is_stale }]
// }
//
// Returns { catalog, rejected, excluded, lifecycleRulesPending, notes }.
//   catalog                 CatalogSku[] that all pass validateCatalogSku
//   rejected                [{ sku, vendor, field, reason }]  rows that could not be made valid (never silently dropped)
//   excluded                [{ sku, vendor, status, reason }] rows removed because the lifecycle rule says DISCONTINUED
//   lifecycleRulesPending   [{ vendor, status: 'lifecycle rules pending' }]
//   notes                   strings from catalog-mapping.js and from this file (non-fatal)

const { validateCatalogSku } = require('./contracts.js');
const { seedRecordToCatalogSku } = require('./catalog-mapping.js');
const { normalizeStatus, pendingVendors } = require('./lifecycle.js');
const { derivePriceProvenance } = require('./price-provenance.js');
const DEFAULT_RULES = require('./lifecycle-rules.js');

const FIXTURE_VENDOR_ID = 999;        // synthetic edge-case catalog; a test fixture, never returned from production data
const { GENERIC_VENDOR_NAME } = require('./params.js'); // the placeholder Vendor row that owns generic racks and enclosures
const CURRENCY = 'PHP';                // the ERD has no currency column; all catalog prices are PHP

const SPEC_KEYS = ['gateway', 'switch', 'ap', 'firewall', 'controller', 'rack'];
const BLOCK_NAME = Object.freeze({
  gateway: 'gateway_router_specs',
  switch: 'switch_specs',
  ap: 'ap_specs',
  firewall: 'firewall_specs',
  controller: 'controller_specs',
  rack: 'rack_specs',
});
const DB_CATEGORY = Object.freeze({
  gateway: 'gateway_router',
  switch: 'switch',
  ap: 'ap',
  controller: 'controller',
  rack: 'rack',
});
const NULLABLE_SPEC_FIELDS = new Set([
  'idps_throughput_mbps',
  'max_vpn_tunnels',
  'ha_capability',
]);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const hasValue = (value) => value !== undefined && value !== null;

// Keep explicit nulls only for fields the CatalogSku contract marks nullable; other null specs are unknown and omitted.
function cleanBlock(row) {
  const out = {};
  Object.keys(row).forEach((key) => {
    if (key === 'device_id' || row[key] === undefined) return;
    if (row[key] === null && !NULLABLE_SPEC_FIELDS.has(key)) return;
    out[key] = row[key];
  });
  return out;
}

// The Device table has no category column, so the category comes from which specification tables hold a row
// (class-table inheritance). A gateway may also carry switch, controller and firewall blocks (ER7212PC, ER605).
function deriveCategory(present) {
  if (present.has('gateway')) {
    if (present.has('ap') || present.has('rack')) {
      return { ok: false, reason: 'gateway specifications are combined with AP or rack specifications' };
    }
    return { ok: true, category: DB_CATEGORY.gateway };
  }
  const roles = ['controller', 'switch', 'ap', 'rack'].filter((key) => present.has(key));
  if (roles.length > 1) return { ok: false, reason: `ambiguous category: specification rows exist for ${roles.join(', ')}` };
  if (roles.length === 1) return { ok: true, category: DB_CATEGORY[roles[0]] };
  if (present.has('firewall')) {
    return { ok: false, reason: 'a standalone firewall is not a CatalogSku category in contract v3' };
  }
  return { ok: false, reason: 'no specification row found, so the category cannot be determined' };
}

function groupBy(rows, keyOf) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const key = keyOf(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function buildCatalogFromRows(raw, { now, rules = DEFAULT_RULES } = {}) {
  const vendorsById = {};
  (raw.vendors || []).forEach((vendor) => { vendorsById[vendor.vendor_id] = vendor.name; });

  const linesById = new Map();
  const linesByVendorAndName = {};
  (raw.lines || []).forEach((line) => {
    linesById.set(line.product_line_id, line);
    linesByVendorAndName[`${line.vendor_id}|${line.name}`] = { name: line.name, line_rank: line.line_rank };
  });

  const specsByKey = {};
  SPEC_KEYS.forEach((key) => {
    specsByKey[key] = new Map(((raw.specs && raw.specs[key]) || []).map((row) => [row.device_id, row]));
  });
  const capabilitiesByDevice = groupBy(raw.capabilities, (row) => row.device_id);
  const pricingByDevice = groupBy(raw.pricing, (row) => row.device_id);

  const catalog = [];
  const rejected = [];
  const excluded = [];
  const notes = [];
  const seenVendors = new Set();

  (raw.devices || []).forEach((device) => {
    if (device.vendor_id === FIXTURE_VENDOR_ID) return;

    const vendorName = vendorsById[device.vendor_id];
    const label = isNonEmptyString(device.sku) ? device.sku : `device_id ${device.device_id}`;
    const reject = (field, reason) => rejected.push({ sku: label, vendor: vendorName || null, field, reason });

    if (!isNonEmptyString(vendorName)) { reject('vendor', `no Vendor row for vendor_id ${device.vendor_id}`); return; }
    seenVendors.add(vendorName);
    if (!isNonEmptyString(device.sku)) { reject('sku', 'sku is missing'); return; }
    if (!isNonEmptyString(device.name)) { reject('name', 'name is missing'); return; }

    const present = new Set(SPEC_KEYS.filter((key) => specsByKey[key].has(device.device_id)));
    const category = deriveCategory(present);
    if (!category.ok) { reject('category', category.reason); return; }

    // Generic racks and enclosures appear only in the enclosure category.
    if (vendorName.trim().toLowerCase() === GENERIC_VENDOR_NAME.toLowerCase() && category.category !== DB_CATEGORY.rack) {
      reject('category', `the ${vendorName} vendor may only supply racks and enclosures`);
      return;
    }

    const normalized = normalizeStatus({
      vendor: vendorName,
      lifecycle_status: device.lifecycle_status,
      eos_date: device.eos_date,
      eol_date: device.eol_date,
    }, now, rules);
    if (!normalized.ok) { reject(normalized.field, normalized.reason); return; }
    if (normalized.status === 'DISCONTINUED') {
      excluded.push({ sku: device.sku, vendor: vendorName, status: 'DISCONTINUED', reason: 'Discontinued under the vendor lifecycle rule' });
      return;
    }

    const blocks = {};
    present.forEach((key) => { blocks[BLOCK_NAME[key]] = cleanBlock(specsByKey[key].get(device.device_id)); });
    // A gateway repeats some columns in its firewall block (lan_ports, wan_ports, max_power_draw_w). catalog-mapping.js
    // throws when two blocks disagree, so the gateway block wins and a difference is noted.
    if (blocks.firewall_specs && blocks.gateway_router_specs) {
      Object.keys(blocks.firewall_specs).forEach((key) => {
        if (!(key in blocks.gateway_router_specs)) return;
        if (blocks.gateway_router_specs[key] !== blocks.firewall_specs[key]) {
          notes.push(`${device.sku}: firewall_specs.${key} (${blocks.firewall_specs[key]}) differs from the gateway value (${blocks.gateway_router_specs[key]}); the gateway value is used.`);
        }
        delete blocks.firewall_specs[key];
      });
    }

    const record = {
      vendor_id: device.vendor_id,
      sku: device.sku,
      category: category.category,
      price: hasValue(device.price) ? device.price : null,
      name: device.name,
      lifecycle_status: normalized.status,
      ...blocks,
    };
    ['description', 'is_rack_mountable', 'u_height', 'eos_date', 'eol_date'].forEach((key) => {
      if (hasValue(device[key])) record[key] = device[key];
    });
    const capabilities = (capabilitiesByDevice.get(device.device_id) || []).map((row) => row.capability_desc).filter(isNonEmptyString).sort();
    if (capabilities.length > 0) record.capabilities = capabilities;

    if (hasValue(device.product_line_id)) {
      const line = linesById.get(device.product_line_id);
      if (!line) { reject('product_line_id', `no product_line row for product_line_id ${device.product_line_id}`); return; }
      record.product_line = line.name;
    }

    let mapped;
    try {
      mapped = seedRecordToCatalogSku(record, { vendorsById, linesByVendorAndName, currency: CURRENCY });
    } catch (error) {
      reject('mapping', error.message);
      return;
    }

    const sku = mapped.sku;
    const provenance = derivePriceProvenance(pricingByDevice.get(device.device_id) || [], device);
    if (provenance) {
      Object.assign(sku, provenance);
    } else {
      sku.price = null; // no Pricing rows or no verified date: unpriced, provenance omitted rather than guessed
    }

    try {
      validateCatalogSku(sku);
    } catch (error) {
      reject(error.field || 'validation', error.message);
      return;
    }

    mapped.notes.forEach((note) => notes.push(note));
    catalog.push(sku);
  });

  return {
    catalog,
    rejected,
    excluded,
    lifecycleRulesPending: pendingVendors(Array.from(seenVendors), rules),
    notes,
  };
}

module.exports = { buildCatalogFromRows, deriveCategory, FIXTURE_VENDOR_ID, GENERIC_VENDOR_NAME, CURRENCY };