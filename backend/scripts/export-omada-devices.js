'use strict';
// NWP-ENGINE-001: export one vendor's catalog from the database into a frozen
// snapshot file (default: Omada -> tests/fixtures/catalogs/omada.snapshot.json).
//
// RUN BY HAND, NEVER IN CI. Tests must read the snapshot file, not the database.
//
//   DATABASE_URL=postgres://user:pass@host/db?sslmode=require \
//     node scripts/export-catalog-snapshot.js [--vendor-id 2] [--out path] [--currency PHP] [--date YYYY-MM-DD] [--dry-run]
//
// - Read-only: runs inside BEGIN READ ONLY and rolls back.
// - Needs the `pg` package, loaded only when the script runs. The mapping and
//   validation functions below are exported and need no dependencies, so unit
//   tests can import this file under `node --test` with no install step.
// - Nothing is written unless every row maps and validates (all-or-nothing).

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const fs = require('node:fs');
const { CONTRACT_VERSION } = require('../src/types/engine/contracts');

// ---- Configuration: reconcile these with the real schema and Appendix A ------------

// Table names as they exist in the database (ERD titles, snake_cased).
const TABLES = {
  device: 'device',
  vendor: 'vendor',
  productLine: 'product_line',
  capability: 'capability',
  deviceCapability: 'device_capability',
  gateway_router: 'gateway_router_specifications',
  ap: 'ap_specifications',
  switch: 'switch_specifications',
  controller: 'controller_specifications',
  firewall: 'firewall_specifications',
  rack: 'rack_specifications',
};

// Which spec table decides a device's own category, first match wins. A gateway
// can also carry switch/controller/firewall rows (e.g. Omada ER7212PC), so gateway comes first.
const CATEGORY_ORDER = ['gateway_router', 'ap', 'switch', 'controller', 'firewall', 'rack'];

// DB category -> CatalogSku.category. contracts.js lists only gateway, access_point,
// switch, optic, enclosure; 'controller' and 'firewall' are passed through and
// reported at the end so the CatalogSku union can be extended before the freeze.
const CATALOG_CATEGORY = {
  gateway_router: 'gateway',
  ap: 'access_point',
  switch: 'switch',
  rack: 'enclosure',
  controller: 'controller',
  firewall: 'firewall',
};
const CONTRACT_CATEGORIES = new Set(['gateway', 'access_point', 'switch', 'optic', 'enclosure']);

// The High-Performance plan needs a product line for these categories.
const LINE_REQUIRED = new Set(['gateway', 'access_point', 'switch']);

const STATUS_MAP = { active: 'ACTIVE', sunsetting: 'SUNSETTING', discontinued: 'DISCONTINUED' };

// Rename spec columns to CatalogSku field names where Appendix A differs.
// Identity by default: add { db_column: 'appendixAName' } entries here only.
const FIELD_MAP = {};

// ---- Query ---------------------------------------------------------------------------

function buildQuery() {
  const t = TABLES;
  return `
SELECT
  d.sku,
  d.name,
  d.description,
  d.price::text                               AS price,
  to_json(d.price_updated_at) #>> '{}'        AS price_updated_at,
  d.is_rack_mountable,
  d.u_height,
  d.lifecycle_status,
  d.eos_date::text                            AS eos_date,
  d.eol_date::text                            AS eol_date,
  v.name                                      AS vendor,
  pl.name                                     AS line,
  pl.line_rank                                AS line_rank,
  COALESCE((
    SELECT array_agg(c.capability_desc ORDER BY c.capability_desc)
    FROM ${t.deviceCapability} dc
    JOIN ${t.capability} c ON c.capability_id = dc.capability_id
    WHERE dc.device_id = d.device_id
  ), ARRAY[]::text[])                         AS capabilities,
  to_jsonb(g)  - 'device_id'                  AS gateway_router_specs,
  to_jsonb(a)  - 'device_id'                  AS ap_specs,
  to_jsonb(s)  - 'device_id'                  AS switch_specs,
  to_jsonb(ct) - 'device_id'                  AS controller_specs,
  to_jsonb(f)  - 'device_id'                  AS firewall_specs,
  to_jsonb(r)  - 'device_id'                  AS rack_specs
FROM ${t.device} d
JOIN ${t.vendor} v                ON v.vendor_id = d.vendor_id
LEFT JOIN ${t.productLine} pl     ON pl.product_line_id = d.product_line_id
LEFT JOIN ${t.gateway_router} g   ON g.device_id = d.device_id
LEFT JOIN ${t.ap} a               ON a.device_id = d.device_id
LEFT JOIN ${t.switch} s           ON s.device_id = d.device_id
LEFT JOIN ${t.controller} ct      ON ct.device_id = d.device_id
LEFT JOIN ${t.firewall} f         ON f.device_id = d.device_id
LEFT JOIN ${t.rack} r             ON r.device_id = d.device_id
WHERE d.vendor_id = $1
ORDER BY d.sku`;
}

// ---- Mapping (pure, no dependencies) --------------------------------------------------

function cleanSpecs(obj) {
  if (obj === null || typeof obj !== 'object') return null;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'device_id' || value === null || value === undefined) continue;
    out[FIELD_MAP[key] || key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Maps one database row to a CatalogSku. Returns { sku, problems }. */
function toCatalogSku(row, { currency }) {
  const problems = [];
  const label = row.sku || '(row without sku)';

  const specs = {};
  for (const category of CATEGORY_ORDER) specs[category] = cleanSpecs(row[`${category}_specs`]);
  const dbCategory = CATEGORY_ORDER.find((category) => specs[category]);
  if (!dbCategory) {
    problems.push(`${label}: no row in any specifications table, so its category is unknown`);
    return { sku: null, problems };
  }
  const category = CATALOG_CATEGORY[dbCategory];

  const status = STATUS_MAP[String(row.lifecycle_status || '').toLowerCase()];
  if (!status) problems.push(`${label}: unknown lifecycle_status "${row.lifecycle_status}"`);

  let price = null;
  if (row.price !== null && row.price !== undefined) {
    price = Number(row.price);
    if (!Number.isFinite(price) || price < 0) {
      problems.push(`${label}: price "${row.price}" is not a non-negative number`);
      price = null;
    }
  }

  const sku = { sku: row.sku, vendor: row.vendor, category };
  if (row.line !== null && row.line !== undefined) {
    sku.line = row.line;
    sku.line_rank = Number(row.line_rank);
  }
  sku.status = status;
  sku.price = price; // null stays explicit: unknown price, excluded from Cost-Efficient ranking
  sku.currency = currency;
  if (row.price_updated_at) sku.price_updated_at = row.price_updated_at;
  sku.name = row.name;
  if (row.description) sku.description = row.description;
  sku.capabilities = row.capabilities || [];
  sku.is_rack_mountable = row.is_rack_mountable;
  sku.u_height = row.u_height;
  if (row.eos_date) sku.eos_date = row.eos_date;
  if (row.eol_date) sku.eol_date = row.eol_date;

  // The device's own category specs are flattened onto the SKU.
  for (const [key, value] of Object.entries(specs[dbCategory])) {
    if (key in sku) problems.push(`${label}: spec column "${key}" collides with a core field`);
    else sku[key] = value;
  }
  // Extra roles on the same device (gateway with switch/controller/firewall) stay nested,
  // because their columns (wan_ports, lan_ports, max_power_draw_w) collide with the primary ones.
  for (const other of CATEGORY_ORDER) {
    if (other !== dbCategory && specs[other]) sku[`${other}_specs`] = specs[other];
  }

  return { sku, problems };
}

/** Contract-level checks on the finished list. Returns { problems, warnings }. */
function validateSkus(skus, snapshotDate) {
  const problems = [];
  const warnings = [];
  const seen = new Set();

  for (const s of skus) {
    const key = `${s.vendor}|${s.sku}`;
    if (seen.has(key)) problems.push(`${s.sku}: duplicate SKU for vendor ${s.vendor}`);
    seen.add(key);

    for (const field of ['sku', 'vendor', 'category', 'status', 'currency']) {
      if (typeof s[field] !== 'string' || s[field].length === 0) problems.push(`${s.sku}: "${field}" must be a non-empty string`);
    }
    if (s.price !== null && !Number.isFinite(s.price)) problems.push(`${s.sku}: price must be a number or null`);

    if (LINE_REQUIRED.has(s.category)) {
      if (!s.line) problems.push(`${s.sku}: ${s.category} has no product line (product_line_id is empty)`);
      else if (!Number.isInteger(s.line_rank) || s.line_rank < 1) problems.push(`${s.sku}: line_rank must be an integer >= 1`);
    }

    if (s.status === 'ACTIVE' && s.eos_date && s.eos_date < snapshotDate) {
      warnings.push(`${s.sku}: ACTIVE but end-of-sale date ${s.eos_date} is before the snapshot date`);
    }
  }

  const extra = [...new Set(skus.map((s) => s.category).filter((c) => !CONTRACT_CATEGORIES.has(c)))];
  if (extra.length > 0) {
    warnings.push(`categories not in the CatalogSku union in contracts.js: ${extra.join(', ')} (add them before the freeze)`);
  }
  return { problems, warnings };
}

// ---- Export ---------------------------------------------------------------------------

async function exportSnapshot({ client, vendorId, currency, date }) {
  await client.query('BEGIN READ ONLY');
  let rows;
  try {
    ({ rows } = await client.query(buildQuery(), [vendorId]));
  } finally {
    await client.query('ROLLBACK');
  }

  const problems = [];
  const skus = [];
  for (const row of rows) {
    const result = toCatalogSku(row, { currency });
    problems.push(...result.problems);
    if (result.sku) skus.push(result.sku);
  }
  if (rows.length === 0) problems.push(`no devices found for vendor_id ${vendorId}`);

  skus.sort((a, b) => (
    a.category.localeCompare(b.category)
    || (a.line_rank ?? Infinity) - (b.line_rank ?? Infinity)
    || a.sku.localeCompare(b.sku)
  ));

  const checked = validateSkus(skus, date);
  problems.push(...checked.problems);

  const snapshot = {
    contractVersion: CONTRACT_VERSION,
    snapshotDate: date,
    vendor: rows.length > 0 ? rows[0].vendor : null,
    skus,
  };
  return { snapshot, problems, warnings: checked.warnings };
}

// ---- CLI ------------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { vendorId: 2, out: null, currency: 'PHP', date: new Date().toISOString().slice(0, 10), dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--dry-run') args.dryRun = true;
    else if (flag === '--vendor-id') args.vendorId = Number(argv[++i]);
    else if (flag === '--out') args.out = argv[++i];
    else if (flag === '--currency') args.currency = argv[++i];
    else if (flag === '--date') args.date = argv[++i];
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!Number.isInteger(args.vendorId)) throw new Error('--vendor-id must be an integer');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('--date must be YYYY-MM-DD');
  if (!args.currency) throw new Error('--currency must not be empty');
  return args;
}

async function main() {
  if (process.env.CI) {
    console.error('Refusing to run in CI. Run this script by hand and commit the snapshot file.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL to the Postgres connection string.');
    process.exit(1);
  }

  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const outPath = path.resolve(args.out || path.join(__dirname, '..', 'tests', 'fixtures', 'catalogs', 'omada.snapshot.json'));

  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    console.error('The "pg" package is required to run this script (install it in the backend, not in CI).');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let result;
  try {
    result = await exportSnapshot({ client, vendorId: args.vendorId, currency: args.currency, date: args.date });
  } finally {
    await client.end();
  }

  for (const w of result.warnings) console.warn(`Warning: ${w}`);
  if (result.problems.length > 0) {
    console.error('Nothing written. Fix these first:');
    for (const p of result.problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  const counts = {};
  for (const s of result.snapshot.skus) counts[s.category] = (counts[s.category] || 0) + 1;
  const summary = Object.entries(counts).map(([c, n]) => `${n} ${c}`).join(', ');

  if (args.dryRun) {
    console.log(`Dry run: ${result.snapshot.skus.length} SKUs (${summary}) for ${result.snapshot.vendor}; nothing written.`);
    return;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result.snapshot, null, 2)}\n`);
  console.log(`Wrote ${result.snapshot.skus.length} SKUs (${summary}) to ${outPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { buildQuery, toCatalogSku, validateSkus, exportSnapshot, parseArgs };