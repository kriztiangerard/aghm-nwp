'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// To swap implementations, change only this import.
const { selectSku } = require('../src/types/engine/select.js');
// const { selectSku } = require('./helpers/select-stub.js');

const { selectCheapestSwitch } = require('./helpers/select-consumer.js');

test('TC-009: dependent consumer works with the selected helper import', () => {
    const pool = [
        { sku: 'SW-200', price: 200, status: 'ACTIVE' },
        { sku: 'SW-100', price: 100, status: 'ACTIVE' }
    ];

    const result = selectCheapestSwitch(selectSku, pool);

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, 'SW-100');
    assert.equal(result.qty, 1);
    assert.ok(Array.isArray(result.flags));
});
