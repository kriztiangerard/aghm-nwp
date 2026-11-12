
'use strict';

// Test stub matching the NWP-ENGINE-007 selection helper contract.
// Keep the same argument shape and SelectionResult shape as selectSku().

function selectSku({
    pool,
    predicate,
    plan,
    category,
    vendor,
    ctx,
    qty = 1,
    cePick
}) {
    if (!Array.isArray(pool)) {
        throw new TypeError('select-stub: pool must be an array');
    }

    if (typeof predicate !== 'function') {
        throw new TypeError('select-stub: predicate must be a function');
    }

    if (!ctx || !Array.isArray(ctx.unmet) || !Array.isArray(ctx.flags)) {
        throw new TypeError('select-stub: valid ctx is required');
    }

    if (!['cost_efficient', 'high_performance'].includes(plan)) {
        throw new Error(`select-stub: unknown plan '${plan}'`);
    }

    const eligible = pool
        .filter((sku) => ['ACTIVE', 'SUNSETTING'].includes(sku.status))
        .filter(predicate);

    const priced = eligible.filter(
        (sku) => typeof sku.price === 'number' && Number.isFinite(sku.price)
    );

    if (priced.length === 0) {
        const reason = eligible.length === 0
            ? 'No purchasable SKU meets the requirements'
            : 'All qualifying SKUs are unpriced';

        const unmet = { category, vendor, reason };
        ctx.unmet.push(unmet);

        return { ok: false, unmet };
    }

    const flags = [];

    if (priced.length < eligible.length) {
        const flag = {
            code: 'UNPRICED_SKUS_EXCLUDED',
            message: 'unpriced SKUs excluded'
        };

        ctx.flags.push(flag);
        flags.push(flag);
    }

    const compare = (a, b) =>
        (a.price - b.price) ||
        (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0);

    let candidates = priced;

    if (plan === 'high_performance') {
        const base = cePick || [...priced].sort(compare)[0];

        if (Number.isFinite(base.line_rank)) {
            const higher = priced.filter(
                (sku) => Number.isFinite(sku.line_rank) &&
                    sku.line_rank > base.line_rank
            );

            if (higher.length > 0) {
                const nextRank = Math.min(
                    ...higher.map((sku) => sku.line_rank)
                );

                candidates = higher.filter(
                    (sku) => sku.line_rank === nextRank
                );
            } else {
                const sameLine = priced.filter(
                    (sku) => sku.line_rank === base.line_rank
                );

                candidates = sameLine.length > 0 ? sameLine : priced;
            }
        }
    }

    const sku = [...candidates].sort(compare)[0];

    return { ok: true, sku, qty, flags };
}

module.exports = { selectSku };
