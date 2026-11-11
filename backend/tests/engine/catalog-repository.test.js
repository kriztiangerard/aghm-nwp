'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngineData } = require('../../src/types/engine/catalog-repository');

test('loadEngineData loads active canonical SKUs and excludes Generic plan vendor', async () => {
  const queries = [];
  const pool = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes('FROM vendor')) {
        return {
          rows: [{
            name: 'TP-Link Omada',
            needController: false,
            managementModes: ['dashboard'],
          }],
        };
      }
      return {
        rows: [{
          sku: {
            sku: 'GW-01',
            vendor: 'TP-Link Omada',
            name: 'Test Gateway',
            category: 'gateway',
            line: 'Entry',
            line_rank: 1,
            status: 'ACTIVE',
            price: null,
            currency: 'PHP',
          },
        }],
      };
    },
  };

  const data = await loadEngineData(pool);

  assert.deepEqual(data.vendors, [{
    name: 'TP-Link Omada',
    needController: false,
    managementModes: ['dashboard'],
  }]);
  assert.deepEqual(data.catalog, [{
    sku: 'GW-01',
    vendor: 'TP-Link Omada',
    name: 'Test Gateway',
    category: 'gateway',
    line: 'Entry',
    line_rank: 1,
    status: 'ACTIVE',
    price: null,
    currency: 'PHP',
  }]);
  assert.match(queries[0].sql, /management_modes/);
  assert.deepEqual(queries[0].values, ['Generic']);
  assert.match(queries[1].sql, /is_active = TRUE/);
});

test('loadEngineData fails explicitly when the canonical catalog is empty', async () => {
  await assert.rejects(
    () => loadEngineData({
      async query(sql) {
        return { rows: sql.includes('FROM vendor') ? [{ name: 'Omada' }] : [] };
      },
    }),
    /No active engine catalog SKUs/,
  );
});
