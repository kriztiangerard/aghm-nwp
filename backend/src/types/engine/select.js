'use strict';
// tests/engine/select.vendor-independence.test.js
// NWP-ENGINE-007, subtask 10: vendor independence.
//
// The Omada snapshot is one vendor and the synthetic catalogs are the other. The engine
// calls selectSku() once per vendor and category with ONE shared ctx, so the risks are:
//   - one vendor's UNMET leaking into the other vendor's result,
//   - the result depending on which vendor is processed first,
//   - hidden state (module-level variables, mutated pools) shared between calls.
// Every scenario below runs both orders against a shared ctx and compares the healthy
// vendor's result with a baseline taken alone on a fresh ctx.
//
// Runs on node:test (no dependency) or Jest (uses the global `test` when present).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = typeof globalThis.test === 'function' ? globalThis.test : require('node:test');

const { selectSku } = require('../../src/engine/select.js');
const { createCtx } = require('../../src/engine/ctx.js');

const CATALOGS = path.join(__dirname, '..', 'fixtures', 'catalogs');
const OMADA_FILE = 'omada.snapshot.json';
const SYNTHETIC_FILES = ['synthetic-catalog-edgecases.json', 'synthetic-catalog-productlines.json'];
const LINE_CATEGORIES = ['gateway', 'access_point', 'switch'];
const PLANS = ['cost_efficient', 'high_performance'];

const always = () => true;
const never = () => false;

// ---------- helpers ----------

function loadSkus(file) {
    const data = JSON.parse(fs.readFileSync(path.join(CATALOGS, file), 'utf8'));
    const skus = Array.isArray(data) ? data : data.skus;
    assert.ok(Array.isArray(skus) && skus.length > 0, `${file}: expected a non-empty SKU list`);
    return skus;
}

function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
    }
    return value;
}

// The Omada snapshot has null prices until the price updater runs. These copies exist only
// inside the test and are never written back to the fixture.
const withPrices = (skus) =>
    skus.map((sku, i) => ({ ...sku, price: typeof sku.price === 'number' ? sku.price : 1000 * (sku.line_rank || 1) + i }));
const withoutPrices = (skus) => skus.map((sku) => ({ ...sku, price: null }));

// One group = one vendor and one category, which is what selectSku expects as a pool.
function toGroups(skus) {
    const groups = new Map();
    for (const sku of skus) {
        if (!LINE_CATEGORIES.includes(sku.category)) continue;
        const key = `${sku.vendor}\u0000${sku.category}`;
        if (!groups.has(key)) groups.set(key, { vendor: sku.vendor, category: sku.category, pool: [] });
        groups.get(key).pool.push(sku);
    }
    return [...groups.values()].map((group) => deepFreeze(group));
}

function run(group, plan, predicate, ctx) {
    return selectSku({ pool: group.pool, predicate, plan, category: group.category, vendor: group.vendor, ctx });
}

// First group that produces a real pick under a permissive predicate.
function firstSelectableGroup(groups, label) {
    const found = groups.find((group) => run(group, 'cost_efficient', always, createCtx()).ok);
    assert.ok(found, `${label}: no gateway, access_point or switch group yields a pick; check the fixture`);
    return found;
}

// ---------- scenarios ----------

function checkIndependence({ badGroup, badPredicate, okGroup, plan, expectReason }) {
    const baseline = run(okGroup, plan, always, createCtx());
    assert.equal(baseline.ok, true, 'baseline for the healthy vendor must be a pick');

    // Order 1: unmet vendor first, then the healthy vendor, on one shared ctx.
    const ctx1 = createCtx();
    const bad1 = run(badGroup, plan, badPredicate, ctx1);
    const good1 = run(okGroup, plan, always, ctx1);

    // Order 2: the other way round.
    const ctx2 = createCtx();
    const good2 = run(okGroup, plan, always, ctx2);
    const bad2 = run(badGroup, plan, badPredicate, ctx2);

    assert.equal(bad1.ok, false);
    assert.equal(bad1.unmet.vendor, badGroup.vendor);
    assert.equal(bad1.unmet.category, badGroup.category);
    if (expectReason) assert.match(bad1.unmet.reason, expectReason);

    // The healthy vendor is unaffected, in either order.
    assert.deepEqual(good1, baseline);
    assert.deepEqual(good2, baseline);
    assert.deepEqual(bad2, bad1);

    // The shared ctx holds exactly one unmet entry, and it belongs to the unmet vendor only.
    const expectedUnmet = [{ category: badGroup.category, vendor: badGroup.vendor, reason: bad1.unmet.reason }];
    assert.deepEqual(ctx1.unmet, expectedUnmet);
    assert.deepEqual(ctx2.unmet, expectedUnmet);
    assert.ok(ctx1.unmet.every((entry) => entry.vendor !== okGroup.vendor));

    // Per-selection flags on the healthy vendor's result do not pick up anything from the other vendor.
    assert.deepEqual(good1.flags, baseline.flags);
}

for (const syntheticFile of SYNTHETIC_FILES) {
    const omadaGroups = toGroups(withPrices(loadSkus(OMADA_FILE)));
    const omadaNoPriceGroups = toGroups(withoutPrices(loadSkus(OMADA_FILE)));
    const syntheticGroups = toGroups(loadSkus(syntheticFile));

    const omada = firstSelectableGroup(omadaGroups, OMADA_FILE);
    const synthetic = firstSelectableGroup(syntheticGroups, syntheticFile);

    test(`${syntheticFile}: the two catalogs are different vendors`, () => {
        assert.notEqual(omada.vendor, synthetic.vendor, 'Omada and the synthetic catalog must not share a vendor name');
    });

    for (const plan of PLANS) {
        test(`${syntheticFile} [${plan}]: Omada unmet (predicate rejects everything) does not affect the synthetic vendor`, () => {
            checkIndependence({ badGroup: omada, badPredicate: never, okGroup: synthetic, plan });
        });

        test(`${syntheticFile} [${plan}]: synthetic unmet does not affect Omada`, () => {
            checkIndependence({ badGroup: synthetic, badPredicate: never, okGroup: omada, plan });
        });

        test(`${syntheticFile} [${plan}]: Omada with no prices (all unpriced) is unmet and does not affect the synthetic vendor`, () => {
            const omadaUnpriced = omadaNoPriceGroups.find((g) => g.category === omada.category && g.vendor === omada.vendor);
            checkIndependence({
                badGroup: omadaUnpriced,
                badPredicate: always,
                okGroup: synthetic,
                plan,
                expectReason: /unpriced/i
            });
        });
    }
}

test('selectSku keeps no state between calls: the same inputs give the same result on a fresh ctx', () => {
    const omada = firstSelectableGroup(toGroups(withPrices(loadSkus(OMADA_FILE))), OMADA_FILE);
    for (const plan of PLANS) {
        const first = run(omada, plan, always, createCtx());
        const second = run(omada, plan, always, createCtx());
        assert.deepEqual(second, first);
    }
});