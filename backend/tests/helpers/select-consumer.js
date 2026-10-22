'use strict';

const { createCtx } = require('../../src/types/engine/ctx.js');

// This consumer depends only on the selectSku interface.
function selectCheapestSwitch(selectSku, pool) {
    return selectSku({
        pool,
        predicate: () => true,
        plan: 'cost_efficient',
        category: 'switch',
        vendor: 'Test Vendor',
        ctx: createCtx(),
        qty: 1
    });
}

module.exports = { selectCheapestSwitch };
