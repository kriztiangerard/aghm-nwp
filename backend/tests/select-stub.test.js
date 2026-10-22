
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const realHelper = require('../src/types/engine/select.js');
const stubHelper = require('./helpers/select-stub.js');
const { createCtx } = require('../src/types/engine/ctx.js');
const {
    validateSelectionResult
} = require('../src/types/engine/contracts.js');

test('NWP-ENGINE-007-TC-009: stub matches the real helper contract', () => {
    assert.equal(typeof realHelper.selectSku, 'function');
    assert.equal(typeof stubHelper.selectSku, 'function');

    const pool = [
        {
            sku: 'SW-003',
            price: 150,
            status: 'ACTIVE',
            line_rank: 1
        },
        {
            sku: 'SW-001',
            price: 100,
            status: 'ACTIVE',
            line_rank: 1
        },
        {
            sku: 'SW-002',
            price: 120,
            status: 'SUNSETTING',
            line_rank: 1
        }
    ];

    const args = {
        pool,
        predicate: () => true,
        plan: 'cost_efficient',
        category: 'switch',
        vendor: 'Test Vendor',
        qty: 1
    };

    const realResult = realHelper.selectSku({
        ...args,
        ctx: createCtx()
    });

    const stubResult = stubHelper.selectSku({
        ...args,
        ctx: createCtx()
    });

    assert.equal(realResult.ok, true);
    assert.equal(stubResult.ok, true);

    assert.equal(realResult.sku.sku, 'SW-001');
    assert.equal(stubResult.sku.sku, 'SW-001');

    assert.equal(validateSelectionResult(realResult), true);
    assert.equal(validateSelectionResult(stubResult), true);

    assert.deepEqual(
        Object.keys(stubResult).sort(),
        Object.keys(realResult).sort()
    );

    assert.deepEqual(
        Object.keys(stubResult.sku).sort(),
        Object.keys(realResult.sku).sort()
    );
});
