'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { selectSku, UNPRICED_FLAG_CODE } = require('../src/types/engine/select.js');
const { createCtx } = require('../src/types/engine/ctx.js');

function sku(id, price, rank = 1, status = 'ACTIVE', vendor = 'Vendor-A', extra = {}) {
    return {
        sku: id,
        vendor,
        category: 'switch',
        line: `Line-${rank}`,
        line_rank: rank,
        status,
        price,
        currency: 'PHP',
        ...extra
    };
}

function run(pool, plan = 'cost_efficient', options = {}) {
    const ctx = options.ctx || createCtx();
    const result = selectSku({
        pool,
        predicate: options.predicate || (() => true),
        plan,
        category: options.category || 'switch',
        vendor: options.vendor || 'Vendor-A',
        ctx,
        qty: options.qty ?? 1,
        cePick: options.cePick
    });
    return { result, ctx };
}

test('TC-001: CE selects cheapest priced SKU and flags unpriced exclusions', () => {
    const { result, ctx } = run([
        sku('SW-200', 200),
        sku('SW-100', 100),
        sku('SW-UNKNOWN', null)
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, 'SW-100');
    assert.deepEqual(result.flags, [{
        code: UNPRICED_FLAG_CODE,
        message: 'unpriced SKUs excluded'
    }]);
    assert.equal(ctx.flags.length, 1);
    assert.equal(ctx.unmet.length, 0);
});

test('TC-002: HP selects the cheapest SKU in the next qualifying line', () => {
    const pool = [
        sku('A-1', 100, 1),
        sku('B-2', 180, 2),
        sku('B-1', 200, 2),
        sku('C-1', 170, 3)
    ];
    const cePick = pool[0];

    const { result } = run(pool, 'high_performance', { cePick });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, 'B-2');
});

test('TC-003: HP falls back to the cheapest SKU on the same line', () => {
    const pool = [
        sku('SW-B', 150, 1),
        sku('SW-A', 100, 1)
    ];

    const { result } = run(pool, 'high_performance', {
        cePick: pool[0]
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, 'SW-A');
});

test('TC-004: empty, all-unpriced, and rejected pools return UNMET', () => {
    const cases = [
        { pool: [], predicate: () => true },
        { pool: [sku('SW-NULL', null)], predicate: () => true },
        { pool: [sku('SW-REJECTED', 100)], predicate: () => false }
    ];

    for (const item of cases) {
        const ctx = createCtx();
        assert.doesNotThrow(() => {
            const result = run(item.pool, 'cost_efficient', {
                ctx,
                predicate: item.predicate,
                vendor: 'Vendor-A'
            }).result;

            assert.equal(result.ok, false);
            assert.equal(result.unmet.vendor, 'Vendor-A');
            assert.equal(result.unmet.category, 'switch');
            assert.equal(ctx.unmet.length, 1);
        });
    }
});

test('TC-005: equal-price tie-break is deterministic regardless of input order', () => {
    const firstOrder = [
        sku('SW-C', 100),
        sku('SW-A', 100),
        sku('SW-B', 100)
    ];
    const secondOrder = [...firstOrder].reverse();

    assert.equal(run(firstOrder).result.sku.sku, 'SW-A');
    assert.equal(run(secondOrder).result.sku.sku, 'SW-A');

    const cePick = sku('BASE', 100, 1);
    const hpPool = [
        sku('NEXT-B', 200, 2),
        sku('NEXT-A', 200, 2)
    ];

    assert.equal(
        run(hpPool, 'high_performance', { cePick }).result.sku.sku,
        'NEXT-A'
    );
    assert.equal(
        run([...hpPool].reverse(), 'high_performance', { cePick }).result.sku.sku,
        'NEXT-A'
    );
});

test('TC-006: predicate applies caller-defined category constraints', () => {
    const accesses = [];
    const candidate = new Proxy(
        sku('SW-POE', 100, 1, 'ACTIVE', 'Vendor-A', { poe_ports: 8 }),
        {
            get(target, property, receiver) {
                if (property === 'poe_ports') accesses.push(String(property));
                return Reflect.get(target, property, receiver);
            }
        }
    );

    const { result } = run([candidate], 'cost_efficient', {
        predicate: (item) => item.poe_ports >= 8
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, 'SW-POE');
    assert.deepEqual(accesses, ['poe_ports']);
});

test('TC-007: excludes DISCONTINUED and retains ACTIVE and SUNSETTING', () => {
    const { result } = run([
        sku('SW-DISCONTINUED', 1, 1, 'DISCONTINUED'),
        sku('SW-SUNSETTING', 20, 1, 'SUNSETTING'),
        sku('SW-ACTIVE', 30, 1, 'ACTIVE')
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, 'SW-SUNSETTING');
});

test('TC-008: vendor-specific results and UNMET records stay correctly attributed', () => {
    function runVendorSequence(order) {
        const ctx = createCtx();
        const results = {};

        for (const vendor of order) {
            if (vendor === 'Vendor-A') {
                results[vendor] = run(
                    [sku('A-UNKNOWN', null, 1, 'ACTIVE', vendor)],
                    'cost_efficient',
                    { ctx, vendor }
                ).result;
            } else {
                results[vendor] = run(
                    [sku('B-100', 100, 1, 'ACTIVE', vendor)],
                    'cost_efficient',
                    { ctx, vendor }
                ).result;
            }
        }

        return { ctx, results };
    }

    for (const order of [
        ['Vendor-A', 'Vendor-B'],
        ['Vendor-B', 'Vendor-A']
    ]) {
        const { ctx, results } = runVendorSequence(order);

        assert.equal(results['Vendor-A'].ok, false);
        assert.equal(results['Vendor-A'].unmet.vendor, 'Vendor-A');

        assert.equal(results['Vendor-B'].ok, true);
        assert.equal(results['Vendor-B'].sku.sku, 'B-100');
        assert.deepEqual(results['Vendor-B'].flags, []);

        assert.equal(ctx.unmet.length, 1);
        assert.equal(ctx.unmet[0].vendor, 'Vendor-A');
    }
});

test('price zero is valid and is cheaper than a positive price', () => {
    const { result } = run([
        sku('SW-FREE', 0),
        sku('SW-PAID', 10)
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, 'SW-FREE');
});

test('missing and non-finite prices are excluded from ranking', () => {
    const { result } = run([
        sku('SW-MISSING', undefined),
        sku('SW-NAN', NaN),
        sku('SW-INFINITY', Infinity),
        sku('SW-VALID', 50)
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, 'SW-VALID');
    assert.equal(result.flags[0].code, UNPRICED_FLAG_CODE);
});
