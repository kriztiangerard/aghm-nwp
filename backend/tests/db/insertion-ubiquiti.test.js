'use strict';
// NWP-SETUP-007 — integration tests for the Ubiquiti catalog insertion script.
// Covers 007-01..009, 011..021, 023..031 from NWP-SETUP-006-007-test-cases.md.
// NOT covered (need a decision first): 007-10 (integrated switch/controller blocks), 007-22 (unknown capability policy), 007-27 (firewall block removal policy).
//
// !! The ingestion script was not provided. Everything marked ADAPTER below encodes an ASSUMPTION; edit that section to match the real script and schema. !!
//
// Run:  TEST_DATABASE_URL=postgres://user:pw@localhost:5432/nwp_test node --test tests/setup-007/
// Dev deps: npm i -D pg
// The database MUST be a disposable test DB (name must contain "test"); the suite truncates Device and Capability.

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Client } = require('pg');

// ===================== ADAPTER (edit me) =====================
// Assumption: the script is a module exporting ingest({ files, client }) that resolves to
// { inserted, updated, skipped }, logs per-entry errors via console.error, and never throws for a bad entry.
const INGEST_MODULE = process.env.INGEST_MODULE || path.resolve(__dirname, '../../scripts/ingest-catalog.js');
async function runIngest(client, files) {
  const { ingest } = require(INGEST_MODULE);
  const errors = [];
  const origErr = console.error;
  console.error = (...a) => { errors.push(a.join(' ')); };
  try {
    const summary = await ingest({ files, client });
    return { summary, errors };
  } finally {
    console.error = origErr;
  }
}
// Assumed table names (ERD data dictionary names, snake_cased). Columns are assumed to match the ERD / device-schemas.json names.
const T = {
  device: 'device',
  gateway: 'gateway_router_specifications',
  sw: 'switch_specifications',
  ap: 'ap_specifications',
  firewall: 'firewall_specifications',
  capability: 'capability',
  deviceCap: 'device_capability',
  vendor: 'vendor',
  productLine: 'product_line',
};
const VENDOR_NAME = 'Ubiquiti';
// =============================================================

const DB_URL = process.env.TEST_DATABASE_URL;
let client;
let tmp;
let vendorId;
const lineByCategory = {};

const count = async (table) => Number((await client.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
const deviceBySku = async (sku) => (await client.query(`SELECT * FROM ${T.device} WHERE sku = $1`, [sku])).rows[0];
const specRow = async (table, id) => (await client.query(`SELECT * FROM ${table} WHERE device_id = $1`, [id])).rows[0];
const capsOf = async (sku) => (await client.query(
  `SELECT c.capability_desc FROM ${T.deviceCap} dc
     JOIN ${T.capability} c ON c.capability_id = dc.capability_id
     JOIN ${T.device} d ON d.device_id = dc.device_id
    WHERE d.sku = $1 ORDER BY 1`, [sku])).rows.map((r) => r.capability_desc);

// ---------- fixtures ----------
const core = (sku, category, extra = {}) => ({
  vendor_id: vendorId, sku, price: 100, name: `${sku} name`, is_rack_mountable: false, u_height: 0,
  lifecycle_status: 'active', category, product_line: lineByCategory[category], ...extra,
});
const gw = (sku, extra = {}, specs = {}) => core(sku, 'gateway_router', {
  gateway_router_specs: { wan_ports: 1, lan_ports: 4, max_throughput_mbps: 1000, vpn_supported: true, ...specs }, ...extra,
});
const sw = (sku, extra = {}, specs = {}) => core(sku, 'switch', {
  switch_specs: { port_count: 8, layer: 2, poe_ports: 4, poe_budget_w: 60, ...specs }, ...extra,
});
const ap = (sku, extra = {}, specs = {}) => core(sku, 'ap', {
  ap_specs: { wifi_standard: 6, supported_24ghz: true, supported_5ghz: true, supported_6ghz: false, ...specs }, ...extra,
});
const writeFile = (name, entries) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, typeof entries === 'string' ? entries : JSON.stringify(entries));
  return p;
};

before(async () => {
  assert.ok(DB_URL, 'TEST_DATABASE_URL is required');
  assert.match(new URL(DB_URL).pathname, /test/i, 'Refusing to run: database name must contain "test"');
  client = new Client({ connectionString: DB_URL });
  await client.connect();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nwp-007-'));
  const v = await client.query(`SELECT vendor_id FROM ${T.vendor} WHERE name ILIKE $1`, [`%${VENDOR_NAME}%`]);
  assert.ok(v.rows[0], `Vendor ${VENDOR_NAME} must be seeded`);
  vendorId = v.rows[0].vendor_id;
  for (const category of ['gateway_router', 'switch', 'ap']) {
    const r = await client.query(`SELECT name FROM ${T.productLine} WHERE vendor_id = $1 AND category = $2 ORDER BY line_rank LIMIT 1`, [vendorId, category]);
    assert.ok(r.rows[0], `A seeded product_line is needed for ${category}`);
    lineByCategory[category] = r.rows[0].name;
  }
});
beforeEach(async () => {
  await client.query(`TRUNCATE ${T.device}, ${T.capability} RESTART IDENTITY CASCADE`);
});
after(async () => {
  if (client) await client.end();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------- AC1 ----------
describe('AC1 Device table populated', () => {
  it('007-01/02 loads every entry from the three files with resolved FKs', async () => {
    const files = [
      writeFile('r.json', [gw('G1'), gw('G2')]),
      writeFile('s.json', [sw('S1')]),
      writeFile('a.json', [ap('A1'), ap('A2')]),
    ];
    const { summary } = await runIngest(client, files);
    assert.equal(await count(T.device), 5);
    assert.equal(summary.inserted, 5);
    const d = await deviceBySku('S1');
    assert.equal(d.name, 'S1 name');
    assert.equal(Number(d.price), 100);
    assert.equal(d.vendor_id, vendorId);
    assert.ok(d.product_line_id, 'product_line_id resolved');
  });

  it('007-03 null price and missing optional fields are inserted, not skipped', async () => {
    const { summary } = await runIngest(client, [writeFile('s.json', [sw('S1', { price: null })])]);
    assert.equal(summary.inserted, 1);
    assert.equal((await deviceBySku('S1')).price, null);
  });
});

// ---------- AC2 ----------
describe('AC2 subtype tables', () => {
  it('007-04/05/06 writes each category to its own subtype table with matching values', async () => {
    await runIngest(client, [
      writeFile('r.json', [gw('G1', {}, { wan_ports: 2, lan_ports: 8, max_throughput_mbps: 3500 })]),
      writeFile('s.json', [sw('S1', {}, { port_count: 24, poe_ports: 16, poe_budget_w: 250 })]),
      writeFile('a.json', [ap('A1', {}, { wifi_standard: 7, supported_6ghz: true })]),
    ]);
    const g = await specRow(T.gateway, (await deviceBySku('G1')).device_id);
    assert.equal(g.wan_ports, 2); assert.equal(g.lan_ports, 8); assert.equal(g.max_throughput_mbps, 3500);
    const s = await specRow(T.sw, (await deviceBySku('S1')).device_id);
    assert.equal(s.port_count, 24); assert.equal(s.poe_ports, 16); assert.equal(s.poe_budget_w, 250);
    const a = await specRow(T.ap, (await deviceBySku('A1')).device_id);
    assert.equal(a.wifi_standard, 7); assert.equal(a.supported_6ghz, true);
  });

  it('007-07 gateway with firewall_specs gets gateway + firewall rows on the same device_id', async () => {
    const entry = gw('G1', { capabilities: ['router', 'firewall'] });
    entry.firewall_specs = { firewall_throughputs_mbps: 2300, vpn_throughput_mbps: 1000, max_concurrent_sessions: 100000 };
    await runIngest(client, [writeFile('r.json', [entry])]);
    const id = (await deviceBySku('G1')).device_id;
    assert.ok(await specRow(T.gateway, id));
    const f = await specRow(T.firewall, id);
    assert.equal(f.firewall_throughputs_mbps, 2300);
    assert.equal(f.max_concurrent_sessions, 100000);
  });

  it('007-08 plain gateway gets no firewall row', async () => {
    await runIngest(client, [writeFile('r.json', [gw('G1')])]);
    assert.equal(await count(T.firewall), 0);
  });

  it('007-09 no cross-category or orphan subtype rows', async () => {
    await runIngest(client, [writeFile('x.json', [gw('G1'), sw('S1'), ap('A1')])]);
    assert.equal(await count(T.gateway), 1);
    assert.equal(await count(T.sw), 1);
    assert.equal(await count(T.ap), 1);
  });
});

// ---------- AC3 ----------
describe('AC3 capability resolution', () => {
  it('007-11 reuses an existing Capability row', async () => {
    await client.query(`INSERT INTO ${T.capability} (capability_desc) VALUES ('router')`);
    await runIngest(client, [writeFile('r.json', [gw('G1', { capabilities: ['router'] })])]);
    assert.equal(await count(T.capability), 1);
    assert.deepEqual(await capsOf('G1'), ['router']);
  });

  it('007-12 inserts a missing Capability row', async () => {
    await runIngest(client, [writeFile('r.json', [gw('G1', { capabilities: ['router'] })])]);
    assert.equal(await count(T.capability), 1);
    assert.deepEqual(await capsOf('G1'), ['router']);
  });

  it('007-13 multiple capabilities produce one junction row each', async () => {
    await runIngest(client, [writeFile('r.json', [gw('G1', { capabilities: ['router', 'firewall'] })])]);
    assert.deepEqual(await capsOf('G1'), ['firewall', 'router']);
  });

  it('007-14 shared capability yields exactly one Capability row', async () => {
    await runIngest(client, [writeFile('x.json', [sw('S1', { capabilities: ['switch'] }), sw('S2', { capabilities: ['switch'] }), sw('S3', { capabilities: ['switch'] })])]);
    assert.equal(await count(T.capability), 1);
    assert.equal(await count(T.deviceCap), 3);
  });

  it('007-15 no capabilities: device inserted, zero junction rows', async () => {
    await runIngest(client, [writeFile('a.json', [ap('A1')])]);
    assert.equal(await count(T.device), 1);
    assert.equal(await count(T.deviceCap), 0);
  });
});

// ---------- AC4 ----------
describe('AC4 malformed entries are skipped, not fatal', () => {
  it('007-16 missing required core field', async () => {
    const noSku = sw('S1'); delete noSku.sku;
    const noName = sw('S2'); delete noName.name;
    const { summary, errors } = await runIngest(client, [writeFile('s.json', [noSku, noName, sw('S3')])]);
    assert.equal(await count(T.device), 1);
    assert.equal(summary.skipped, 2);
    assert.ok(errors.length >= 2, 'errors logged');
  });

  it('007-17 invalid type', async () => {
    const { summary } = await runIngest(client, [writeFile('s.json', [sw('S1', { price: 'abc' }), sw('S2', {}, { poe_ports: 'many' })])]);
    assert.equal(summary.skipped, 2);
    assert.equal(await count(T.device), 0);
  });

  it('007-18 capability that fails resolution leaves no Device row behind', async () => {
    const { summary } = await runIngest(client, [writeFile('s.json', [sw('S1', { capabilities: [''] }), sw('S2', { capabilities: [null] }), sw('S3', { capabilities: [42] })])]);
    assert.equal(summary.skipped, 3);
    assert.equal(await count(T.device), 0);
    assert.equal(await count(T.sw), 0);
  });

  it('007-19 run continues past bad entries (valid, bad, valid)', async () => {
    const bad = sw('S2'); delete bad.sku;
    const { summary } = await runIngest(client, [writeFile('s.json', [sw('S1'), bad, sw('S3')])]);
    assert.equal(summary.inserted, 2);
    assert.ok(await deviceBySku('S1')); assert.ok(await deviceBySku('S3'));
  });

  it('007-20 failure on the subtype insert persists nothing for that entry', async () => {
    // switch_specs.layer is constrained to 2 or 3 by the schema; 9 should fail validation or the DB constraint.
    const { summary } = await runIngest(client, [writeFile('s.json', [sw('S1', {}, { layer: 9 }), sw('S2')])]);
    assert.equal(summary.skipped, 1);
    assert.equal(await deviceBySku('S1'), undefined);
    assert.equal(await count(T.sw), 1);
  });

  it('007-21 invalid JSON or non-array file: clear failure, zero DB writes', async () => {
    let threw = false;
    let result;
    try { result = await runIngest(client, [writeFile('bad.json', '{not json'), writeFile('obj.json', '{"a":1}')]); } catch { threw = true; }
    assert.equal(await count(T.device), 0);
    assert.ok(threw || result.errors.length > 0, 'failure must be reported');
  });
});

// ---------- AC5 ----------
describe('AC5 re-runnable (upsert by sku)', () => {
  const files = () => [
    writeFile('r.json', [gw('G1', { capabilities: ['router'] })]),
    writeFile('s.json', [sw('S1', { capabilities: ['switch'] })]),
    writeFile('a.json', [ap('A1', { capabilities: ['ap'] })]),
  ];

  it('007-23/25 second identical run inserts nothing, keeps device_id', async () => {
    const f = files();
    await runIngest(client, f);
    const before = (await deviceBySku('S1')).device_id;
    const { summary } = await runIngest(client, f);
    assert.equal(summary.inserted, 0);
    assert.equal(summary.updated, 3);
    assert.equal((await deviceBySku('S1')).device_id, before);
    for (const t of [T.device, T.gateway, T.sw, T.ap, T.deviceCap]) {
      assert.equal(await count(t), t === T.device || t === T.deviceCap ? 3 : 1, `${t} row count`);
    }
  });

  it('007-24 changed values update in place', async () => {
    await runIngest(client, [writeFile('s.json', [sw('S1')])]);
    await runIngest(client, [writeFile('s2.json', [sw('S1', { price: 555 }, { poe_budget_w: 300 })])]);
    const d = await deviceBySku('S1');
    assert.equal(Number(d.price), 555);
    assert.equal((await specRow(T.sw, d.device_id)).poe_budget_w, 300);
    assert.equal(await count(T.device), 1);
  });

  it('007-26 capability set is replaced, not accumulated', async () => {
    await runIngest(client, [writeFile('r.json', [gw('G1', { capabilities: ['router', 'firewall'] })])]);
    await runIngest(client, [writeFile('r2.json', [gw('G1', { capabilities: ['router'] })])]);
    assert.deepEqual(await capsOf('G1'), ['router']);
  });

  it('007-28 mixed run: 1 new, 1 existing, 1 malformed', async () => {
    await runIngest(client, [writeFile('s.json', [sw('S1')])]);
    const bad = sw('S3'); delete bad.name;
    const { summary } = await runIngest(client, [writeFile('m.json', [sw('S1', { price: 1 }), sw('S2'), bad])]);
    assert.deepEqual({ i: summary.inserted, u: summary.updated, s: summary.skipped }, { i: 1, u: 1, s: 1 });
  });
});

// ---------- AC6 ----------
describe('AC6 run summary', () => {
  it('007-29/30 counts add up and match the DB', async () => {
    const bad = sw('S9'); delete bad.sku;
    const entries = [sw('S1'), sw('S2'), bad];
    const { summary } = await runIngest(client, [writeFile('s.json', entries)]);
    assert.equal(summary.inserted + summary.updated + summary.skipped, entries.length);
    assert.equal(summary.inserted, await count(T.device));
  });

  it('007-31 zero counts are reported as 0, not omitted', async () => {
    const { summary } = await runIngest(client, [writeFile('empty.json', [])]);
    assert.deepEqual({ i: summary.inserted, u: summary.updated, s: summary.skipped }, { i: 0, u: 0, s: 0 });
  });

  it('007-32 skipped entries are identifiable in the error log', async () => {
    const bad = sw('S-BAD'); delete bad.name;
    const { errors } = await runIngest(client, [writeFile('s.json', [bad])]);
    assert.ok(errors.some((e) => e.includes('S-BAD')), 'log should name the sku');
  });
});