import { registerDistributorSource } from '../backend/src/pricing/distributor-sources/register';
import {
  activateDistributorSource,
  deactivateDistributorSource,
} from '../backend/src/pricing/distributor-sources/activation';

function mockPool(queryImpl: (sql: string, params?: unknown[]) => any) {
  return { query: jest.fn(queryImpl) } as any;
}

describe('registerDistributorSource', () => {
  it('rejects incomplete input without hitting the database', async () => {
    const pool = mockPool(() => {
      throw new Error('should not be called');
    });
    const result = await registerDistributorSource(pool, { vendorName: 'TP-Link' });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('rejects an unknown vendor', async () => {
    const pool = mockPool((sql) => {
      if (sql.includes('FROM vendor')) return { rowCount: 0, rows: [] };
      throw new Error('unexpected query: ' + sql);
    });
    const result = await registerDistributorSource(pool, {
      vendorName: 'NotARealVendor',
      distributorName: 'DynaQuest PC',
      sourceUrl: 'https://example.com/product/1',
    });
    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toMatch(/Unknown vendor/);
  });

  it('inserts a pricing_source row when vendor and distributor exist', async () => {
    const pool = mockPool((sql) => {
      if (sql.includes('FROM vendor')) return { rowCount: 1, rows: [{ vendor_id: 1 }] };
      if (sql.includes('FROM distributor')) return { rowCount: 1, rows: [{ distributor_id: 2 }] };
      if (sql.includes('INSERT INTO pricing_source')) {
        return {
          rowCount: 1,
          rows: [{ source_id: 10, vendor_id: 1, distributor_id: 2, source_url: 'https://example.com/product/1', is_active: true, last_updated: '2026-01-01' }],
        };
      }
      throw new Error('unexpected query: ' + sql);
    });
    const result = await registerDistributorSource(pool, {
      vendorName: 'TP-Link',
      distributorName: 'DynaQuest PC',
      sourceUrl: 'https://example.com/product/1',
    });
    expect(result.success).toBe(true);
    expect(result.source?.source_id).toBe(10);
    expect(result.source?.is_active).toBe(true);
  });
});

describe('activation', () => {
  it('activates a source', async () => {
    const pool = mockPool(() => ({
      rowCount: 1,
      rows: [{ source_id: 5, is_active: true }],
    }));
    const result = await activateDistributorSource(pool, 5);
    expect(result?.is_active).toBe(true);
  });

  it('deactivates a source', async () => {
    const pool = mockPool(() => ({
      rowCount: 1,
      rows: [{ source_id: 5, is_active: false }],
    }));
    const result = await deactivateDistributorSource(pool, 5);
    expect(result?.is_active).toBe(false);
  });

  it('returns null when the source does not exist', async () => {
    const pool = mockPool(() => ({ rowCount: 0, rows: [] }));
    const result = await activateDistributorSource(pool, 999);
    expect(result).toBeNull();
  });
});

import { getActiveDistributorSources } from '../backend/src/pricing/distributor-sources/get-active-sources';

describe('getActiveDistributorSources', () => {
  it('returns active configured distributor sources', async () => {
    const pool = mockPool((sql) => {
      expect(sql).toContain('WHERE ps.is_active = TRUE');

      return {
        rowCount: 1,
        rows: [
          {
            source_id: 10,
            vendor_id: 1,
            distributor_id: 2,
            source_url: 'https://example.com/product/1',
            is_active: true,
            last_updated: '2026-09-18',
            vendor_name: 'TP-Link',
            distributor_name: 'DynaQuest PC',
          },
        ],
      };
    });

    const sources = await getActiveDistributorSources(pool);

    expect(sources).toHaveLength(1);
    expect(sources[0].is_active).toBe(true);
    expect(sources[0].distributor_name).toBe('DynaQuest PC');
  });

  it('returns no deactivated sources', async () => {
    const pool = mockPool(() => ({
      rowCount: 0,
      rows: [],
    }));

    const sources = await getActiveDistributorSources(pool);

    expect(sources).toEqual([]);
  });
});