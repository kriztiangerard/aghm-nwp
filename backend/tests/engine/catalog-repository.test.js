'use strict';
// Uses a fake pool; no database is needed. Nothing here opens a real connection.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngineData, loadCatalog, loadVendors, CatalogRepositoryError } = require('../catalog-repository.js');

const NOW = '2026-11-11';

function fakePool({ vendors, devices, failOnce, failAlways } = {}) {
  const log = [];
  let failed = false;
  const rowsFor = (text) => {
    if (/management_modes/.test(text)) return vendors ?? [];
    if (/FROM vendor/.test(text)) return [{ vendor_id: 2, name: 'TP-Link Omada' }];
    if (/FROM device\b/.test(text)) return devices ?? [];
    if (/FROM product_line/.test(text)) return [{ product_line_id: 10, vendor_id: 2, category: 'gateway_router', name: 'Entry VPN Routers', line_rank: 1 }];
    if (/FROM gateway_router_specifications/.test(text)) return [{ device_id: 1, wan_ports: 2, lan_ports: 3, max_throughput_mbps: 1000, max_power_draw_w: 8, vpn_supported: true, sfp_ports: 0 }];
    return [];
  };
  return {
    log,
    async connect() {
      return {
        async query(text) {
          log.push(text.trim().split('\n')[0].slice(0, 60));
          if (failAlways) throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
          if (failOnce && !failed && /^BEGIN/.test(text)) { failed = true; throw Object.assign(new Error('Connection terminated'), { code: 'ECONNRESET' }); }
          return { rows: /^(BEGIN|COMMIT|ROLLBACK)/.test(text) ? [] : rowsFor(text) };
        },
        release() {},
      };
    },
  };
}

const goodVendors = [
  { vendor_id: 2, name: 'TP-Link Omada', need_controller: true, management_modes: ['dashboard'] },
  { vendor_id: 7, name: 'Generic', need_controller: false, management_modes: null },
];
const goodDevice = [{ device_id: 1, vendor_id: 2, product_line_id: 10, sku: 'ER605', price: null, name: 'ER605', lifecycle_status: 'ACTIVE' }];

test('loadEngineData returns vendors (without Generic) and catalog from one transaction', async () => {
  const pool = fakePool({ vendors: goodVendors, devices: goodDevice });
  const data = await loadEngineData({ now: NOW, pool });
  assert.deepEqual(data.vendors, [{ name: 'TP-Link Omada', needController: true, managementModes: ['dashboard'] }]);
  assert.deepEqual(data.catalog.map((s) => s.sku), ['ER605']);
  assert.equal(pool.log.filter((l) => l.startsWith('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')).length, 1);
  assert.equal(pool.log.filter((l) => l === 'COMMIT').length, 1);
});

test('loadVendors uses vendor_id order and rejects a missing management_modes', async () => {
  const vendors = await loadVendors({ pool: fakePool({ vendors: goodVendors }) });
  assert.equal(vendors.length, 1);
  await assert.rejects(
    loadVendors({ pool: fakePool({ vendors: [{ vendor_id: 2, name: 'TP-Link Omada', need_controller: true, management_modes: null }] }) }),
    (e) => e instanceof CatalogRepositoryError && e.code === 'VENDOR_DATA_INCOMPLETE');
});

test('an empty Device table is CATALOG_EMPTY, never an empty catalog', async () => {
  await assert.rejects(loadCatalog({ now: NOW, pool: fakePool({ devices: [] }) }), (e) => e.code === 'CATALOG_EMPTY');
});

test('`now` is required', async () => {
  await assert.rejects(loadCatalog({ pool: fakePool() }), TypeError);
  await assert.rejects(loadEngineData({ pool: fakePool() }), TypeError);
});

test('an unreachable database is CATALOG_DB_UNAVAILABLE', async () => {
  await assert.rejects(loadCatalog({ now: NOW, pool: fakePool({ failAlways: true }) }), (e) => e.code === 'CATALOG_DB_UNAVAILABLE');
});

test('a dead pooled connection is retried once', async () => {
  const pool = fakePool({ devices: goodDevice, failOnce: true });
  const result = await loadCatalog({ now: NOW, pool });
  assert.equal(result.catalog.length, 1);
  assert.equal(pool.log.filter((l) => l.startsWith('BEGIN')).length, 2);
});

test('a missing certificate file is CATALOG_DB_CONFIG, not a query failure', async () => {
  const pool = { async connect() { throw Object.assign(new Error("ENOENT: no such file or directory, open 'C:\\certs\\global-bundle.pem'"), { code: 'ENOENT', path: 'C:\\certs\\global-bundle.pem' }); } };
  await assert.rejects(loadCatalog({ now: NOW, pool }), (e) => e.code === 'CATALOG_DB_CONFIG' && /global-bundle\.pem/.test(e.message));
});

test('a missing configuration is CATALOG_DB_CONFIG', async () => {
  const keys = ['DATABASE_URL', 'DATABASE_SECRET_ARN'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  keys.forEach((k) => delete process.env[k]);
  try {
    await assert.rejects(loadCatalog({ now: NOW }), (e) => e.code === 'CATALOG_DB_CONFIG' && /DATABASE_URL|DATABASE_SECRET_ARN/.test(e.message));
  } finally {
    keys.forEach((k) => { if (saved[k] !== undefined) process.env[k] = saved[k]; });
  }
});