'use strict';
// src/engine/select.js
// NWP-ENGINE-007: one selection helper for every device category.
// CommonJS, to match the Lambda code, contracts.js and ctx.js.
//
// Returns a SelectionResult exactly as defined in contracts.js:
//   {ok:true,  sku, qty, flags[]}
//   {ok:false, unmet:{category, vendor, reason}}      <- this is the story's "UNMET"
// Every unmet result is also recorded on ctx via addUnmet(), so the engine-level
// ctx.unmet list stays complete.
//
// Pipeline (each step is a pure function, built up subtask by subtask):
//   1. filterByLifecycle   (subtask 3)     drop DISCONTINUED, keep ACTIVE + SUNSETTING   [done]
//   2. applyPredicate      (subtask 4)     caller's constraints, no category fields here [done]
//   3. excludeUnpriced     (subtask 5)     price == null dropped, "unpriced SKUs excluded" flag [done]
//   4. pick by plan        (subtasks 6-7)  cost-efficient / high-performance
//   5. tie-break           (subtask 9)     SKU id
//   6. UNMET               (subtask 8)     wired for empty pools now; all-unpriced comes with subtask 5

const { addUnmet, addFlag } = require('./ctx.js');

const UNPRICED_FLAG_CODE = 'UNPRICED_SKUS_EXCLUDED';
const UNPRICED_FLAG_MESSAGE = 'unpriced SKUs excluded';

// Statuses are uppercase because validateCatalogSku() in contracts.js only accepts
// ACTIVE | SUNSETTING | DISCONTINUED. Allowlist, not a blocklist: a missing or
// unknown status is excluded, never recommended.
const ALLOWED_STATUSES = new Set(['ACTIVE', 'SUNSETTING']);

const PLANS = new Set(['cost_efficient', 'high_performance']);

/**
 * Subtask 3. Keep only purchasable SKUs. Pure: returns a new array.
 * @param {Array<{status?: string}>} pool
 */
function filterByLifecycle(pool) {
    return pool.filter((sku) => ALLOWED_STATUSES.has(sku.status));
}

/**
 * Subtask 4. Apply the caller's constraints. Pure: returns a new array.
 * The predicate is the ONLY place category-specific fields (ports, PoE budget,
 * throughput, ...) are read. This helper never looks at them, so the same code
 * serves switches, APs and gateways.
 * @param {Array} pool
 * @param {(sku: Object) => boolean} predicate
 */
function applyPredicate(pool, predicate) {
    if (typeof predicate !== 'function') {
        throw new TypeError('selectSku: predicate must be a function (sku) => boolean');
    }
    return pool.filter((sku) => predicate(sku));
}

/**
 * Subtask 5. Drop SKUs with no usable price. Pure: returns a new array plus a count.
 * price null (or missing / non-finite) = unknown, never ranked. price 0 is a real
 * price (genuinely free) and is kept, so test with a number check, not truthiness.
 * @param {Array<{price?: number|null}>} pool
 * @returns {{priced: Array, excludedCount: number}}
 */
function excludeUnpriced(pool) {
    const priced = pool.filter((sku) => typeof sku.price === 'number' && Number.isFinite(sku.price));
    return { priced, excludedCount: pool.length - priced.length };
}

/**
 * Records the unmet requirement on ctx (ctx.unmet) and returns the {ok:false}
 * SelectionResult. category and vendor must be non-empty (validateSelectionResult).
 */
function unmetResult(ctx, category, vendor, reason) {
    addUnmet(ctx, category, vendor, reason);
    return { ok: false, unmet: { category, vendor, reason } };
}

/**
 * Selection entry point.
 *
 * category and vendor are passed in (not read from the pool) because the pool can be
 * empty, and contracts.js requires unmet.category and unmet.vendor to be non-empty strings.
 * qty is passed in because the helper must not know how many units a category needs;
 * contracts.js requires qty on every ok:true result.
 *
 * @param {Object}   args
 * @param {Array}    args.pool       CatalogSku[] for ONE vendor and ONE category
 * @param {(sku: Object) => boolean} args.predicate  the caller's constraints
 * @param {'cost_efficient'|'high_performance'} args.plan
 * @param {string}   args.category   CatalogSku category, e.g. 'switch'
 * @param {string}   args.vendor
 * @param {Object}   args.ctx        engine context from createCtx() (ctx.js)
 * @param {number}   [args.qty=1]
 * @returns {import('./contracts').SelectionResult}
 */
function selectSku({ pool, predicate, plan, category, vendor, ctx, qty = 1 }) {
    if (!PLANS.has(plan)) {
        throw new Error(`selectSku: unknown plan '${plan}'`);
    }
    if (!ctx || !Array.isArray(ctx.unmet)) {
        throw new Error('selectSku: ctx from createCtx() is required');
    }

    const purchasable = filterByLifecycle(pool);
    if (purchasable.length === 0) {
        return unmetResult(ctx, category, vendor, 'No purchasable (ACTIVE or SUNSETTING) SKUs available');
    }

    const qualifying = applyPredicate(purchasable, predicate);
    if (qualifying.length === 0) {
        return unmetResult(ctx, category, vendor, 'No purchasable SKU meets the requirements');
    }

    const { priced, excludedCount } = excludeUnpriced(qualifying);
    if (priced.length === 0) {
        return unmetResult(ctx, category, vendor, 'All qualifying SKUs are unpriced');
    }

    // One flag per call, recorded on ctx (engine-wide) and returned on the result (per selection).
    const flags = [];
    if (excludedCount > 0) {
        addFlag(ctx, UNPRICED_FLAG_CODE, UNPRICED_FLAG_MESSAGE);
        flags.push({ code: UNPRICED_FLAG_CODE, message: UNPRICED_FLAG_MESSAGE });
    }

    // TODO subtasks 6-7, 9: pick by plan with deterministic tie-break (SKU id)

    return { ok: true, sku: priced[0], qty, flags }; // placeholder pick until subtask 6
}

module.exports = { selectSku, filterByLifecycle, applyPredicate, excludeUnpriced, unmetResult, ALLOWED_STATUSES, UNPRICED_FLAG_CODE };