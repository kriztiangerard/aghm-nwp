'use strict';
// Pool acceptance criterion: "the connection is created once outside the handler and reused across warm invocations,
// and a connection failure surfaces as a clear error, not as an empty catalog".
// `pg` is replaced by a fake, so no database is needed. database.js and catalog-repository.js are loaded fresh per test.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const PG_PATH = require.resolve('pg');
const DATABASE_PATH = path.resolve(__dirname, '../../src/types/engine/database.js');
const REPOSITORY_PATH = path.resolve(__dirname, '../../src/types/engine/catalog-repository.js');
const ENV_KEYS = ['DATABASE_URL', 'DATABASE_SECRET_ARN', 'DB_SSL'];

function loadFresh() {
  const created = [];   // one entry per `new Pool(...)`
  const connects = [];  // one entry per client borrowed from any pool
  class FakePool {
    constructor(options) {
      this.options = options;
      this.ended = false;
      created.push(this);
    }
    on() {}
    async end() { this.ended = true; }
    async connect() {
      connects.push(this);
      return {
        async query(text) {
          if (/^(BEGIN|COMMIT|ROLLBACK)/.test(text)) return { rows: [] };
          if (/management_modes/.test(text)) return { rows: [{ vendor_id: 1, name: 'TP-Link Omada', need_controller: true, management_modes: ['dashboard'] }] };
          if (/FROM vendor/.test(text)) return { rows: [{ vendor_id: 1, name: 'TP-Link Omada' }] };
          if (/FROM device\b/.test(text)) return { rows: [{ device_id: 1, vendor_id: 1, product_line_id: 10, sku: 'ER605', price: null, name: 'ER605', lifecycle_status: 'ACTIVE' }] };
          if (/FROM product_line/.test(text)) return { rows: [{ product_line_id: 10, vendor_id: 1, category: 'gateway_router', name: 'Entry VPN Routers', line_rank: 1 }] };
          if (/FROM gateway_router_specifications/.test(text)) return { rows: [{ device_id: 1, wan_ports: 2, lan_ports: 3, vpn_supported: true }] };
          return { rows: [] };
        },
        release() {},
      };
    }
  }
  const fakePg = { Pool: FakePool, types: { getTypeParser: () => (value) => value } };

  const original = require.cache[PG_PATH];
  require.cache[PG_PATH] = { id: PG_PATH, filename: PG_PATH, loaded: true, exports: fakePg };
  delete require.cache[DATABASE_PATH];
  delete require.cache[REPOSITORY_PATH];
  const database = require(DATABASE_PATH);
  const repository = require(REPOSITORY_PATH);

  const restore = () => {
    if (original) require.cache[PG_PATH] = original; else delete require.cache[PG_PATH];
    delete require.cache[DATABASE_PATH];
    delete require.cache[REPOSITORY_PATH];
  };
  return { database, repository, created, connects, restore };
}

// Runs `body` with a fresh module graph and a clean environment, then puts everything back.
async function withFresh(env, body) {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  ENV_KEYS.forEach((k) => delete process.env[k]);
  Object.assign(process.env, env);
  const fresh = loadFresh();
  try {
    await body(fresh);
  } finally {
    await fresh.database.closePool();
    fresh.restore();
    ENV_KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
  }
}

const URL_WITH_SSL_OPTIONS = 'postgresql://user:pw@db.example.com:5432/nwp?sslmode=verify-full&sslrootcert=C:%5Ccerts%5Cglobal-bundle.pem';

test('the pool is created once and every later call reuses it', () => withFresh({ DATABASE_URL: URL_WITH_SSL_OPTIONS }, async ({ database, created }) => {
  const first = await database.getPool();
  const second = await database.getPool();
  const third = await database.getPool();
  assert.equal(created.length, 1);
  assert.equal(first, second);
  assert.equal(second, third);
}));

test('simultaneous first calls share one pool instead of each creating their own', () => withFresh({ DATABASE_URL: URL_WITH_SSL_OPTIONS }, async ({ database, created }) => {
  const pools = await Promise.all([database.getPool(), database.getPool(), database.getPool(), database.getPool(), database.getPool()]);
  assert.equal(created.length, 1);
  assert.ok(pools.every((pool) => pool === pools[0]));
}));

test('warm invocations reuse the pool: loading the catalog twice creates one pool and borrows from it twice', () => withFresh({ DATABASE_URL: URL_WITH_SSL_OPTIONS }, async ({ repository, created, connects }) => {
  const now = '2026-11-12';
  const first = await repository.loadEngineData({ now });
  const second = await repository.loadEngineData({ now });
  assert.deepEqual(first.catalog.map((s) => s.sku), ['ER605']);
  assert.deepEqual(second.catalog.map((s) => s.sku), ['ER605']);
  assert.equal(created.length, 1, 'one pool for both invocations');
  assert.equal(connects.length, 2, 'the same pool served both invocations');
  assert.equal(connects[0], connects[1]);
}));

test('pool settings: URL ssl options removed, ssl off unless DB_SSL=true, single-digit pool, fast connect timeout', () => withFresh({ DATABASE_URL: URL_WITH_SSL_OPTIONS }, async ({ database }) => {
  const { options } = await database.getPool();
  assert.equal(options.connectionString, 'postgresql://user:pw@db.example.com:5432/nwp');
  assert.equal(options.ssl, false);
  assert.equal(options.max, 2);
  assert.equal(options.connectionTimeoutMillis, 5000);
}));

test('numeric columns are parsed to numbers and DATE columns stay as YYYY-MM-DD strings', () => withFresh({ DATABASE_URL: URL_WITH_SSL_OPTIONS }, async ({ database }) => {
  const { types } = (await database.getPool()).options;
  assert.equal(types.getTypeParser(1700)('1234.50'), 1234.5);
  assert.equal(types.getTypeParser(1082)('2026-11-12'), '2026-11-12');
}));

test('a failed creation is not cached: the next call retries and then succeeds', () => withFresh({}, async ({ database, created }) => {
  await assert.rejects(database.getPool(), /DATABASE_URL|DATABASE_SECRET_ARN/);
  assert.equal(created.length, 0);
  process.env.DATABASE_URL = URL_WITH_SSL_OPTIONS;
  const pool = await database.getPool();
  assert.equal(created.length, 1);
  assert.ok(pool);
}));

test('a connection setup failure surfaces as a clear CATALOG_DB_CONFIG error, never an empty catalog', () => withFresh({}, async ({ repository }) => {
  await assert.rejects(
    repository.loadEngineData({ now: '2026-11-12' }),
    (error) => error.code === 'CATALOG_DB_CONFIG' && /DATABASE_URL|DATABASE_SECRET_ARN/.test(error.message),
  );
}));

test('closePool ends the pool, and the next call creates a new one', () => withFresh({ DATABASE_URL: URL_WITH_SSL_OPTIONS }, async ({ database, created }) => {
  const first = await database.getPool();
  await database.closePool();
  assert.equal(first.ended, true);
  const second = await database.getPool();
  assert.equal(created.length, 2);
  assert.notEqual(first, second);
}));