'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBom } = require('../../src/types/engine/bom');
const { ValidationError, validateBom } = require('../../src/types/engine/contracts');

function sku(overrides = {}) {
  return {
    sku: 'GW-01',
    vendor: 'Omada',
    name: 'Test Gateway',
    category: 'gateway',
    line: 'Test',
    line_rank: 1,
    status: 'ACTIVE',
    price: 100.10,
    currency: 'PHP',
    ...overrides,
  };
}

test('buildBom aggregates repeated selected items and omits zero quantities', () => {
  const catalog = [sku()];
  const bom = buildBom({
    items: [
      { category: 'gateway', sku: 'GW-01', qty: 1 },
      { category: 'gateway', sku: 'GW-01', qty: 2 },
      { category: 'gateway', sku: 'GW-01', qty: 0 },
    ],
  }, catalog);

  assert.deepEqual(bom.lines.map(({ sku, qty }) => ({ sku, qty })), [
    { sku: 'GW-01', qty: 3 },
  ]);
  assert.equal(bom.lines[0].unitPrice, 100.10);
  assert.equal(bom.lines[0].lineTotal, 300.30);
  assert.equal(bom.total, 300.30);
  assert.equal(bom.totalIsPartial, false);
  assert.equal(validateBom(bom), true);
});

test('buildBom uses catalog identity, status, and provenance', () => {
  const catalog = [sku({
    name: 'Catalog Gateway',
    price_source: 'manual',
    is_stale: true,
    price_updated_at: '2026-10-01',
  })];

  const bom = buildBom({
    items: [{ category: 'gateway', sku: 'GW-01', qty: 1 }],
  }, catalog);

  assert.deepEqual(bom.lines[0], {
    category: 'gateway',
    sku: 'GW-01',
    name: 'Catalog Gateway',
    vendor: 'Omada',
    qty: 1,
    unitPrice: 100.10,
    lineTotal: 100.10,
    status: 'ACTIVE',
    isGeneric: false,
    priceSource: 'manual',
    isStale: true,
    priceUpdatedAt: '2026-10-01',
  });
});

test('buildBom omits optional provenance fields when the catalog row does not provide them', () => {
  const catalogRow = sku();
  delete catalogRow.price_source;
  delete catalogRow.is_stale;
  delete catalogRow.price_updated_at;

  const bom = buildBom({
    items: [{ category: 'gateway', sku: 'GW-01', qty: 1 }],
  }, [catalogRow]);

  assert.equal(Object.hasOwn(bom.lines[0], 'priceSource'), false);
  assert.equal(Object.hasOwn(bom.lines[0], 'isStale'), false);
  assert.equal(Object.hasOwn(bom.lines[0], 'priceUpdatedAt'), false);
});

test('buildBom is clock-independent and does not add generatedAt', () => {
  const originalNow = Date.now;
  Date.now = () => {
    throw new Error('buildBom must not access the clock');
  };

  try {
    const bom = buildBom({
      items: [{ category: 'gateway', sku: 'GW-01', qty: 1 }],
    }, [sku()]);

    assert.equal(Object.hasOwn(bom, 'generatedAt'), false);
    assert.deepEqual(
      bom,
      buildBom({
        items: [{ category: 'gateway', sku: 'GW-01', qty: 1 }],
      }, [sku()]),
    );
  } finally {
    Date.now = originalNow;
  }
});

test('buildBom returns JSON-safe output accepted by validateBom', () => {
  const bom = buildBom({
    items: [{ category: 'gateway', sku: 'GW-01', qty: 1 }],
  }, [sku({
    price_source: 'synchronized',
    is_stale: true,
    price_updated_at: '2026-10-01',
  })]);

  const serialized = JSON.stringify(bom);
  const restored = JSON.parse(serialized);

  assert.equal(validateBom(restored), true);
  assert.deepEqual(restored, bom);
});

test('buildBom uses integer cents for the total', () => {
  const catalog = [
    sku({ sku: 'GW-01', price: 0.10 }),
    sku({ sku: 'GW-02', price: 0.20 }),
  ];
  const bom = buildBom({
    items: [
      { category: 'gateway', sku: 'GW-02', qty: 3 },
      { category: 'gateway', sku: 'GW-01', qty: 3 },
    ],
  }, catalog);

  assert.equal(bom.total, 0.90);
});

test('buildBom sorts lines by category order then SKU', () => {
  const catalog = [
    sku({ sku: 'SW-02', category: 'switch', price: 10 }),
    sku({ sku: 'GW-02', price: 10 }),
    sku({ sku: 'GW-01', price: 10 }),
  ];
  const bom = buildBom({
    items: [
      { category: 'switch', sku: 'SW-02', qty: 1 },
      { category: 'gateway', sku: 'GW-02', qty: 1 },
      { category: 'gateway', sku: 'GW-01', qty: 1 },
    ],
  }, catalog);

  assert.deepEqual(bom.lines.map((line) => line.sku), [
    'GW-01',
    'GW-02',
    'SW-02',
  ]);
});

test('buildBom marks an empty BOM as partial with a null total', () => {
  const bom = buildBom({ items: [] }, []);
  assert.equal(bom.total, null);
  assert.equal(bom.totalIsPartial, true);
  assert.equal(bom.currency, 'PHP');
});

test('buildBom marks a BOM with unmet requirements as partial', () => {
  const bom = buildBom({
    items: [{ category: 'gateway', sku: 'GW-01', qty: 1 }],
    unmet: [{ category: 'switch' }],
  }, [sku()]);

  assert.equal(bom.total, 100.10);
  assert.equal(bom.totalIsPartial, true);
});

test('buildBom marks null-priced lines partial and excludes them from total', () => {
  const catalog = [
    sku({ sku: 'GW-01', price: null }),
    sku({ sku: 'GW-02', price: 50 }),
  ];
  const bom = buildBom({
    items: [
      { category: 'gateway', sku: 'GW-01', qty: 1 },
      { category: 'gateway', sku: 'GW-02', qty: 2 },
    ],
  }, catalog);

  assert.equal(bom.lines[0].unitPrice, null);
  assert.equal(bom.lines[0].lineTotal, null);
  assert.equal(bom.total, 100);
  assert.equal(bom.totalIsPartial, true);
});

test('buildBom marks Generic enclosure lines correctly', () => {
  const enclosure = sku({
    sku: 'ENC-01',
    vendor: 'Generic',
    category: 'enclosure',
    form_factor: 'rack',
    rack_units: 6,
    line: undefined,
    line_rank: undefined,
  });
  const bom = buildBom({
    items: [{ category: 'enclosure', sku: 'ENC-01', qty: 1 }],
  }, [enclosure]);

  assert.equal(bom.lines[0].isGeneric, true);
  assert.equal(bom.lines[0].vendor, 'Generic');
});

test('buildBom rejects invalid quantities', () => {
  for (const qty of [-1, 1.5, '2', null]) {
    assert.throws(
      () => buildBom({
        items: [{ category: 'gateway', sku: 'GW-01', qty }],
      }, [sku()]),
      ValidationError,
    );
  }
});

test('buildBom rejects a selected SKU missing from the snapshot', () => {
  assert.throws(
    () => buildBom({
      items: [{ category: 'gateway', sku: 'MISSING', qty: 1 }],
    }, [sku()]),
    (error) => error instanceof ValidationError && /MISSING/.test(error.message),
  );
});

test('buildBom rejects mixed currencies', () => {
  assert.throws(
    () => buildBom({
      items: [
        { category: 'gateway', sku: 'GW-01', qty: 1 },
        { category: 'gateway', sku: 'GW-02', qty: 1 },
      ],
    }, [
      sku({ sku: 'GW-01', currency: 'PHP' }),
      sku({ sku: 'GW-02', currency: 'USD' }),
    ]),
    (error) => error instanceof ValidationError && /one currency/.test(error.message),
  );
});

test('buildBom does not mutate the supplied plan or catalog', () => {
  const plan = {
    items: [{ category: 'gateway', sku: 'GW-01', qty: 1 }],
  };
  const catalog = [sku()];
  const planBefore = structuredClone(plan);
  const catalogBefore = structuredClone(catalog);

  buildBom(plan, catalog);

  assert.deepEqual(plan, planBefore);
  assert.deepEqual(catalog, catalogBefore);
});

test('buildBom rejects discontinued catalog rows', () => {
  assert.throws(
    () => buildBom({
      items: [{ category: 'gateway', sku: 'GW-01', qty: 1 }],
    }, [sku({ status: 'DISCONTINUED' })]),
    ValidationError,
  );
});
