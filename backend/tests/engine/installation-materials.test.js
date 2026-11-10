'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assembleBom,
  buildInstallationMaterials,
} = require('../../src/types/engine/bom');

const config = require('../../src/types/engine/installation-materials.json');

test('installation materials includes all four configured reference items', () => {
  const result = buildInstallationMaterials({ optics: null });

  assert.equal(result.currency, 'PHP');
  assert.equal(result.asOfDate, '2026-11-10');
  assert.equal(result.pricingBasis, 'Representative unit prices');
  assert.equal(result.items.length, 4);

  assert.deepEqual(
    result.items.map((item) => item.item),
    ['cat6_cabling', 'patch_cords', 'rj45_connectors', 'patch_panels'],
  );

  for (const item of result.items) {
    assert.ok(item.description);
    assert.ok(item.unit);
    assert.ok(Object.hasOwn(item, 'representativeUnitPrice'));
    assert.ok(item.priceDisplay);
  }
});

test('copper plan omits the SFP row when optics is null', () => {
  const result = buildInstallationMaterials({ optics: null });

  assert.equal(
    result.items.some((item) => item.item === 'sfp_modules'),
    false,
  );
});

test('plan without optics also omits the SFP row', () => {
  const result = buildInstallationMaterials({});

  assert.equal(
    result.items.some((item) => item.item === 'sfp_modules'),
    false,
  );
});

test('fiber plan adds an SFP row using plan optics values', () => {
  const result = buildInstallationMaterials({
    optics: {
      links: 2,
      modules: 4,
      formFactor: 'SFP',
    },
  });

  const sfp = result.items.find((item) => item.item === 'sfp_modules');

  assert.ok(sfp);
  assert.equal(sfp.links, 2);
  assert.equal(sfp.modules, 4);
  assert.equal(sfp.formFactor, 'SFP');
  assert.match(sfp.description, /estimate based on 2 fiber uplinks/i);
});

test('SFP row displays an undetermined form factor when optics formFactor is null', () => {
  const result = buildInstallationMaterials({
    optics: {
      links: 1,
      modules: 2,
      formFactor: null,
    },
  });

  const sfp = result.items.find((item) => item.item === 'sfp_modules');

  assert.equal(sfp.formFactor, 'form factor not determined');
});

test('static materials have no quantities or line totals', () => {
  const result = buildInstallationMaterials({ optics: null });

  for (const item of result.items) {
    assert.equal(Object.hasOwn(item, 'quantity'), false);
    assert.equal(Object.hasOwn(item, 'qty'), false);
    assert.equal(Object.hasOwn(item, 'modules'), false);
    assert.equal(Object.hasOwn(item, 'lineTotal'), false);
    assert.equal(Object.hasOwn(item, 'total'), false);
  }
});

test('fiber summary differs from copper summary only by its SFP row', () => {
  const copper = buildInstallationMaterials({ optics: null });
  const fiber = buildInstallationMaterials({
    optics: {
      links: 2,
      modules: 4,
      formFactor: 'SFP',
    },
  });

  assert.deepEqual(fiber.items.slice(0, 4), copper.items);
  assert.equal(fiber.items.length, copper.items.length + 1);
});

test('installation materials generation is deterministic and does not mutate the plan', () => {
  const plan = {
    optics: {
      links: 2,
      modules: 4,
      formFactor: 'SFP',
    },
    bom: {
      currency: 'PHP',
      lines: [],
      total: 0,
      totalIsPartial: false,
    },
  };
  const originalPlan = structuredClone(plan);

  const first = buildInstallationMaterials(plan);
  const second = buildInstallationMaterials(plan);

  assert.deepEqual(first, second);
  assert.deepEqual(plan, originalPlan);
  assert.equal(Object.hasOwn(first, 'total'), false);
  assert.equal(Object.hasOwn(first, 'totalAmount'), false);
});

test('installation materials includes the physical site survey note', () => {
  const result = buildInstallationMaterials({ optics: null });

  assert.match(result.note, /physical site survey/i);
  assert.match(result.note, /detailed deployment planning/i);
});

test('configured prices are displayed as representative unit prices', () => {
  const result = buildInstallationMaterials({ optics: null });

  for (const item of result.items) {
    if (item.representativeUnitPrice === null) {
      assert.equal(item.priceDisplay, 'price on request');
    } else {
      assert.match(item.priceDisplay, /^PHP \d+\.\d{2} per /);
    }
  }

  assert.equal(result.items.length, config.items.length);
});

/* test('ENGINE-017 assembleBom placeholder remains unchanged', () => {
  assert.throws(
    () => assembleBom({ selections: [], requirements: {}, ctx: {} }),
    /NWP-ENGINE-017 not implemented/,
  );
}); */

test('SFP inclusion follows plan.optics rather than requirements.backbone', () => {
  const fiberOpticsCopperRequirement = buildInstallationMaterials({
    requirements: { backbone: 'copper' },
    optics: {
      links: 2,
      modules: 4,
      formFactor: 'SFP',
    },
  });

  const copperOpticsFiberRequirement = buildInstallationMaterials({
    requirements: { backbone: 'fiber' },
    optics: null,
  });

  assert.ok(
    fiberOpticsCopperRequirement.items.some((item) => item.item === 'sfp_modules'),
    'SFP row must follow non-null plan.optics even if requirements.backbone says copper',
  );

  assert.equal(
    copperOpticsFiberRequirement.items.some((item) => item.item === 'sfp_modules'),
    false,
    'SFP row must be omitted when plan.optics is null even if requirements.backbone says fiber',
  );
});

test('Cat6 cabling row is included when ENGINE-005 offers Cat6', () => {
  const result = buildInstallationMaterials(
    { optics: null },
    { horizontalCablingOptions: ['Cat5e', 'Cat6', 'Cat6a'] },
  );

  assert.ok(result.items.some((item) => item.item === 'cat6_cabling'));
});

test('Cat6 cabling row is omitted when ENGINE-005 does not offer Cat6', () => {
  const result = buildInstallationMaterials(
    { optics: null },
    { horizontalCablingOptions: ['Cat5e', 'Cat6a'] },
  );

  assert.equal(
    result.items.some((item) => item.item === 'cat6_cabling'),
    false,
  );
});

test('Cat6 cabling row remains included when cabling options are omitted', () => {
  const result = buildInstallationMaterials({ optics: null });

  assert.ok(result.items.some((item) => item.item === 'cat6_cabling'));
});

test('null representative unit price displays price on request', () => {
  const item = config.items.find((entry) => entry.item === 'cat6_cabling');
  assert.ok(item, 'Cat6 cabling configuration must exist');

  const originalPrice = item.representativeUnitPrice;

  try {
    item.representativeUnitPrice = null;

    const result = buildInstallationMaterials({ optics: null });
    const cat6 = result.items.find((entry) => entry.item === 'cat6_cabling');

    assert.ok(cat6, 'Cat6 cabling row must exist');
    assert.equal(cat6.representativeUnitPrice, null);
    assert.equal(cat6.priceDisplay, 'price on request');
  } finally {
    item.representativeUnitPrice = originalPrice;
  }
});
