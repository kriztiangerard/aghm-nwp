'use strict';
// NWP-ENGINE-013 Enclosure sizing: executable test cases TC-01 to TC-18.
//
// Every test title starts with its test-case id and the step numbers it executes
// ("TC-06 steps 5-6: ..."), so the suite maps one-to-one onto
// NWP-ENGINE-013-test-cases.md. Run: node --test tests/engine/enclosure.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Adjust only this line if the test file moves.
const ENGINE = '../../src/types/engine';

const params = require(`${ENGINE}/params.js`);
const { createCtx } = require(`${ENGINE}/ctx.js`);
const { ValidationError, validateSelectionResult, validateCatalogSku } = require(`${ENGINE}/contracts.js`);
const {
  computeRequiredRackUnits,
  resolveHousingType,
  chooseEnclosure,
} = require(`${ENGINE}/devices/enclosure.js`);

// The Generic vendor name fixed by the story. Fixtures use this literal on purpose,
// so a missing or wrong params.GENERIC_VENDOR_NAME fails the suite instead of silently matching.
const GENERIC = 'Generic';

// ---------- fixtures (fixture prices only, PHP) ----------
const enc = (sku, form_factor, cap, price, extra = {}) => ({
  sku,
  name: `Generic ${cap}U ${form_factor === 'wall' ? 'wall cabinet' : 'floor rack'}`,
  vendor: GENERIC, category: 'enclosure', status: 'ACTIVE', price, currency: 'PHP',
  form_factor, rack_units: cap, ...extra,
});
const ENCLOSURES = () => [
  enc('GENERIC-WALL-4U', 'wall', 4, 2500),
  enc('GENERIC-WALL-6U', 'wall', 6, 3500),
  enc('GENERIC-WALL-9U', 'wall', 9, 5000),
  enc('GENERIC-RACK-12U', 'rack', 12, 9000),
  enc('GENERIC-RACK-22U', 'rack', 22, 15000),
  enc('GENERIC-RACK-42U', 'rack', 42, 28000),
];
const DECOY = () => enc('OMADA-RACK-4U', 'wall', 4, 100, { vendor: 'Omada', name: 'Omada decoy 4U' });

const dev = (category, sku, rack_units, extra = {}) => {
  const base = { sku, name: sku, vendor: 'Omada', category, status: 'ACTIVE', price: 1000, currency: 'PHP' };
  if (category === 'gateway' || category === 'switch' || category === 'access_point') {
    base.line = 'Test line'; base.line_rank = 1;
  }
  if (rack_units !== undefined) base.rack_units = rack_units;
  return { ...base, ...extra };
};
const ctrl = (sku, controller_type, rack_units) => dev('controller', sku, rack_units, {
  controller_type, max_managed_aps: 100, max_managed_switches: 50, max_managed_gateways: 5,
});
const item = (sku, qty = 1) => ({ sku, qty });

const GW = dev('gateway', 'GW-1U', 1);
const SW = dev('switch', 'SW-1U', 1);
const SW_2U = dev('switch', 'SW-2U', 2);
const SW_UNK = dev('switch', 'SW-UNK');
const PRINTER_0U = dev('switch', 'PRINTER-0U', 0);
const CTRL_HW = ctrl('CTRL-HW', 'hardware', 1);
const CTRL_CLOUD = ctrl('CTRL-CLOUD', 'cloud');
const CTRL_CLOUD_1U = ctrl('CTRL-CLOUD-1U', 'cloud', 1);
const CTRL_SW = ctrl('CTRL-SW', 'software');
const AP = dev('access_point', 'AP-5', undefined);
const AP_1U = dev('access_point', 'AP-1U', 1);
const OPTIC = dev('optic', 'OPTIC-1U', 1);
const ENCLOSURE_ITEM = enc('ENCLOSURE-12U', 'rack', 12, 9000);
// Contract v3 has no 'firewall' category, so this fixture is a raw object (see TC-18).
const FW = { sku: 'FW-1U', name: 'FW-1U', vendor: 'Omada', category: 'firewall', rack_units: 1 };

const codes = (ctx) => ctx.flags.map((f) => f.code);
const housingEntries = (ctx) => ctx.ledger.filter((l) => l.field === 'housing');

const run = (over = {}) => {
  const ctx = over.ctx || createCtx();
  const result = chooseEnclosure({
    ctx, catalog: over.catalog || ENCLOSURES(), vendor: over.vendor || 'Omada',
    plan: over.plan || 'CE', housing: over.housing, requiredU: over.requiredU,
  });
  return { ctx, result };
};

const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
};

// ---------- fixture and precondition sanity ----------
describe('Preconditions', () => {
  test('all fixtures pass validateCatalogSku', () => {
    [...ENCLOSURES(), DECOY(), GW, SW, SW_2U, SW_UNK, PRINTER_0U, CTRL_HW, CTRL_CLOUD, CTRL_CLOUD_1U,
      CTRL_SW, AP, AP_1U, OPTIC, ENCLOSURE_ITEM].forEach((s) => {
      assert.equal(validateCatalogSku(s), true, s.sku);
    });
  });

  test('params defines GENERIC_VENDOR_NAME as "Generic" (story subtask: params change)', () => {
    assert.equal(params.GENERIC_VENDOR_NAME, GENERIC);
  });

  test('params.WALL_CABINET_MAX_U is 9 and matches the largest wall cabinet', () => {
    assert.equal(params.WALL_CABINET_MAX_U, 9);
  });
});

// ---------- TC-01, TC-02, TC-03, TC-14, TC-16, TC-17, TC-18: computeRequiredRackUnits ----------
describe('computeRequiredRackUnits', () => {
  test('TC-01 steps 1-2: sums rack_units x qty over gateway, switches and hardware controller; APs excluded; no flags', () => {
    const ctx = createCtx();
    const { requiredU } = computeRequiredRackUnits(
      [item(GW, 1), item(SW, 2), item(CTRL_HW, 1), item(AP, 5)], ctx);
    assert.equal(requiredU, 4);
    assert.deepEqual(ctx.flags, []);
  });

  test('TC-01 step 3: each height is multiplied by its own quantity', () => {
    const { requiredU } = computeRequiredRackUnits([item(SW, 2), item(SW_2U, 3)], createCtx());
    assert.equal(requiredU, 8);
  });

  test('TC-02 steps 1-2: unknown rack_units is left out of the sum and flagged by SKU', () => {
    const ctx = createCtx();
    const { requiredU } = computeRequiredRackUnits([item(GW), item(SW_UNK)], ctx);
    assert.equal(requiredU, 1);
    assert.ok(Number.isFinite(requiredU));
    assert.equal(ctx.flags.length, 1);
    assert.equal(ctx.flags[0].code, 'RACK_UNITS_UNKNOWN');
    assert.match(ctx.flags[0].message, /SW-UNK/);
  });

  test('TC-02 steps 3-4: gateway also unknown gives requiredU 0 and one flag per SKU', () => {
    const ctx = createCtx();
    const gwUnk = dev('gateway', 'GW-UNK');
    const { requiredU } = computeRequiredRackUnits([item(gwUnk), item(SW_UNK)], ctx);
    assert.equal(requiredU, 0);
    assert.deepEqual(codes(ctx), ['RACK_UNITS_UNKNOWN', 'RACK_UNITS_UNKNOWN']);
    assert.match(ctx.flags[0].message, /GW-UNK/);
    assert.match(ctx.flags[1].message, /SW-UNK/);
  });

  test('TC-03 steps 1-3: a 0U hardware controller adds nothing, is not "unknown", and gets a placement advisory', () => {
    const ctx = createCtx();
    const ctrl0 = ctrl('CTRL-HW', 'hardware', 0);
    const { requiredU } = computeRequiredRackUnits([item(GW), item(ctrl0)], ctx);
    assert.equal(requiredU, 1);
    assert.ok(!codes(ctx).includes('RACK_UNITS_UNKNOWN'));
    const adv = ctx.flags.filter((f) => f.code === 'DEVICE_NOT_RACK_MOUNTABLE');
    assert.equal(adv.length, 1);
    assert.match(adv[0].message, /CTRL-HW/);
  });

  test('TC-03 step 4: a 0U switch alongside 1U switches is excluded and advised by SKU', () => {
    const ctx = createCtx();
    const { requiredU } = computeRequiredRackUnits([item(SW, 2), item(PRINTER_0U)], ctx);
    assert.equal(requiredU, 2);
    assert.ok(!codes(ctx).includes('RACK_UNITS_UNKNOWN'));
    const adv = ctx.flags.filter((f) => f.code === 'DEVICE_NOT_RACK_MOUNTABLE');
    assert.equal(adv.length, 1);
    assert.match(adv[0].message, /PRINTER-0U/);
  });

  test('TC-14 steps 1-2: APs with rack_units 0 or absent add nothing and raise no rack flag', () => {
    const ctx = createCtx();
    const ap0 = dev('access_point', 'AP-0U', 0);
    const { requiredU } = computeRequiredRackUnits([item(GW), item(ap0, 3), item(AP, 2)], ctx);
    assert.equal(requiredU, 1);
    assert.deepEqual(ctx.flags, []);
  });

  test('TC-14 step 3: APs that report 1U are still excluded', () => {
    const ctx = createCtx();
    const { requiredU } = computeRequiredRackUnits([item(GW), item(AP_1U, 4)], ctx);
    assert.equal(requiredU, 1);
    assert.deepEqual(ctx.flags, []);
  });

  test('TC-16 steps 1-2: cloud and software controllers with no rack_units are excluded without a flag', () => {
    const ctx = createCtx();
    const { requiredU } = computeRequiredRackUnits([item(GW), item(CTRL_CLOUD), item(CTRL_SW)], ctx);
    assert.equal(requiredU, 1);
    assert.deepEqual(ctx.flags, []);
  });

  test('TC-16 steps 3-4: hardware controller with no rack_units raises RACK_UNITS_UNKNOWN naming it', () => {
    const ctx = createCtx();
    const hwUnk = ctrl('CTRL-HW-UNK', 'hardware');
    const { requiredU } = computeRequiredRackUnits([item(GW), item(hwUnk)], ctx);
    assert.equal(requiredU, 1);
    assert.equal(ctx.flags.length, 1);
    assert.equal(ctx.flags[0].code, 'RACK_UNITS_UNKNOWN');
    assert.match(ctx.flags[0].message, /CTRL-HW-UNK/);
  });

  test('TC-16 step 5: gateway with an integrated controller counts only its own U', () => {
    const ctx = createCtx();
    const gwInt = dev('gateway', 'GW-INTEGRATED', 1, { capabilities: ['controller'] });
    const { requiredU } = computeRequiredRackUnits([item(gwInt)], ctx);
    assert.equal(requiredU, 1);
    assert.deepEqual(ctx.flags, []);
  });

  test('TC-16 step 6: a cloud controller that reports 1U is still excluded', () => {
    const ctx = createCtx();
    const { requiredU } = computeRequiredRackUnits([item(GW), item(CTRL_CLOUD_1U)], ctx);
    assert.equal(requiredU, 1);
    assert.deepEqual(ctx.flags, []);
  });

  test('TC-17 steps 1-2: unrelated categories (cloud controller, optic, enclosure, AP) are excluded; no flags', () => {
    const ctx = createCtx();
    const { requiredU } = computeRequiredRackUnits([
      item(GW, 1), item(SW_2U, 2), item(CTRL_HW, 1), item(CTRL_CLOUD_1U, 1),
      item(OPTIC, 2), item(ENCLOSURE_ITEM, 1), item(AP_1U, 4),
    ], ctx);
    assert.equal(requiredU, 6); // gateway 1U + switches 4U + hardware controller 1U
    assert.deepEqual(ctx.flags, []);
  });

  test('TC-18 step 1: a standalone firewall contributes its rack units', () => {
    const { requiredU } = computeRequiredRackUnits([item(FW, 2)], createCtx());
    assert.equal(requiredU, 2);
  });
});

// ---------- TC-04, TC-05, TC-06: housing ----------
describe('Housing resolution', () => {
  test('TC-04 steps 1-3: closet picks only rack entries, with no housing ledger entry', () => {
    let r = run({ housing: 'closet', requiredU: 3 });
    assert.equal(r.result.sku.sku, 'GENERIC-RACK-12U'); // not GENERIC-WALL-4U
    assert.equal(r.result.sku.form_factor, 'rack');
    assert.equal(housingEntries(r.ctx).length, 0);

    r = run({ housing: 'closet', requiredU: 13 });
    assert.equal(r.result.sku.sku, 'GENERIC-RACK-22U');
    assert.equal(housingEntries(r.ctx).length, 0);
  });

  test('TC-04 step 4: resolveHousingType maps closet to rack without a ledger entry', () => {
    const ctx = createCtx();
    assert.equal(resolveHousingType('closet', 20, ctx), 'rack');
    assert.equal(ctx.ledger.length, 0);
  });

  test('TC-05 steps 1-3: wall picks only wall entries, with no housing ledger entry', () => {
    let r = run({ housing: 'wall', requiredU: 3 });
    assert.equal(r.result.sku.sku, 'GENERIC-WALL-4U');
    assert.equal(r.result.sku.form_factor, 'wall');
    assert.equal(housingEntries(r.ctx).length, 0);

    r = run({ housing: 'wall', requiredU: 9 });
    assert.equal(r.result.sku.sku, 'GENERIC-WALL-9U');
  });

  test('TC-05 step 4: resolveHousingType maps wall to wall without a ledger entry', () => {
    const ctx = createCtx();
    assert.equal(resolveHousingType('wall', 20, ctx), 'wall');
    assert.equal(ctx.ledger.length, 0);
  });

  test('TC-06 steps 1-4: notSure gives wall when requiredU <= 9, rack otherwise, with one housing ledger entry', () => {
    const cases = [
      [4, 'wall', 'GENERIC-WALL-4U'],
      [9, 'wall', 'GENERIC-WALL-9U'], // boundary: <=
      [10, 'rack', 'GENERIC-RACK-12U'], // boundary: >
      [12, 'rack', 'GENERIC-RACK-12U'],
    ];
    for (const [requiredU, type, expectedSku] of cases) {
      const { ctx, result } = run({ housing: 'notSure', requiredU });
      assert.equal(result.sku.sku, expectedSku, `requiredU ${requiredU}`);
      const h = housingEntries(ctx);
      assert.equal(h.length, 1, `requiredU ${requiredU}`);
      assert.equal(h[0].valueUsed, type);
      assert.equal(typeof h[0].reason, 'string');
      assert.ok(h[0].reason.length > 0);
    }
  });

  test('TC-06 step 5: resolveHousingType at 9U returns wall and the reason says it fits the 9U threshold', () => {
    const ctx = createCtx();
    assert.equal(resolveHousingType('notSure', 9, ctx), 'wall');
    assert.equal(ctx.ledger.length, 1);
    assert.equal(ctx.ledger[0].field, 'housing');
    assert.equal(ctx.ledger[0].valueUsed, 'wall');
    assert.match(ctx.ledger[0].reason, /9U/);
    assert.match(ctx.ledger[0].reason, /fits within/);
  });

  test('TC-06 step 6: resolveHousingType at 10U returns rack and the reason says it exceeds the threshold', () => {
    const ctx = createCtx();
    assert.equal(resolveHousingType('notSure', 10, ctx), 'rack');
    assert.equal(ctx.ledger.length, 1);
    assert.equal(ctx.ledger[0].valueUsed, 'rack');
    assert.match(ctx.ledger[0].reason, /exceeds/);
  });
});

// ---------- TC-07, TC-08, TC-13: selection ----------
describe('Selection rule', () => {
  test('TC-07 steps 1-3: smallest capacity >= requiredU wins, an exact fit qualifies, qty is 1', () => {
    for (const [requiredU, expected] of [[5, 'GENERIC-WALL-6U'], [6, 'GENERIC-WALL-6U'], [7, 'GENERIC-WALL-9U']]) {
      const { result } = run({ housing: 'wall', requiredU });
      assert.equal(result.sku.sku, expected, `requiredU ${requiredU}`);
      assert.equal(result.qty, 1);
    }
  });

  test('TC-07 step 4: an entry with a null price is not selectable', () => {
    const catalog = ENCLOSURES().map((e) => (e.sku === 'GENERIC-WALL-6U' ? { ...e, price: null } : e));
    const { result } = run({ housing: 'wall', requiredU: 5, catalog });
    assert.equal(result.sku.sku, 'GENERIC-WALL-9U');
  });

  test('TC-07 step 5: equal capacity, the lower price wins even though its SKU sorts later', () => {
    // The cheaper entry has the HIGHER sku, so removing the price rule would flip the result.
    const catalog = [
      enc('T-A', 'wall', 6, 1000),
      enc('T-B', 'wall', 6, 900),
      enc('GENERIC-WALL-9U', 'wall', 9, 5000),
    ];
    const { result } = run({ housing: 'wall', requiredU: 5, catalog });
    assert.equal(result.sku.sku, 'T-B');
  });

  test('TC-07 step 6: equal capacity and equal price, the lower SKU wins', () => {
    const catalog = [enc('T-B', 'wall', 6, 900), enc('T-A', 'wall', 6, 900)];
    const { result } = run({ housing: 'wall', requiredU: 5, catalog });
    assert.equal(result.sku.sku, 'T-A');
  });

  test('TC-08 steps 1-2: a cheaper, smaller non-Generic enclosure is never chosen, for any plan vendor', () => {
    const catalog = [...ENCLOSURES(), DECOY()];
    for (const vendor of ['Omada', 'UniFi']) {
      const { result } = run({ housing: 'wall', requiredU: 3, catalog, vendor });
      assert.equal(result.sku.sku, 'GENERIC-WALL-4U', vendor);
      assert.equal(result.sku.vendor, GENERIC, vendor);
    }
  });

  test('TC-08 step 3: a vendor-specific 9U and an unpriced generic 9U are both unusable at requiredU 7', () => {
    const catalog = [
      enc('GENERIC-WALL-4U', 'wall', 4, 2500),
      enc('GENERIC-WALL-6U', 'wall', 6, 3500),
      enc('OMADA-WALL-9U', 'wall', 9, 500, { vendor: 'Omada' }),
      enc('GENERIC-WALL-9U-UNPRICED', 'wall', 9, null),
    ];
    const { ctx, result } = run({ housing: 'wall', requiredU: 7, catalog, vendor: 'Omada' });
    assert.equal(result.ok, false);
    assert.equal(result.unmet.vendor, 'Omada');
    assert.equal(ctx.unmet.length, 1);
  });

  test('TC-08 step 4: a catalog whose only enclosure is vendor-specific gives unmet naming the required U', () => {
    const catalog = [enc('OMADA-WALL-6U', 'wall', 6, 500, { vendor: 'Omada' })];
    const { result } = run({ housing: 'wall', requiredU: 5, catalog });
    assert.equal(result.ok, false);
    assert.equal(result.unmet.category, 'enclosure');
    assert.match(result.unmet.reason, /5U/);
  });

  test('TC-13 steps 1-2: Cost-Efficient and High-Performance pick the same SKU for the same requiredU', () => {
    for (const [requiredU, expected] of [[3, 'GENERIC-WALL-4U'], [7, 'GENERIC-WALL-9U']]) {
      const ce = run({ housing: 'wall', requiredU, plan: 'CE' }).result;
      const hp = run({ housing: 'wall', requiredU, plan: 'HP' }).result;
      assert.equal(ce.sku.sku, expected);
      assert.equal(hp.sku.sku, expected);
    }
  });
});

// ---------- TC-09, TC-10: zero and no-fit ----------
describe('Zero-U and no-fit paths', () => {
  test('TC-09 steps 1-2: requiredU 0 with closet is ok, qty 0, one ledger entry, no housing entry, no generic flag', () => {
    const { ctx, result } = run({ housing: 'closet', requiredU: 0 });
    assert.equal(result.ok, true);
    assert.equal(result.qty, 0);
    assert.equal(validateSelectionResult(result), true);
    assert.equal(ctx.ledger.length, 1);
    assert.match(ctx.ledger[0].reason, /no rack-mountable devices/i);
    assert.equal(housingEntries(ctx).length, 0);
    assert.ok(!codes(ctx).includes('ENCLOSURE_GENERIC'));
    assert.ok(!result.flags.some((f) => f.code === 'ENCLOSURE_GENERIC'));
  });

  test('TC-09 steps 3-4: requiredU 0 with notSure is ok, qty 0, one ledger entry, no housing entry, no generic flag', () => {
    const { ctx, result } = run({ housing: 'notSure', requiredU: 0 });
    assert.equal(result.ok, true);
    assert.equal(result.qty, 0);
    assert.equal(validateSelectionResult(result), true);
    assert.equal(ctx.ledger.length, 1);
    assert.match(ctx.ledger[0].reason, /no rack-mountable devices/i);
    assert.equal(housingEntries(ctx).length, 0);
    assert.ok(!codes(ctx).includes('ENCLOSURE_GENERIC'));
    assert.ok(!result.flags.some((f) => f.code === 'ENCLOSURE_GENERIC'));
  });

  test('TC-10 steps 1-2: closet requiredU 50 is unmet and attached to the plan vendor; ctx.unmet matches; reason names 50U', () => {
    const { ctx, result } = run({ housing: 'closet', requiredU: 50, vendor: 'Omada' });
    assert.equal(result.ok, false);
    assert.equal(result.unmet.category, 'enclosure');
    assert.equal(result.unmet.vendor, 'Omada'); // the plan vendor, not Generic
    assert.match(result.unmet.reason, /50U/);
    assert.equal(ctx.unmet.length, 1);
    assert.deepEqual(ctx.unmet[0], { category: 'enclosure', vendor: 'Omada', reason: result.unmet.reason });
    assert.equal(validateSelectionResult(result), true);
  });

  test('TC-10 step 3: wall requiredU 10 is unmet and does not fall back to a rack', () => {
    const { ctx, result } = run({ housing: 'wall', requiredU: 10 });
    assert.equal(result.ok, false);
    assert.equal(result.sku, undefined);
    assert.equal(ctx.unmet.length, 1);
  });

  test('TC-10 step 4: no entries of the required type exist', () => {
    const catalog = ENCLOSURES().filter((e) => e.form_factor === 'rack');
    const { ctx, result } = run({ housing: 'wall', requiredU: 3, catalog, vendor: 'UniFi' });
    assert.equal(result.ok, false);
    assert.equal(result.unmet.vendor, 'UniFi');
    assert.equal(ctx.unmet.length, 1);
  });

  test('TC-10 steps 5-6: boundary 42 fits GENERIC-RACK-42U and 43 is unmet', () => {
    assert.equal(run({ housing: 'closet', requiredU: 42 }).result.sku.sku, 'GENERIC-RACK-42U');
    assert.equal(run({ housing: 'closet', requiredU: 43 }).result.ok, false);
  });

  test('TC-10 step 7: an unmet result does not abort; the same ctx can be reused for the next selection', () => {
    const ctx = createCtx();
    const first = run({ ctx, housing: 'closet', requiredU: 50 });
    const second = run({ ctx, housing: 'wall', requiredU: 3 });
    assert.equal(first.result.ok, false);
    assert.equal(second.result.ok, true);
  });
});

// ---------- TC-11, TC-12: flag and result validation ----------
describe('Generic flag and result validation', () => {
  test('TC-11 steps 1-2: a selected generic enclosure carries ENCLOSURE_GENERIC with its name, SKU and vendor', () => {
    const { ctx, result } = run({ housing: 'wall', requiredU: 5 });
    assert.ok(result.flags.some((f) => f.code === 'ENCLOSURE_GENERIC'));
    assert.ok(codes(ctx).includes('ENCLOSURE_GENERIC')); // also surfaced on the shared ctx
    assert.equal(result.sku.sku, 'GENERIC-WALL-6U');
    assert.equal(result.sku.name, 'Generic 6U wall cabinet');
    assert.equal(result.sku.vendor, GENERIC);
  });

  test('TC-11 step 3: the flag is absent on an unmet result', () => {
    const unmet = run({ housing: 'closet', requiredU: 50 });
    assert.ok(!codes(unmet.ctx).includes('ENCLOSURE_GENERIC'));
  });

  test('TC-11 step 4: the flag is absent on a qty 0 result', () => {
    const zero = run({ housing: 'wall', requiredU: 0 });
    assert.ok(!codes(zero.ctx).includes('ENCLOSURE_GENERIC'));
    assert.ok(!zero.result.flags.some((f) => f.code === 'ENCLOSURE_GENERIC'));
  });

  test('TC-12 steps 1-3: every enclosure outcome passes validateSelectionResult', () => {
    assert.equal(validateSelectionResult(run({ housing: 'wall', requiredU: 5 }).result), true);
    assert.equal(validateSelectionResult(run({ housing: 'wall', requiredU: 0 }).result), true);
    assert.equal(validateSelectionResult(run({ housing: 'closet', requiredU: 50 }).result), true);
  });

  test('TC-12 step 4: {ok:true, qty:1, sku:null} is rejected by the contract', () => {
    assert.throws(() => validateSelectionResult({ ok: true, qty: 1, sku: null, flags: [] }), ValidationError);
  });

  test('TC-12 step 5: the selected enclosure passes validateCatalogSku', () => {
    const { result } = run({ housing: 'closet', requiredU: 13 });
    assert.equal(validateCatalogSku(result.sku), true);
  });
});

// ---------- TC-15: determinism ----------
describe('Determinism', () => {
  test('TC-15 steps 1-4: 100 runs on frozen inputs give identical results and mutate nothing', () => {
    const catalog = deepFreeze([...ENCLOSURES(), DECOY()]);
    const items = deepFreeze([item(GW), item(SW, 2), item(CTRL_HW)]);
    const baseline = {};
    for (let i = 0; i < 100; i += 1) {
      const ctx = createCtx();
      const { requiredU } = computeRequiredRackUnits(items, ctx);
      const result = chooseEnclosure({ ctx, catalog, vendor: 'Omada', plan: 'CE', housing: 'notSure', requiredU });
      const snapshot = { requiredU, result, ledger: ctx.ledger, flags: ctx.flags, unmet: ctx.unmet };
      if (i === 0) Object.assign(baseline, snapshot);
      else assert.deepStrictEqual(snapshot, baseline, `run ${i}`);
    }
    assert.equal(baseline.requiredU, 4);
    assert.equal(baseline.result.sku.sku, 'GENERIC-WALL-4U');
  });
});