'use strict';
// NWP-ENGINE-006 acceptance criteria, proven end to end through buildCatalogFromRows (the export the repository uses).
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCatalogFromRows } = require('../../src/types/engine/catalog-export.js');
const { validateCatalogSku } = require('../../src/types/engine/contracts.js');

const NOW = '2026-11-12';
const VENDORS = [
  { vendor_id: 1, name: 'Cisco Business' },
  { vendor_id: 2, name: 'Ubiquiti UniFi' },
  { vendor_id: 3, name: 'Grandstream GWN Cloud' },
];
const LINES = VENDORS.map((v) => ({ product_line_id: v.vendor_id * 10, vendor_id: v.vendor_id, category: 'switch', name: `${v.name} switches`, line_rank: 1 }));

let nextId = 100;
// One switch device with its spec row. `over` overrides Device columns; `pricing` is the list of Pricing rows for it.
function switchDevice(vendorId, sku, over = {}) {
  const id = nextId++;
  return {
    device: { device_id: id, vendor_id: vendorId, product_line_id: vendorId * 10, sku, name: `${sku} name`, price: 1000, price_updated_at: '2026-11-01T00:00:00Z', is_rack_mountable: false, u_height: 0, lifecycle_status: 'ACTIVE', eos_date: null, eol_date: null, ...over },
    spec: { device_id: id, port_count: 8, layer: 2 },
    pricing: [{ device_id: id, source_id: 1, price: 1000, last_updated: '2026-11-01', is_stale: false }],
  };
}

function exportOf(entries, { pricing } = {}) {
  const raw = {
    vendors: VENDORS, lines: LINES, capabilities: [],
    devices: entries.map((e) => e.device),
    specs: { gateway: [], switch: entries.map((e) => e.spec), ap: [], firewall: [], controller: [], rack: [] },
    pricing: pricing || entries.flatMap((e) => e.pricing),
  };
  return buildCatalogFromRows(raw, { now: NOW });
}
const find = (result, sku) => result.catalog.find((s) => s.sku === sku);

// ---------------------------------------------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------------------------------------------

test('Cisco SKU past EOS but before LDOS is SUNSETTING and stays in the catalog', () => {
  const r = exportOf([
    switchDevice(1, 'CBS-SUNSET', { eos_date: '2026-01-01', eol_date: '2030-01-01' }),   // past EOS, support window still open
    switchDevice(1, 'CBS-CURRENT', { eos_date: '2030-01-01', eol_date: '2033-01-01' }),  // not yet EOS
  ]);
  assert.equal(find(r, 'CBS-SUNSET').status, 'SUNSETTING');
  assert.equal(find(r, 'CBS-CURRENT').status, 'ACTIVE');
  assert.ok(!r.excluded.some((x) => x.sku === 'CBS-SUNSET'), 'a SUNSETTING SKU is not excluded');
  assert.ok(!r.rejected.some((x) => x.sku === 'CBS-SUNSET'), 'a SUNSETTING SKU is not rejected');
});

test('Cisco SKU past LDOS is DISCONTINUED and excluded (the boundary of the previous case)', () => {
  const r = exportOf([switchDevice(1, 'CBS-DEAD', { eos_date: '2020-01-01', eol_date: '2025-01-01' })]);
  assert.equal(find(r, 'CBS-DEAD'), undefined);
  assert.deepEqual(r.excluded.map((x) => [x.sku, x.status]), [['CBS-DEAD', 'DISCONTINUED']]);
});

test('UniFi SKU marked Legacy becomes DISCONTINUED and is excluded; a current UniFi SKU stays', () => {
  const r = exportOf([
    switchDevice(2, 'UNIFI-LEGACY', { lifecycle_status: 'Legacy' }),
    switchDevice(2, 'UNIFI-CURRENT', { lifecycle_status: 'ACTIVE' }),
  ]);
  assert.equal(find(r, 'UNIFI-LEGACY'), undefined);
  assert.deepEqual(r.excluded.map((x) => [x.sku, x.vendor, x.status]), [['UNIFI-LEGACY', 'Ubiquiti UniFi', 'DISCONTINUED']]);
  assert.equal(find(r, 'UNIFI-CURRENT').status, 'ACTIVE');
});

test('an unresearched vendor keeps each SKU\'s stored status, whatever its dates say, and is reported as pending', () => {
  const r = exportOf([
    switchDevice(3, 'GWN-STORED-SUNSET', { lifecycle_status: 'SUNSETTING', eos_date: '2030-01-01' }),
    switchDevice(3, 'GWN-STORED-ACTIVE', { lifecycle_status: 'ACTIVE', eos_date: '2020-01-01', eol_date: '2021-01-01' }),  // dates are past: a researched vendor would drop it
  ]);
  assert.equal(find(r, 'GWN-STORED-SUNSET').status, 'SUNSETTING');
  assert.equal(find(r, 'GWN-STORED-ACTIVE').status, 'ACTIVE');
  assert.deepEqual(r.excluded, []);
  assert.deepEqual(r.lifecycleRulesPending, [{ vendor: 'Grandstream GWN Cloud', status: 'lifecycle rules pending' }]);
});

test('researched vendors are not reported as pending', () => {
  const r = exportOf([switchDevice(1, 'CBS-1'), switchDevice(2, 'UNIFI-1'), switchDevice(3, 'GWN-1')]);
  assert.deepEqual(r.lifecycleRulesPending.map((p) => p.vendor), ['Grandstream GWN Cloud']);
});

// ---------------------------------------------------------------------------------------------------------------
// Missing required fields and invalid rows
// ---------------------------------------------------------------------------------------------------------------

const required = [
  ['sku',      (e) => { e.device.sku = null; },                 (e) => `device_id ${e.device.device_id}`],
  ['name',     (e) => { e.device.name = ''; },                  (e) => e.device.sku],
  ['status',   (e) => { e.device.lifecycle_status = null; },    (e) => e.device.sku],
  ['vendor',   (e) => { e.device.vendor_id = 77; },             (e) => e.device.sku],
  ['category', (e) => { e.spec.device_id = -1; },               (e) => e.device.sku],   // no *_specifications row: category cannot be derived
];
for (const [field, breakIt, labelOf] of required) {
  test(`a row missing ${field} is recorded in rejected (SKU and field named) and not exported`, () => {
    const bad = switchDevice(1, 'BAD-ROW');
    const good = switchDevice(1, 'GOOD-ROW');
    breakIt(bad);
    const r = exportOf([bad, good]);
    assert.equal(r.rejected.length, 1);
    assert.equal(r.rejected[0].sku, labelOf(bad));
    assert.equal(r.rejected[0].field, field);
    assert.equal(typeof r.rejected[0].reason, 'string');
    assert.deepEqual(r.catalog.map((s) => s.sku), ['GOOD-ROW']);
  });
}

test('rows that fail validation never enter the catalog, and every exported row passes validateCatalogSku', () => {
  const negativePrice = switchDevice(1, 'NEG-PRICE', { price: -5 });
  const noLine = switchDevice(1, 'NO-LINE', { product_line_id: null });   // a switch needs its product line
  const good = switchDevice(1, 'GOOD-ROW');
  const r = exportOf([negativePrice, noLine, good]);

  assert.deepEqual(r.catalog.map((s) => s.sku), ['GOOD-ROW']);
  assert.deepEqual(r.rejected.map((x) => x.sku).sort(), ['NEG-PRICE', 'NO-LINE']);
  r.rejected.forEach((x) => { assert.ok(x.field && x.reason, 'each rejection names a field and a reason'); });
  r.catalog.forEach((sku) => assert.equal(validateCatalogSku(sku), true));
});

test('nullable gateway specifications remain unknown in the exported catalog', () => {
  const entry = switchDevice(1, 'UNKNOWN-GATEWAY-SPECS');
  const r = buildCatalogFromRows({
    vendors: VENDORS,
    lines: LINES,
    devices: [entry.device],
    specs: {
      gateway: [{
        device_id: entry.device.device_id,
        wan_ports: 2,
        lan_ports: 4,
        idps_throughput_mbps: null,
        max_vpn_tunnels: null,
        ha_capability: null,
      }],
      switch: [],
      ap: [],
      firewall: [],
      controller: [],
      rack: [],
    },
    capabilities: [],
    pricing: entry.pricing,
  }, { now: NOW });

  const sku = find(r, 'UNKNOWN-GATEWAY-SPECS');
  assert.equal(sku.idps_throughput_mbps, null);
  assert.equal(sku.max_vpn_tunnels, null);
  assert.equal(sku.ha_capability, null);
  assert.equal(validateCatalogSku(sku), true);
});

test('a missing SFP count does not become zero or fabricate a copper-port count', () => {
  const entry = switchDevice(1, 'UNKNOWN-SFP-COUNT');
  entry.spec.sfp_ports = null;
  const r = exportOf([entry]);
  const sku = find(r, 'UNKNOWN-SFP-COUNT');

  assert.equal(sku.port_count, 8);
  assert.equal('sfp_ports' in sku, false);
  assert.equal('copper_ports' in sku, false);
  assert.equal(validateCatalogSku(sku), true);
});

test('every device is accounted for: exported, rejected or excluded, never silently dropped', () => {
  const entries = [
    switchDevice(1, 'A-OK'),
    switchDevice(1, 'B-EXCLUDED', { eos_date: '2020-01-01', eol_date: '2025-01-01' }),
    switchDevice(1, 'C-REJECTED', { name: null }),
  ];
  const r = exportOf(entries);
  assert.equal(r.catalog.length + r.rejected.length + r.excluded.length, entries.length);
});

// ---------------------------------------------------------------------------------------------------------------
// Price: missing data
// ---------------------------------------------------------------------------------------------------------------

const PROVENANCE_KEYS = ['price_source', 'is_stale', 'price_updated_at'];
const assertUnpriced = (sku) => {
  assert.equal(sku.price, null);
  PROVENANCE_KEYS.forEach((key) => assert.ok(!(key in sku), `${key} must be omitted, not guessed`));
};

test('a device with no Pricing rows gets price null and no provenance', () => {
  const entry = switchDevice(1, 'NO-PRICING');
  const r = exportOf([entry], { pricing: [] });
  assertUnpriced(find(r, 'NO-PRICING'));
});

test('a device with Pricing rows but no verified price date gets price null and no provenance', () => {
  const r = exportOf([switchDevice(1, 'NO-DATE', { price_updated_at: null })]);
  assertUnpriced(find(r, 'NO-DATE'));
});

test('a device with Pricing rows but no price gets price null and no provenance', () => {
  const r = exportOf([switchDevice(1, 'NO-PRICE', { price: null })]);
  assertUnpriced(find(r, 'NO-PRICE'));
});

// ---------------------------------------------------------------------------------------------------------------
// Price provenance rules
// ---------------------------------------------------------------------------------------------------------------

const withPricing = (sku, rows, over = {}) => {
  const entry = switchDevice(1, sku, over);
  entry.pricing = rows.map((row) => ({ device_id: entry.device.device_id, price: 1000, last_updated: '2026-11-01', ...row }));
  return entry;
};

test('price_source is synchronized only when every Pricing row has a source; any manual row makes it manual', () => {
  const r = exportOf([
    withPricing('ALL-SYNC',  [{ source_id: 1, is_stale: false }, { source_id: 2, is_stale: false }]),
    withPricing('ONE-MANUAL', [{ source_id: 1, is_stale: false }, { source_id: null, is_stale: false }]),
    withPricing('ALL-MANUAL', [{ source_id: null, is_stale: false }]),
  ]);
  assert.equal(find(r, 'ALL-SYNC').price_source, 'synchronized');
  assert.equal(find(r, 'ONE-MANUAL').price_source, 'manual');
  assert.equal(find(r, 'ALL-MANUAL').price_source, 'manual');
});

test('is_stale is true only when every Pricing row for the device is stale', () => {
  const r = exportOf([
    withPricing('ALL-STALE',  [{ source_id: 1, is_stale: true }, { source_id: 2, is_stale: true }]),
    withPricing('SOME-STALE', [{ source_id: 1, is_stale: true }, { source_id: 2, is_stale: false }]),
    withPricing('NONE-STALE', [{ source_id: 1, is_stale: false }]),
  ]);
  assert.equal(find(r, 'ALL-STALE').is_stale, true);
  assert.equal(find(r, 'SOME-STALE').is_stale, false);
  assert.equal(find(r, 'NONE-STALE').is_stale, false);
});

test('a stale price keeps its value (the last verified price) and is still exported', () => {
  const r = exportOf([withPricing('STALE-KEPT', [{ source_id: 1, is_stale: true }], { price: 1234 })]);
  assert.equal(find(r, 'STALE-KEPT').price, 1234);
  assert.equal(find(r, 'STALE-KEPT').is_stale, true);
});

test('price_updated_at is the device\'s Device.price_updated_at, not a Pricing date', () => {
  const r = exportOf([
    withPricing('AS-STRING', [{ source_id: 1, is_stale: false, last_updated: '2026-02-02' }], { price_updated_at: '2026-11-01T00:00:00Z' }),
    withPricing('AS-DATE',   [{ source_id: 1, is_stale: false, last_updated: '2026-02-02' }], { price_updated_at: new Date('2026-10-05T08:30:00Z') }),
  ]);
  assert.equal(find(r, 'AS-STRING').price_updated_at, '2026-11-01T00:00:00Z');
  assert.equal(find(r, 'AS-DATE').price_updated_at, '2026-10-05T08:30:00.000Z');
});

test('provenance values are valid contract values', () => {
  const r = exportOf([withPricing('CONTRACT', [{ source_id: 1, is_stale: false }])]);
  const sku = find(r, 'CONTRACT');
  assert.ok(['synchronized', 'manual'].includes(sku.price_source));
  assert.equal(typeof sku.is_stale, 'boolean');
  assert.equal(typeof sku.price_updated_at, 'string');
  assert.equal(validateCatalogSku(sku), true);
});