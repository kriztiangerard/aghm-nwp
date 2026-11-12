'use strict';
// NWP-ENGINE-006: the catalog repository. The ONLY engine file that opens a database connection.
// Everything else (selectors, enclosure sizing, buildBom, orchestration, output assembly) receives CatalogSku[] and
// VendorDescriptor[] as arguments. The handler is the only caller of this module.
//
//   loadCatalog({ now }) -> { catalog, rejected, excluded, lifecycleRulesPending, notes }   (plain data; see catalog-export.js)
//   loadVendors()        -> VendorDescriptor[]
//   loadEngineData({ now, pool? }) -> { vendors, ...loadCatalog result }   (both reads in ONE snapshot; use this in the handler)
//
// Every function accepts an optional `pool` (anything with connect()), for injection; by default the module's own lazy pool is used.
//
// The engine has no clock, so the handler passes `now` (a Date or an ISO string).
// Configuration lives in database.js: DATABASE_URL (local) or DATABASE_SECRET_ARN (Lambda), and DB_SSL=true for RDS.
// A connection failure throws CatalogRepositoryError; it never produces an empty catalog.

const { getPool, closePool } = require('./database.js');   // the only module that imports `pg`
const { validateVendorDescriptors } = require('./contracts.js');
const { toDay } = require('./lifecycle.js');
const { buildCatalogFromRows, FIXTURE_VENDOR_ID } = require('./catalog-export.js');
const { GENERIC_VENDOR_NAME } = require('./params.js');

// Table names. device and the four *_specifications tables below are taken from the seed script; the rest are inferred
// from the ERD and the data dictionary. Check them against the real schema; they are the only place to change.
const TABLES = Object.freeze({
  device: 'device',
  vendor: 'vendor',                            // inferred
  productLine: 'product_line',                 // inferred
  pricing: 'pricing',                          // inferred
  capability: 'capability',                    // inferred
  deviceCapability: 'device_capability',       // inferred
  gateway: 'gateway_router_specifications',
  switch: 'switch_specifications',
  ap: 'ap_specifications',
  firewall: 'firewall_specifications',
  controller: 'controller_specifications',     // inferred
  rack: 'rack_specifications',                 // inferred
});

class CatalogRepositoryError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'CatalogRepositoryError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

const CONNECTION_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN', '28P01', '28000', '3D000', '57P01', '57P02', '57P03', '53300']);
const isConnectionError = (error) => CONNECTION_CODES.has(error.code) || /Connection terminated|timeout exceeded when trying to connect|connect ECONN/i.test(error.message || '');
const isRetryable = (error) => ['ECONNRESET', 'EPIPE'].includes(error.code) || /Connection terminated/i.test(error.message || '');

function toRepositoryError(error) {
  if (error instanceof CatalogRepositoryError) return error;
  if (error.code === 'ENOENT') {
    return new CatalogRepositoryError('CATALOG_DB_CONFIG', `A file named in the database settings does not exist (${error.path || error.message}). This is usually the SSL certificate path (sslrootcert / PGSSLROOTCERT): check that the file exists at that path.`, error);
  }
  if (isConnectionError(error)) {
    return new CatalogRepositoryError('CATALOG_DB_UNAVAILABLE', `Cannot reach the catalog database (${error.code || error.message}). The engine does not run on an empty catalog.`, error);
  }
  const hint = error.code === '42703' || error.code === '42P01'
    ? ' A table or column the repository expects does not exist: check TABLES in catalog-repository.js and that the migrations (Pricing.is_stale, Vendor.management_modes) are applied.'
    : '';
  return new CatalogRepositoryError('CATALOG_QUERY_FAILED', `Catalog query failed: ${error.message}.${hint}`, error);
}

// Runs `work(client)` in one read-only REPEATABLE READ transaction, so the Price updater cannot change Pricing between the
// Device read and the Pricing read of the same export. Retries once when a pooled connection turns out to be dead.
async function withSnapshot(work, injectedPool) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let client;
    try {
      let activePool = injectedPool;
      if (!activePool) {
        try {
          activePool = await getPool();
        } catch (poolError) {
          // The pool could not be created: missing settings, secret not readable, certificate file missing.
          throw new CatalogRepositoryError('CATALOG_DB_CONFIG', `Database connection could not be set up: ${poolError.message}`, poolError);
        }
      }
      client = await activePool.connect();
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const result = await work(client);
      await client.query('COMMIT');
      client.release();
      return result;
    } catch (error) {
      lastError = error;
      if (client) {
        try { await client.query('ROLLBACK'); } catch (rollbackError) { /* the connection is already gone */ }
        client.release(isConnectionError(error) ? error : undefined); // passing an error destroys the client
      }
      if (attempt === 1 && isRetryable(error)) continue;
      throw toRepositoryError(error);
    }
  }
  throw toRepositoryError(lastError);
}

async function readCatalogRows(client) {
  const T = TABLES;
  const select = async (text, params) => (await client.query(text, params)).rows;

  const vendors = await select(`SELECT vendor_id, name FROM ${T.vendor} WHERE vendor_id <> $1 ORDER BY vendor_id`, [FIXTURE_VENDOR_ID]);
  const devices = await select(
    `SELECT device_id, vendor_id, product_line_id, sku, price, price_updated_at, name, description,
            is_rack_mountable, u_height, lifecycle_status, eos_date, eol_date
       FROM ${T.device} WHERE vendor_id <> $1 ORDER BY device_id`,
    [FIXTURE_VENDOR_ID]
  );
  const lines = await select(`SELECT product_line_id, vendor_id, category, name, line_rank FROM ${T.productLine}`);
  const specs = {};
  for (const key of ['gateway', 'switch', 'ap', 'firewall', 'controller', 'rack']) {
    specs[key] = await select(`SELECT * FROM ${T[key]} ORDER BY device_id`);
  }
  const capabilities = await select(
    `SELECT dc.device_id, c.capability_desc
       FROM ${T.deviceCapability} dc JOIN ${T.capability} c ON c.capability_id = dc.capability_id
      ORDER BY dc.device_id, c.capability_desc`
  );
  const pricing = await select(`SELECT device_id, source_id, price, last_updated, is_stale FROM ${T.pricing} ORDER BY device_id`);

  return { vendors, devices, lines, specs, capabilities, pricing };
}

async function readVendors(client) {
  const rows = (await client.query(
    `SELECT vendor_id, name, need_controller, management_modes FROM ${TABLES.vendor} WHERE vendor_id <> $1 ORDER BY vendor_id`,
    [FIXTURE_VENDOR_ID]
  )).rows;

  const descriptors = [];
  rows.forEach((row) => {
    if (typeof row.name === 'string' && row.name.trim().toLowerCase() === GENERIC_VENDOR_NAME.toLowerCase()) return; // not a plan vendor
    if (!Array.isArray(row.management_modes)) {
      throw new CatalogRepositoryError('VENDOR_DATA_INCOMPLETE', `Vendor '${row.name}' has no management_modes value; every vendor needs an explicit one (no default is applied).`);
    }
    descriptors.push({ name: row.name, needController: row.need_controller, managementModes: row.management_modes });
  });
  validateVendorDescriptors(descriptors);
  return descriptors; // ordered by vendor_id; this is the plan order the engine uses
}

function requireNow(now, caller) {
  if (toDay(now) === null) {
    throw new TypeError(`${caller}: \`now\` (a Date or an ISO string) must be supplied by the caller; the engine has no clock.`);
  }
}

function buildFromRaw(raw, now) {
  if (raw.devices.length === 0) {
    throw new CatalogRepositoryError('CATALOG_EMPTY', 'The Device table returned no rows. Refusing to run the engine on an empty catalog.');
  }
  return buildCatalogFromRows(raw, { now });
}

async function loadCatalog({ now, pool: injected } = {}) {
  requireNow(now, 'loadCatalog');
  return buildFromRaw(await withSnapshot(readCatalogRows, injected), now);
}

async function loadVendors({ pool: injected } = {}) {
  return withSnapshot(readVendors, injected);
}

// Vendors and catalog from one snapshot, so a seed or price sync cannot land between the two reads.
async function loadEngineData({ now, pool: injected } = {}) {
  requireNow(now, 'loadEngineData');
  const { raw, vendors } = await withSnapshot(async (client) => ({ raw: await readCatalogRows(client), vendors: await readVendors(client) }), injected);
  return { vendors, ...buildFromRaw(raw, now) };
}

// For scripts and local runs. Not needed in the Lambda handler.
async function closeConnection() {
  await closePool();
}

module.exports = { loadEngineData, loadCatalog, loadVendors, closeConnection, CatalogRepositoryError, TABLES };