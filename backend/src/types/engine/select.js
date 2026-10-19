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
//   4. pick by plan        (subtasks 6-7)  cost-efficient / high-performance step-up      [done]
//   5. tie-break           (subtask 9)     SKU id (built into the comparator)           [done, tests pending]
//   6. UNMET               (subtask 8)     empty pool, no match, or all unpriced        [done]

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
 * Subtasks 6 and 9. Total order for ranking: lowest price first, then SKU id.
 * The SKU id tie-break makes the pick independent of the order of the input pool.
 * Plain string comparison (not localeCompare) so the result does not depend on locale.
 */
function compareByPriceThenSku(a, b) {
    if (a.price !== b.price) return a.price - b.price;
    if (a.sku < b.sku) return -1;
    if (a.sku > b.sku) return 1;
    return 0;
}

/**
 * Subtask 6. Cheapest priced SKU. Pure: does not mutate the input, returns null if empty.
 * Expects a pool that already went through excludeUnpriced.
 * @param {Array<{sku: string, price: number}>} pricedPool
 */
function cheapestSku(pricedPool) {
    if (pricedPool.length === 0) return null;
    return pricedPool.reduce((best, sku) => (compareByPriceThenSku(sku, best) < 0 ? sku : best));
}

/**
 * Subtask 7. High-Performance pick: cheapest priced SKU in the next line above the
 * Cost-Efficient pick, else the same line.
 *
 * "Next line above" = the lowest line_rank greater than the base rank among lines that
 * still have a qualifying priced SKU. It is NOT baseRank + 1, so gaps in the ranks (10, 20, 30)
 * and lines with no qualifying SKU are skipped. line_rank is unique per vendor and
 * category, so comparing ranks is the same as comparing lines.
 *
 * Fallbacks, in order, when nothing sits above the base line:
 *   1. cheapest qualifying SKU in the base line (the Cost-Efficient pick itself when
 *      the base came from this same pool)
 *   2. cheapest qualifying SKU of the whole pool, if the base line has no qualifying SKU
 *      (only possible when the caller passes a cePick that this pool's predicate rejects)
 * A base with no line_rank (categories without product lines) also gets the cheapest SKU.
 *
 * @param {Array} priced  priced, qualifying SKUs (non-empty)
 * @param {{line_rank?: number}} base  the Cost-Efficient pick
 */
function pickHighPerformance(priced, base) {
    const baseRank = base.line_rank;
    if (!Number.isFinite(baseRank)) return cheapestSku(priced);

    const above = priced.filter((sku) => Number.isFinite(sku.line_rank) && sku.line_rank > baseRank);
    if (above.length > 0) {
        const nextRank = Math.min(...above.map((sku) => sku.line_rank));
        return cheapestSku(above.filter((sku) => sku.line_rank === nextRank));
    }

    const sameLine = priced.filter((sku) => sku.line_rank === baseRank);
    return cheapestSku(sameLine.length > 0 ? sameLine : priced);
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
 * @param {Object}   [args.cePick]   high_performance only: the Cost-Efficient SKU already chosen for
 *                                   this category and vendor. Needed whenever the two plans use different
 *                                   predicates (e.g. different VPN tunnel or AP counts). If omitted, the
 *                                   cheapest SKU of this call's own pool stands in for it.
 * @returns {import('./contracts').SelectionResult}
 */
function selectSku({ pool, predicate, plan, category, vendor, ctx, qty = 1, cePick }) {
    // Programmer errors throw. A requirement that cannot be met returns UNMET instead.
    if (!PLANS.has(plan)) {
        throw new Error(`selectSku: unknown plan '${plan}'`);
    }
    if (!ctx || !Array.isArray(ctx.unmet)) {
        throw new Error('selectSku: ctx from createCtx() is required');
    }
    if (!Array.isArray(pool)) {
        throw new TypeError('selectSku: pool must be an array (an empty array is fine and returns UNMET)');
    }
    // unmet.category and unmet.vendor must be non-empty strings (validateSelectionResult).
    if (typeof category !== 'string' || category.trim() === '' || typeof vendor !== 'string' || vendor.trim() === '') {
        throw new TypeError('selectSku: category and vendor must be non-empty strings');
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

    // Subtask 6: Cost-Efficient = cheapest priced SKU (ties broken by SKU id).
    // Subtask 7: High-Performance = step up from the Cost-Efficient pick (see pickHighPerformance).
    let pick;
    if (plan === 'cost_efficient') {
        pick = cheapestSku(priced);
    } else {
        pick = pickHighPerformance(priced, cePick || cheapestSku(priced));
    }

    return { ok: true, sku: pick, qty, flags };
}

module.exports = {
    selectSku,
    filterByLifecycle,
    applyPredicate,
    excludeUnpriced,
    compareByPriceThenSku,
    cheapestSku,
    pickHighPerformance,
    unmetResult,
    ALLOWED_STATUSES,
    UNPRICED_FLAG_CODE
};