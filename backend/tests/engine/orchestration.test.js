'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const raw = require('../fixtures/raw-answers/input1-baseline.json');
const requirements = require('../fixtures/requirements/input1-requirements.json');
const catalogSnapshot = require('../fixtures/catalogs/omada.snapshot.json');

const { normalize } = require('../../src/types/engine/normalize');
const { createCtx } = require('../../src/types/engine/ctx');
const { computePoeBudget } = require('../../src/types/engine/devices/poe');
const { buildBom } = require('../../src/types/engine/bom');
const { runEngine, validateEngineInputs } = require('../../src/types/engine/orchestration');
const { flatRowToCatalogSku } = require('../../src/types/engine/catalog-mapping');
const syntheticEdgeCases = require('../fixtures/catalogs/synthetic-catalog-edgecases.json');
const syntheticProductLines = require('../fixtures/catalogs/synthetic-catalog-productlines.json');


const input = normalize(raw, createCtx());
const catalog = catalogSnapshot.skus;

const omadaVendor = {
  name: 'TP-Link Omada',
  needController: false,
  managementModes: ['dashboard'],
};

const testVendor = {
  name: 'Test Vendor',
  needController: true,
  managementModes: ['dashboard', 'cli'],
};

const mockSteps = {
  selectGateway: ({ vendor }) => ({
    ok: false,
    unmet: {
      category: 'gateway',
      vendor,
      reason: 'Mock gateway unavailable for orchestration test.',
    },
  }),
};

function mapCatalogRows(rows) {
  return rows.map((row) => flatRowToCatalogSku(row).sku);
}

function omadaCatalogWithRepresentativeTestPrices() {
  return catalog.map((row) => {
    const sku = flatRowToCatalogSku(row).sku;
    let price;

    if (sku.category === 'gateway') {
      price = sku.sku === 'ER7212PC'
        ? 1000
        : 5000 + sku.line_rank * 1000;
    } else if (sku.category === 'access_point') {
      price = sku.sku === 'EAP770'
        ? null
        : sku.sku === 'EAP787'
          ? 1000
          : 5000 + sku.line_rank * 1000;
    } else if (sku.category === 'switch') {
      price = sku.sku === 'SG3428XMPP'
        ? 1000
        : sku.sku === 'SG5428XMPP'
          ? 2000
          : 10000 + sku.line_rank * 1000;
    } else {
      price = sku.price;
    }

    return { ...sku, price };
  });
}

test('validates normalized input, requirements, catalog rows, and vendor descriptors', () => {
  assert.doesNotThrow(() =>
    validateEngineInputs(input, requirements, catalog, [omadaVendor]),
  );
});

test('rejects a non-array catalog', () => {
 assert.throws(
  () => validateEngineInputs(input, requirements, {}, [omadaVendor]),
  (error) => error.name === 'ValidationError' && error.field === 'catalog',
);
});

test('rejects a catalog row that fails CatalogSku validation', () => {
  const invalidCatalog = [{ ...catalog[0], sku: '' }];

  assert.throws(
    () => validateEngineInputs(input, requirements, invalidCatalog, [omadaVendor]),
    /catalog\[0\]/i,
  );
});

test('rejects an empty vendor descriptor list', () => {
  assert.throws(
    () => validateEngineInputs(input, requirements, catalog, []),
  );
});

test('rejects duplicate vendor names', () => {
  assert.throws(
    () => validateEngineInputs(input, requirements, catalog, [omadaVendor, omadaVendor]),
  );
});

test('rejects Generic as a plan vendor', () => {
  assert.throws(
  () => validateEngineInputs(input, requirements, catalog, [{
    name: 'Generic',
    needController: false,
    managementModes: ['dashboard'],
  }]),
  (error) => error.name === 'ValidationError' && error.field === 'vendors',
);
});

test('creates CE then HP plans for each vendor in descriptor order', () => {
  const vendors = [omadaVendor, testVendor];
  const testVendorCatalog = catalog.map((sku) => ({
    ...sku,
    vendor: 'Test Vendor',
  }));

   const result = runEngine(
     input,
     requirements,
     [...catalog, ...testVendorCatalog],
     vendors,
     mockSteps,
   );

  assert.deepEqual(
    result.plans.map(({ vendor, planType }) => `${vendor}:${planType}`),
    [
      'TP-Link Omada:CE',
      'TP-Link Omada:HP',
      'Test Vendor:CE',
      'Test Vendor:HP',
    ],
  );
});

test('creates independent contexts for every plan', () => {
	const result = runEngine(input, requirements, catalog, [omadaVendor], mockSteps);

  assert.equal(result.plans.length, 2);
  assert.notStrictEqual(result.plans[0].ledger, result.plans[1].ledger);
  assert.notStrictEqual(result.plans[0].flags, result.plans[1].flags);
  assert.notStrictEqual(result.plans[0].unmet, result.plans[1].unmet);
});
test('allows a listed vendor with no catalog rows through input validation', () => {
  const emptyCatalogVendor = {
    name: 'Empty Catalog Vendor',
    needController: false,
    managementModes: ['dashboard'],
  };

  assert.doesNotThrow(() =>
    validateEngineInputs(input, requirements, catalog, [emptyCatalogVendor]),
  );
});
test('does not create plans for Generic catalog rows', () => {
  const genericRows = catalog.map((sku) => ({
    ...sku,
    vendor: 'Generic',
    category: 'enclosure',
    form_factor: 'rack',
    rack_units: 12,
  }));

  const result = runEngine(
   input,
   requirements,
   [...catalog, ...genericRows],
   [omadaVendor],
   mockSteps,
  );


  assert.equal(result.plans.length, 2);
  assert.ok(result.plans.every((plan) => plan.vendor !== 'Generic'));
});
test('exports a plan builder for individual vendor-plan orchestration', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  assert.equal(typeof buildPlan, 'function');
});
test('buildPlan records a successful gateway selection', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();
  const gatewaySku = {
    sku: 'TEST-GW-01',
    vendor: omadaVendor.name,
    name: 'Test Gateway',
  };

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    catalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
    },
  );

  assert.equal(plan.vendor, omadaVendor.name);
  assert.equal(plan.planType, 'CE');
  assert.equal(plan.complete, true);
  assert.deepEqual(plan.items, [
    { category: 'gateway', sku: 'TEST-GW-01', qty: 1 },
  ]);
});
test('buildPlan keeps UPS recommendations advisory and excludes UPS equipment', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const gatewaySku = {
    sku: 'TEST-GW-POWER',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  for (const [power, expectedLevel] of [
    ['stable', 'advisory'],
    ['frequent', 'prominent'],
  ]) {
    const plan = buildPlan(
      omadaVendor,
      'CE',
      requirements,
      {
        ...input,
        power,
      },
      [gatewaySku],
      createCtx(),
      {
        selectGateway: () => ({
          ok: true,
          sku: gatewaySku,
          qty: 1,
          flags: [],
        }),
      },
    );

    assert.deepEqual(plan.powerProtection, {
      upsRecommendation: 'UPS recommended for network equipment.',
      upsRecommendationLevel: expectedLevel,
    });

    assert.equal(plan.complete, true);
    assert.deepEqual(plan.items, [
      { category: 'gateway', sku: gatewaySku.sku, qty: 1 },
    ]);
  }
});

test('buildPlan marks the plan incomplete when gateway selection is unmet', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    catalog,
    ctx,
    {
      selectGateway: () => ({
        ok: false,
        unmet: {
          category: 'gateway',
          vendor: omadaVendor.name,
          reason: 'No suitable gateway available.',
        },
      }),
    },
  );

  assert.equal(plan.complete, false);
  assert.equal(plan.items.length, 0);
  assert.ok(
    plan.unmet.some(
      (item) =>
        item.category === 'gateway' &&
        item.vendor === omadaVendor.name,
    ),
  );
});
test('buildPlan propagates unexpected gateway selector errors', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();
  const selectorError = new Error('Unexpected gateway implementation failure');

  assert.throws(
    () =>
      buildPlan(
        omadaVendor,
        'CE',
        requirements,
        input,
        catalog,
        ctx,
        {
          selectGateway: () => {
            throw selectorError;
          },
        },
      ),
    (error) => error === selectorError,
  );
});
test('runEngine preserves a successful plan when the other plan has an unmet gateway', () => {
  const result = runEngine(
    input,
    requirements,
    catalog,
    [omadaVendor],
    {
      selectGateway: ({ plan, vendor }) => {
        if (plan === 'cost_efficient') {
          const sku = {
            sku: 'TEST-CE-GATEWAY',
            vendor,
            category: 'gateway',
          };

          return {
            ok: true,
            sku,
            qty: 1,
            flags: [],
          };
        }

        return {
          ok: false,
          unmet: {
            category: 'gateway',
            vendor,
            reason: 'HP gateway unavailable for isolation test.',
          },
          flags: [],
        };
      },
    },
  );

  assert.equal(result.plans.length, 2);

  const cePlan = result.plans.find((plan) => plan.planType === 'CE');
  const hpPlan = result.plans.find((plan) => plan.planType === 'HP');

  assert.ok(cePlan);
  assert.ok(hpPlan);

  assert.equal(cePlan.complete, true);
  assert.ok(
    cePlan.items.some(
      (item) => item.category === 'gateway' && item.sku === 'TEST-CE-GATEWAY',
    ),
  );
  assert.equal(cePlan.unmet.length, 0);

  assert.equal(hpPlan.complete, false);
  assert.ok(
    hpPlan.unmet.some(
      (item) =>
        item.category === 'gateway' &&
        item.reason === 'HP gateway unavailable for isolation test.',
    ),
  );

  assert.ok(
    !cePlan.unmet.some(
      (item) => item.reason === 'HP gateway unavailable for isolation test.',
    ),
    'HP failure must not leak into the CE plan context',
  );
});

test('runEngine continues building every vendor-plan combination when gateway is unmet', () => {
  const vendors = [omadaVendor, testVendor];
  const testVendorCatalog = catalog.map((sku) => ({
    ...sku,
    vendor: 'Test Vendor',
  }));

  const result = runEngine(
    input,
    requirements,
    [...catalog, ...testVendorCatalog],
    vendors,
    mockSteps,
  );

  assert.equal(result.plans.length, 4);
  assert.deepEqual(
    result.plans.map(({ vendor, planType }) => `${vendor}:${planType}`),
    [
      'TP-Link Omada:CE',
      'TP-Link Omada:HP',
      'Test Vendor:CE',
      'Test Vendor:HP',
    ],
  );

  assert.ok(result.plans.every((plan) => plan.complete === false));
  assert.ok(
    result.plans.every((plan) =>
      plan.unmet.some((item) => item.category === 'gateway'),
    ),
  );
});

test('buildPlan preserves shared wireless requirements and passes the correct VPN slice', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  for (const planType of ['CE', 'HP']) {
    const ctx = createCtx();
    let receivedRequirements;

    buildPlan(
      omadaVendor,
      planType,
      requirements,
      input,
      catalog,
      ctx,
      {
        selectGateway: ({ requirements: planRequirements }) => {
          receivedRequirements = planRequirements;

          return {
            ok: false,
            unmet: {
              category: 'gateway',
              vendor: omadaVendor.name,
              reason: 'Test only.',
            },
          };
        },
      },
    );

    // Both CE and HP wireless requirements must remain available.
    assert.deepEqual(
      receivedRequirements.wireless,
      requirements.wireless,
    );

    // Gateway needs the complete CE/HP VPN requirements map.
    assert.deepEqual(
      receivedRequirements.vpnTunnelsNeeded,
      requirements.vpnTunnelsNeeded,
    );

    // Shared requirements must remain available.
    assert.equal(receivedRequirements.securityTier, requirements.securityTier);
    assert.equal(receivedRequirements.requiredMbps, requirements.requiredMbps);
  }
});


test('buildPlan records a successful AP selection when the AP selector is injected', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();
  const gatewaySku = {
    sku: 'TEST-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };
  const apSku = {
    sku: 'TEST-AP',
    vendor: omadaVendor.name,
    category: 'access_point',
  };

  let receivedApArgs;

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    catalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
      selectAccessPoints: (args) => {
        receivedApArgs = args;

        return {
          ok: true,
          sku: apSku,
          qty: 2,
          flags: [],
          maxPowerDrawW: 15,
        };
      },
    },
  );

  assert.equal(receivedApArgs.plan, 'CE');
  assert.deepEqual(
    receivedApArgs.requirements.wireless,
    requirements.wireless,
  );

  assert.ok(
    plan.items.some(
      (item) =>
        item.category === 'access_point' &&
        item.sku === apSku.sku &&
        item.qty === 2,
    ),
  );
});


test('buildPlan records the PoE budget when the PoE function is injected', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();
  const gatewaySku = {
    sku: 'TEST-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };
  const apSku = {
    sku: 'TEST-AP',
    vendor: omadaVendor.name,
    category: 'access_point',
    ap_specs: {
      max_power_draw_w: 15,
    },
  };

  const expectedPoeBudget = {
    perFloor: [{ loadW: 60, budgetW: 72 }],
    apDrawW: 15,
  };

  let receivedPoeArgs;

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    catalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),

      selectAccessPoints: () => ({
        ok: true,
        sku: apSku,
        qty: 2,
        flags: [],
      }),

      computePoeBudget: (args) => {
        receivedPoeArgs = args;
        return expectedPoeBudget;
      },
    },
  );

  assert.equal(receivedPoeArgs.plan, 'CE');
  assert.equal(receivedPoeArgs.apSelection.ok, true);

  assert.deepEqual(
    plan.poeBudget,
    expectedPoeBudget,
  );
});


test('buildPlan integrates the real PoE budget calculator', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();
  const gatewaySku = {
    sku: 'TEST-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };
  const apSku = {
    sku: 'TEST-AP',
    vendor: omadaVendor.name,
    category: 'access_point',
    ap_specs: {
      max_power_draw_w: 15,
    },
  };

  const apSelection = {
    ok: true,
    sku: apSku,
    qty: 2,
    flags: [],
  };

  const expectedPoeBudget = computePoeBudget({
    requirements,
    apSelection,
    plan: 'CE',
    ctx,
  });

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    catalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),

      selectAccessPoints: () => apSelection,

      computePoeBudget,
    },
  );

  assert.deepEqual(plan.poeBudget, expectedPoeBudget);
});



test('runEngine uses the real gateway selector when steps are omitted', () => {
  const result = runEngine(
    input,
    requirements,
    catalog,
    [omadaVendor],
  );

  assert.equal(result.plans.length, 2);

  for (const plan of result.plans) {
    assert.equal(plan.vendor, omadaVendor.name);
    assert.ok(['CE', 'HP'].includes(plan.planType));

    if (plan.items.some((item) => item.category === 'gateway')) {
      assert.equal(plan.items.length, 1);
      assert.equal(plan.items[0].qty, 1);
    } else {
      assert.ok(
        plan.unmet.some((item) => item.category === 'gateway'),
        `Expected gateway unmet result for ${plan.planType}`,
      );
    }
  }
});

test('buildPlan integrates the real switch selector and records selected access switches', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const { selectSwitches } = require('../../src/types/engine/devices/switches');

  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  const apSku = {
    sku: 'TEST-AP-POE',
    vendor: omadaVendor.name,
    category: 'access_point',
    name: 'Test Wi-Fi 6E Access Point',
    ap_specs: {
      max_power_draw_w: 15,
      poe_standard: 'at',
    },
  };

  const switchSku = {
    sku: 'TEST-SWITCH-POE-PLUS-PLUS',
    vendor: omadaVendor.name,
    category: 'switch',
    name: 'Test 24-Port PoE++ Switch',
    price: 1000,
    status: 'ACTIVE',
    switch_specs: {
      copper_ports: 24,
      port_count: 24,
      poe_ports: 24,
      poe_budget_w: 500,
      sfp_ports: 4,
      sfp_form_factor: 'SFP',
    },
  };

  const testCatalog = [
    gatewaySku,
    apSku,
    switchSku,
  ];

  const apSelection = {
    ok: true,
    sku: apSku,
    qty: 2,
    flags: [],
  };

  const plan = buildPlan(
    omadaVendor,
    'CE',
    {
  ...requirements,
  backbone: 'fiber',
},
    input,
    testCatalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),

      selectAccessPoints: () => apSelection,

      computePoeBudget,

      selectSwitches,
    },
  );

  assert.equal(plan.poeBudget.perFloor.length, 1);

  assert.equal(plan.switchSelection.ok, true);
  assert.equal(plan.switchSelection.accessSwitches.length, 1);

  // NWP-ENGINE-012: optics are advisory requirements, not selected equipment.
assert.deepEqual(plan.optics, {
  links: input.floors,
  modules: input.floors * 2,
  formFactor: 'SFP',
});

assert.ok(
  plan.items.every((item) => item.category !== 'optics'),
  'Optics must not be added to plan.items',
);

  assert.equal(
    plan.switchSelection.accessSwitches[0].sku.sku,
    switchSku.sku,
  );

  assert.ok(
    plan.items.some(
      item =>
        item.category === 'switch' &&
        item.sku === switchSku.sku,
    ),
  );

  assert.equal(plan.complete, true);
});

test('buildPlan records exactly one fiber link and two optic modules for a single-floor site', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const { selectSwitches } = require('../../src/types/engine/devices/switches');

  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-SINGLE-FLOOR-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  const apSku = {
    sku: 'TEST-SINGLE-FLOOR-AP',
    vendor: omadaVendor.name,
    category: 'access_point',
    name: 'Test Wi-Fi 6E Access Point',
    ap_specs: {
      max_power_draw_w: 15,
      poe_standard: 'at',
    },
  };

  const switchSku = {
    sku: 'TEST-SINGLE-FLOOR-SWITCH',
    vendor: omadaVendor.name,
    category: 'switch',
    name: 'Test 24-Port PoE++ Switch',
    price: 1000,
    status: 'ACTIVE',
    switch_specs: {
      copper_ports: 24,
      port_count: 24,
      poe_ports: 24,
      poe_budget_w: 500,
      sfp_ports: 4,
      sfp_form_factor: 'SFP',
    },
  };

  const plan = buildPlan(
    omadaVendor,
    'CE',
    {
      ...requirements,
      backbone: 'fiber',
    },
    {
      ...input,
      floors: 1,
    },
    [gatewaySku, apSku, switchSku],
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
      selectAccessPoints: () => ({
        ok: true,
        sku: apSku,
        qty: 2,
        flags: [],
      }),
      computePoeBudget,
      selectSwitches,
    },
  );

  assert.equal(plan.switchSelection.ok, true);

  assert.deepEqual(plan.optics, {
    links: 1,
    modules: 2,
    formFactor: 'SFP',
  });

  assert.ok(
    plan.items.every((item) => item.category !== 'optics'),
    'Optics must remain advisory and must not be added to plan.items',
  );

  assert.equal(plan.complete, true);
});

test('buildPlan keeps UPS power protection advisory and out of selected equipment', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  for (const [power, expectedLevel] of [
    ['stable', 'advisory'],
    ['frequent', 'prominent'],
  ]) {
    const ctx = createCtx();

    const gatewaySku = {
      sku: 'TEST-POWER-GATEWAY',
      vendor: omadaVendor.name,
      category: 'gateway',
    };

    const plan = buildPlan(
      omadaVendor,
      'CE',
      requirements,
      {
        ...input,
        power,
      },
      [gatewaySku],
      ctx,
      {
        selectGateway: () => ({
          ok: true,
          sku: gatewaySku,
          qty: 1,
          flags: [],
        }),
      },
    );

    assert.deepEqual(plan.powerProtection, {
      upsRecommendation: 'UPS recommended for network equipment.',
      upsRecommendationLevel: expectedLevel,
    });

    assert.equal(
      plan.items.some(item => item.category === 'ups' || item.category === 'power_protection'),
      false,
    );

    assert.equal(plan.complete, true);
  }
});

test('buildPlan selects a Generic enclosure when rack space is required', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GATEWAY-RACK',
    vendor: omadaVendor.name,
    category: 'gateway',
    rack_units: 2,
  };

  const genericEnclosureSku = {
    sku: 'TEST-GENERIC-RACK-4U',
    vendor: 'Generic',
    category: 'enclosure',
    name: 'Test 4U Rack Enclosure',
    form_factor: 'rack',
    rack_units: 4,
    price: 5000,
    status: 'ACTIVE',
  };

  const testCatalog = [
    gatewaySku,
    genericEnclosureSku,
  ];

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    {
      ...input,
      housing: 'closet',
    },
    testCatalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
      selectAccessPoints: () => ({
  ok: false,
  unmet: {
    category: 'access_point',
    vendor: omadaVendor.name,
    reason: 'Not needed for this test',
  },
  flags: [],
}),
    },
  );

  assert.equal(plan.enclosureSelection.ok, true);
  assert.equal(plan.enclosureSelection.sku.sku, genericEnclosureSku.sku);
  assert.equal(plan.enclosureSelection.qty, 1);

  assert.ok(
    plan.items.some(
      item =>
        item.category === 'enclosure' &&
        item.sku === genericEnclosureSku.sku &&
        item.qty === 1,
    ),
  );
});

test('buildPlan accounts for gateway quantity when calculating required enclosure capacity', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GATEWAY-2U',
    vendor: omadaVendor.name,
    category: 'gateway',
    rack_units: 2,
  };

  const undersizedEnclosure = {
    sku: 'TEST-GENERIC-RACK-2U',
    vendor: 'Generic',
    category: 'enclosure',
    name: 'Test 2U Rack Enclosure',
    form_factor: 'rack',
    rack_units: 2,
    price: 2500,
    status: 'ACTIVE',
  };

  const correctlySizedEnclosure = {
    sku: 'TEST-GENERIC-RACK-4U',
    vendor: 'Generic',
    category: 'enclosure',
    name: 'Test 4U Rack Enclosure',
    form_factor: 'rack',
    rack_units: 4,
    price: 5000,
    status: 'ACTIVE',
  };

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    {
      ...input,
      housing: 'closet',
    },
    [gatewaySku, undersizedEnclosure, correctlySizedEnclosure],
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 2,
        flags: [],
      }),
      selectAccessPoints: () => ({
        ok: false,
        unmet: {
          category: 'access_point',
          vendor: omadaVendor.name,
          reason: 'Not needed for this test.',
        },
        flags: [],
      }),
    },
  );

  assert.equal(plan.enclosureSelection.ok, true);
  assert.equal(plan.enclosureSelection.sku.sku, correctlySizedEnclosure.sku);
  assert.equal(plan.enclosureSelection.qty, 1);
  assert.ok(
    plan.items.some(
      item =>
        item.category === 'enclosure' &&
        item.sku === correctlySizedEnclosure.sku,
    ),
  );
});

test('buildPlan marks the plan incomplete when the real switch selector cannot find a switch', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const { selectSwitches } = require('../../src/types/engine/devices/switches');

  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  const apSku = {
    sku: 'TEST-AP-POE',
    vendor: omadaVendor.name,
    category: 'access_point',
    name: 'Test Wi-Fi 6E Access Point',
    ap_specs: {
      max_power_draw_w: 15,
      poe_standard: 'at',
    },
  };

  // Intentionally no switch SKU in this catalog.
  const testCatalog = [
    gatewaySku,
    apSku,
  ];

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    testCatalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),

      selectAccessPoints: () => ({
        ok: true,
        sku: apSku,
        qty: 2,
        flags: [],
      }),

      computePoeBudget,

      selectSwitches,
    },
  );

  assert.equal(plan.poeBudget.perFloor.length, 1);

  assert.equal(plan.complete, false);

  assert.ok(
    plan.unmet.some(
      unmet => unmet.category === 'switch',
    ),
    'Expected a switch unmet requirement to be recorded',
  );
});

test('buildPlan marks the plan incomplete when no suitable Generic enclosure exists', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GATEWAY-RACK',
    vendor: omadaVendor.name,
    category: 'gateway',
    rack_units: 2,
  };

  const testCatalog = [gatewaySku];

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    {
      ...input,
      housing: 'closet',
    },
    testCatalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),

      selectAccessPoints: () => ({
        ok: true,
        sku: {
          sku: 'TEST-AP',
          vendor: omadaVendor.name,
          category: 'access_point',
        },
        qty: 1,
        flags: [],
      }),
    },
  );

  assert.equal(plan.complete, false);
  assert.equal(plan.enclosureSelection.ok, false);

  assert.ok(
    plan.unmet.some(
      unmet =>
        unmet.category === 'enclosure' &&
        unmet.vendor === omadaVendor.name,
    ),
  );
});

test('buildPlan rejects a gateway SKU from another vendor', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();

  const foreignGatewaySku = {
    sku: 'FOREIGN-GATEWAY',
    vendor: 'Another Vendor',
    category: 'gateway',
  };

  assert.throws(
    () =>
      buildPlan(
        omadaVendor,
        'CE',
        requirements,
        input,
        catalog,
        ctx,
        {
          selectGateway: () => ({
            ok: true,
            sku: foreignGatewaySku,
            qty: 1,
            flags: [],
          }),
        },
      ),
    (error) =>
      error.name === 'OrchestrationDefect' &&
      /vendor consistency defect/i.test(error.message),
  );
});

test('buildPlan rejects an AP SKU from another vendor', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  const foreignApSku = {
    sku: 'FOREIGN-AP',
    vendor: 'Another Vendor',
    category: 'access_point',
  };

  assert.throws(
    () =>
      buildPlan(
        omadaVendor,
        'CE',
        requirements,
        input,
        catalog,
        ctx,
        {
          selectGateway: () => ({
            ok: true,
            sku: gatewaySku,
            qty: 1,
            flags: [],
          }),

          selectAccessPoints: () => ({
            ok: true,
            sku: foreignApSku,
            qty: 1,
            flags: [],
          }),
        },
      ),
    (error) =>
      error.name === 'OrchestrationDefect' &&
      /vendor consistency defect/i.test(error.message),
  );
});

test('buildPlan rejects a Generic gateway SKU', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();

  const genericGatewaySku = {
    sku: 'GENERIC-GATEWAY',
    vendor: 'Generic',
    category: 'gateway',
  };

  assert.throws(
    () =>
      buildPlan(
        omadaVendor,
        'CE',
        requirements,
        input,
        catalog,
        ctx,
        {
          selectGateway: () => ({
            ok: true,
            sku: genericGatewaySku,
            qty: 1,
            flags: [],
          }),
        },
      ),
    (error) =>
      error.name === 'OrchestrationDefect' &&
      /vendor consistency defect/i.test(error.message),
  );
});

const validTestBom = {
  currency: 'PHP',
  lines: [],
  total: null,
  totalIsPartial: true,
};

test('runEngine calls buildBom once per vendor-plan and passes the plan and catalog', () => {
  const calls = [];
  const testCatalog = [...catalog];

  const result = runEngine(
    input,
    requirements,
    testCatalog,
    [omadaVendor],
    {
      ...mockSteps,
      buildBom: (plan, receivedCatalog) => {
        assert.ok(plan.enclosureSelection, 'Enclosure selection must precede BOM assembly');
        assert.ok(plan.powerProtection, 'Power recommendation must precede BOM assembly');

        const bom = { ...validTestBom };
        calls.push({ plan, receivedCatalog, bom });
        return bom;
      },
    },
  );

  assert.equal(result.plans.length, 2);
  assert.equal(calls.length, 2);

  result.plans.forEach((outputPlan, index) => {
  const { plan, receivedCatalog, bom } = calls[index];

    assert.equal(receivedCatalog, testCatalog);                       // catalog passed through
    assert.equal(outputPlan.vendor, plan.vendor);
    assert.equal(outputPlan.planType, plan.planType);
    assert.deepEqual(outputPlan.items, plan.items);
    assert.equal(outputPlan.bom, bom);                                // the BOM object is carried over by reference
    });
  assert.equal(calls.length, result.plans.length);                    // once per vendor-plan
  });


test('buildPlan records deduplicated BOM price, stale-price, and incomplete-plan advisories', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const ctx = createCtx();
  const bom = {
    currency: 'PHP',
    lines: [
      {
        category: 'access_point',
        sku: 'AP-UNPRICED',
        name: 'Unpriced access point',
        vendor: omadaVendor.name,
        qty: 1,
        unitPrice: null,
        lineTotal: null,
        status: 'ACTIVE',
        isGeneric: false,
        isStale: true,
        priceUpdatedAt: '2026-01-15',
      },
      {
        category: 'switch',
        sku: 'SW-STALE',
        name: 'Stale switch',
        vendor: omadaVendor.name,
        qty: 1,
        unitPrice: 100,
        lineTotal: 100,
        status: 'ACTIVE',
        isGeneric: false,
        isStale: true,
        priceUpdatedAt: '2026-02-20',
      },
    ],
    total: 100,
    totalIsPartial: true,
  };

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    catalog,
    ctx,
    { ...mockSteps, buildBom: () => bom },
  );

  const codes = plan.flags.map((flag) => flag.code);
  assert.equal(codes.filter((code) => code === 'BOM_PARTIAL_PRICE').length, 1);
  assert.equal(codes.filter((code) => code === 'BOM_PLAN_INCOMPLETE').length, 1);
  assert.equal(codes.filter((code) => code === 'BOM_PRICE_STALE').length, 1);

  const partialPrice = plan.flags.find((flag) => flag.code === 'BOM_PARTIAL_PRICE');
  assert.match(partialPrice.message, /AP-UNPRICED/);

  const incomplete = plan.flags.find((flag) => flag.code === 'BOM_PLAN_INCOMPLETE');
  assert.match(incomplete.message, /required equipment.*missing/i);

  const stale = plan.flags.find((flag) => flag.code === 'BOM_PRICE_STALE');
  assert.match(stale.message, /AP-UNPRICED/);
  assert.match(stale.message, /SW-STALE/);
  assert.match(stale.message, /2026-01-15/);
  assert.match(stale.message, /2026-02-20/);
});

test('buildPlan emits BOM advisories from the real builder and catalog provenance', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const ctx = createCtx();
  const mappedCatalog = mapCatalogRows(catalog);
  const gateway = mappedCatalog.find((row) => row.category === 'gateway' && row.rack_units > 0);

  assert.ok(gateway, 'Omada snapshot must contain a gateway SKU');

  const staleUnpricedGateway = {
    ...gateway,
    price: null,
    is_stale: true,
    price_updated_at: '2026-02-20',
  };
  const testCatalog = mappedCatalog.map((row) =>
    row.sku === gateway.sku ? staleUnpricedGateway : row
  );

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    testCatalog,
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: staleUnpricedGateway,
        qty: 1,
        flags: [],
      }),
      buildBom,
    },
  );

  assert.equal(plan.bom.lines.length, 1);
  assert.equal(plan.bom.lines[0].sku, gateway.sku);
  assert.equal(plan.bom.lines[0].unitPrice, null);
  assert.equal(plan.bom.lines[0].isStale, true);
  assert.equal(plan.bom.lines[0].priceUpdatedAt, '2026-02-20');
  assert.equal(plan.bom.total, null);
  assert.equal(plan.bom.totalIsPartial, true);

  const codes = plan.flags.map((flag) => flag.code);
  assert.equal(codes.filter((code) => code === 'BOM_PARTIAL_PRICE').length, 1);
  assert.equal(codes.filter((code) => code === 'BOM_PLAN_INCOMPLETE').length, 1);
  assert.equal(codes.filter((code) => code === 'BOM_PRICE_STALE').length, 1);

  assert.match(
    plan.flags.find((flag) => flag.code === 'BOM_PARTIAL_PRICE').message,
    new RegExp(gateway.sku),
  );
  assert.match(
    plan.flags.find((flag) => flag.code === 'BOM_PLAN_INCOMPLETE').message,
    /required equipment.*missing/i,
  );
  assert.match(
    plan.flags.find((flag) => flag.code === 'BOM_PRICE_STALE').message,
    /2026-02-20/,
  );
});

test('buildPlan rejects invalid BOM output from the injected builder', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  assert.throws(
    () =>
      buildPlan(
        omadaVendor,
        'CE',
        requirements,
        input,
        catalog,
        createCtx(),
        {
          ...mockSteps,
          buildBom: () => ({
            currency: 'PHP',
            lines: [],
            total: -1,
            totalIsPartial: true,
          }),
        },
      ),
    (error) =>
      error.name === 'ValidationError' &&
      error.field === 'bom.total',
  );
});

test('buildPlan leaves the placeholder BOM when no builder is injected', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    catalog,
    createCtx(),
    mockSteps,
  );

  assert.deepEqual(plan.bom, {
    currency: catalog[0]?.currency || 'PHP',
    lines: [],
    total: null,
    totalIsPartial: true,
  });
});

test('Omada snapshot and vendor 999 fixtures exercise the complete orchestration pipeline', () => {
  const omadaIntegrationVendor = {
    ...omadaVendor,
    needController: true,
  };
  const syntheticVendor = {
    name: 'Synthetic Vendor',
    needController: false,
    managementModes: ['dashboard'],
  };

  // Test-only catalog values make device selection deterministic; these are not market data.
  const pricedOmadaCatalog = omadaCatalogWithRepresentativeTestPrices();
  const normalizedSyntheticCatalog = mapCatalogRows(syntheticEdgeCases);
  const combinedCatalog = [
    ...pricedOmadaCatalog,
    ...normalizedSyntheticCatalog,
  ];
  const result = runEngine(
    input,
    requirements,
    combinedCatalog,
    [omadaIntegrationVendor, syntheticVendor],
  );

  assert.equal(result.plans.length, 4);

  assert.deepEqual(
    result.plans.map(({ vendor, planType }) => `${vendor}:${planType}`),
    [
      'TP-Link Omada:CE',
      'TP-Link Omada:HP',
      'Synthetic Vendor:CE',
      'Synthetic Vendor:HP',
    ],
  );

  const omadaPlans = result.plans.filter(
    (plan) => plan.vendor === omadaIntegrationVendor.name,
  );
  const ceOmada = omadaPlans.find((plan) => plan.planType === 'CE');
  const hpOmada = omadaPlans.find((plan) => plan.planType === 'HP');
  assert.equal(ceOmada.complete, false);
  assert.equal(hpOmada.complete, false);
  assert.equal(ceOmada.items.find((item) => item.category === 'gateway').sku, 'ER7212PC');
  for (const plan of omadaPlans) {
    assert.ok(
      ['gateway', 'access_point', 'switch'].every((category) =>
        plan.items.some((item) => item.category === category),
      ),
      `${plan.planType} should complete each selectable device step`,
    );
  }
  assert.notEqual(
    hpOmada.items.find((item) => item.category === 'gateway').sku,
    'ER7212PC',
  );
  assert.ok(
    ceOmada.unmet.every((item) => item.category === 'enclosure'),
    'the integrated ER7212PC plan should only be blocked by the missing generic enclosure',
  );
  assert.deepEqual(
    hpOmada.unmet.map((item) => item.category),
    ['controller', 'enclosure'],
  );

  const syntheticPlans = result.plans.filter(
    (plan) => plan.vendor === syntheticVendor.name,
  );
  assert.ok(
    syntheticPlans.every((plan) =>
      plan.flags.some((flag) => flag.code === 'UNPRICED_SKUS_EXCLUDED'),
    ),
    'the unpriced synthetic switch should use the normal unpriced-selection flag path',
  );

  const unpricedSyntheticSwitch = normalizedSyntheticCatalog.find(
    (sku) => sku.sku === 'SYN-SW-003',
  );

  assert.ok(unpricedSyntheticSwitch, 'the null-priced synthetic switch fixture must exist');
  assert.equal(unpricedSyntheticSwitch.price, null);
  assert.ok(
    syntheticPlans.every((plan) =>
      plan.items
        .filter((item) => item.category === 'switch')
        .every((item) => item.sku !== 'SYN-SW-003'),
    ),
    'the null-priced synthetic switch must not be selected into either plan',
  );

  assert.ok(
    syntheticPlans.every((plan) =>
      plan.flags.some((flag) => flag.code === 'UNPRICED_SKUS_EXCLUDED'),
    ),
    'each synthetic plan must expose the unpriced exclusion through its normal flag path',
  );

  assert.ok(
    syntheticProductLines.every((line) => line.vendor_id === 999),
    'synthetic product-line fixture should use vendor_id 999',
  );

  assert.ok(
    result.plans.every((plan) => plan.vendor !== 'Generic'),
    'Generic must not become a plan vendor',
  );

  assert.ok(
    normalizedSyntheticCatalog
      .filter((sku) => sku.category === 'gateway')
      .length > 0,
    'the synthetic catalog must contain gateway fixtures',
  );
  assert.ok(
    normalizedSyntheticCatalog
      .filter((sku) => sku.category === 'gateway')
      .every((sku) =>
        !Object.prototype.hasOwnProperty.call(sku, 'max_vpn_tunnels'),
      ),
    'synthetic gateway fixtures must exercise the missing max_vpn_tunnels field',
  );

  const missingNullableFieldRun = runEngine(
    input,
    {
      ...requirements,
      vpnTunnelsNeeded: { CE: 1, HP: 1 },
    },
    normalizedSyntheticCatalog,
    [syntheticVendor],
  );
  assert.ok(
    missingNullableFieldRun.plans.every((plan) =>
      plan.flags.some((flag) => flag.code === 'GATEWAY_VPN_CAPACITY_UNKNOWN') &&
      plan.unmet.some((item) => item.category === 'gateway'),
    ),
    'missing max_vpn_tunnels should produce the normal flag and unmet results without throwing',
  );
  const sunsettingSyntheticAp = normalizedSyntheticCatalog.find(
    (sku) => sku.sku === 'SYN-AP-005',
  );

  assert.ok(sunsettingSyntheticAp, 'the sunsetting AP fixture must exist');
  assert.equal(sunsettingSyntheticAp.status, 'SUNSETTING');

  assert.ok(
    missingNullableFieldRun.plans.some((plan) =>
      plan.items.some((item) =>
        item.category === 'access_point' && item.sku === 'SYN-AP-005',
      ),
    ),
    'a SUNSETTING synthetic AP must remain eligible through the normal AP selector',
  );
});

test('runEngine aggregates plan context into the top-level result', () => {
  const seenPlans = new Set();

  const stepsWithContext = {
    ...mockSteps,
    selectGateway: (args) => {
      const key = `${args.vendor.name}:${args.plan}`;

      if (!seenPlans.has(key)) {
        seenPlans.add(key);

        args.ctx.flags.push({
          code: 'TEST_PLAN_FLAG',
          message: key,
        });

        args.ctx.ledger.push({
          field: 'testField',
          valueUsed: args.plan,
          reason: 'Regression test',
        });

        args.ctx.unmet.push({
          category: 'switch',
          vendor: args.vendor.name,
          reason: 'Regression test unmet item',
        });
      }

      return mockSteps.selectGateway(args);
    },
  };

  const result = runEngine(
    input,
    requirements,
    catalog,
    [omadaVendor],
    stepsWithContext,
  );

  assert.equal(result.plans.length, 2);
  assert.equal(result.flags.filter((flag) => flag.code === 'TEST_PLAN_FLAG').length, 2);
  assert.equal(result.ledger.filter((entry) => entry.field === 'testField').length, 2);
  assert.equal(
  result.unmet.filter(
    (item) => item.reason === 'Regression test unmet item',
  ).length,
  2,
);

  result.plans.forEach((plan) => {
    assert.ok(plan.flags.some((flag) => flag.code === 'TEST_PLAN_FLAG'));
    assert.ok(plan.ledger.some((entry) => entry.field === 'testField'));
    assert.equal(
  plan.unmet.filter(
    (item) => item.reason === 'Regression test unmet item',
  ).length,
  1,
);
  });
});

test('runEngine produces identical results for repeated identical inputs', () => {
  const first = runEngine(input, requirements, catalog, [omadaVendor]);
  const second = runEngine(input, requirements, catalog, [omadaVendor]);

  assert.deepEqual(first, second);
});

test('runEngine passes the same catalog snapshot to every vendor-plan selector', () => {
  const receivedCatalogs = [];

  const vendors = [
    omadaVendor,
    {
      name: 'Vendor B',
      needController: false,
      managementModes: ['dashboard'],
    },
  ];

  runEngine(input, requirements, catalog, vendors, {
    selectGateway: ({ catalog: receivedCatalog, vendor }) => {
      receivedCatalogs.push({ receivedCatalog, vendor });

      return {
        ok: false,
        unmet: {
          category: 'gateway',
          vendor,
          reason: 'Test selection unavailable.',
        },
      };
    },
  });

  assert.equal(receivedCatalogs.length, 4);
  assert.ok(receivedCatalogs.every(
    ({ receivedCatalog }) => receivedCatalog === catalog,
  ));
});





test('runEngine stops before selector execution when input validation fails', () => {
  let selectorCalls = 0;

  const steps = {
    selectGateway: () => {
      selectorCalls += 1;
      return {
        ok: false,
        unmet: {
          category: 'gateway',
          vendor: omadaVendor.name,
          reason: 'Test selector result.',
        },
      };
    },
  };

  assert.throws(
    () =>
      runEngine(
        { ...input, contractVersion: -1 },
        requirements,
        catalog,
        [omadaVendor],
        steps,
      ),
    (error) =>
      error.name === 'ValidationError' &&
      error.field === 'contractVersion',
  );

  assert.equal(selectorCalls, 0);
});

test('buildPlan rejects an access switch SKU from another vendor', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  const apSku = {
    sku: 'TEST-AP',
    vendor: omadaVendor.name,
    category: 'access_point',
  };

  const foreignSwitchSku = {
    sku: 'FOREIGN-SWITCH',
    vendor: 'Another Vendor',
    category: 'switch',
  };

  assert.throws(
    () =>
      buildPlan(
        omadaVendor,
        'CE',
        requirements,
        input,
        [gatewaySku, apSku, foreignSwitchSku],
        ctx,
        {
          selectGateway: () => ({
            ok: true,
            sku: gatewaySku,
            qty: 1,
            flags: [],
          }),
          selectAccessPoints: () => ({
            ok: true,
            sku: apSku,
            qty: 1,
            flags: [],
          }),
          computePoeBudget: () => ({
            perFloor: [{ loadW: 20, budgetW: 24 }],
          }),
          selectSwitches: () => ({
            ok: true,
            accessSwitches: [
              {
                sku: foreignSwitchSku,
                qty: 1,
              },
            ],
          }),
        },
      ),
    (error) =>
      error.name === 'OrchestrationDefect' &&
      /vendor consistency defect/i.test(error.message),
  );
});

test('runEngine aggregates default-vendor selection context without mixing it into plans', () => {
  const gatewaySku = {
    sku: 'TEST-DEFAULT-VENDOR-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  const result = runEngine(
    input,
    requirements,
    catalog,
    [omadaVendor],
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
    },
  );

  assert.equal(result.plans.length, 2);
  assert.ok(
    result.plans.every((plan) => plan.complete === true),
    'Both plans must be complete for default-vendor selection',
  );

  for (const planType of ['CE', 'HP']) {
    assert.ok(
      result.ledger.some(
        (entry) => entry.field === `defaultVendor.${planType}`,
      ),
      `Expected ${planType} default-vendor ledger entry at the top level`,
    );
  }

  for (const plan of result.plans) {
    assert.equal(
      plan.ledger.some(
        (entry) => entry.field.startsWith('defaultVendor.'),
      ),
      false,
      'Default-vendor selection entries must not be mixed into plan ledgers',
    );
  }
});

test('buildPlan propagates ValidationError from a selector unchanged', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const { ValidationError } = require('../../src/types/engine/contracts');

  const selectorError = new ValidationError(
    'gateway.requirements',
    'Invalid selector requirements.',
  );

  assert.throws(
    () =>
      buildPlan(
        omadaVendor,
        'CE',
        requirements,
        input,
        catalog,
        createCtx(),
        {
          selectGateway: () => {
            throw selectorError;
          },
        },
      ),
    (error) =>
      error === selectorError &&
      error.name === 'ValidationError' &&
      error.field === 'gateway.requirements',
  );
});

test('buildPlan records access-point unmet result against the current vendor', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');

  const gatewaySku = {
    sku: 'TEST-AP-UNMET-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  const plan = buildPlan(
    omadaVendor,
    'CE',
    requirements,
    input,
    catalog,
    createCtx(),
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
      selectAccessPoints: () => ({
        ok: false,
        unmet: {
          category: 'access_point',
          vendor: omadaVendor.name,
          reason: 'No suitable access point available.',
        },
        flags: [],
      }),
    },
  );

  assert.equal(plan.complete, false);
  assert.ok(
    plan.unmet.some(
      (item) =>
        item.category === 'access_point' &&
        item.vendor === omadaVendor.name &&
        item.reason === 'No suitable access point available.',
    ),
    'The AP unmet result should be attributed to the current vendor',
  );
});

test('runEngine keeps empty-catalog vendor plans incomplete without affecting another vendor', () => {
  const emptyCatalogVendor = {
    name: 'Empty Catalog Vendor',
    needController: false,
    managementModes: ['dashboard'],
  };

  assert.equal(
    catalog.some((sku) => sku.vendor === emptyCatalogVendor.name),
    false,
    'The test vendor must have no catalog rows',
  );

  const gatewaySku = {
    sku: 'TEST-OMADA-GATEWAY',
    vendor: omadaVendor.name,
    category: 'gateway',
  };

  const result = runEngine(
    input,
    requirements,
    catalog,
    [emptyCatalogVendor, omadaVendor],
    {
      selectGateway: ({ vendor }) => {
        if (vendor === emptyCatalogVendor.name) {
          return {
            ok: false,
            unmet: {
              category: 'gateway',
              vendor,
              reason: 'No catalog rows are available for this vendor.',
            },
            flags: [],
          };
        }

        return {
          ok: true,
          sku: gatewaySku,
          qty: 1,
          flags: [],
        };
      },
    },
  );

  assert.equal(result.plans.length, 4);

  const emptyVendorPlans = result.plans.filter(
    (plan) => plan.vendor === emptyCatalogVendor.name,
  );
  const omadaPlans = result.plans.filter(
    (plan) => plan.vendor === omadaVendor.name,
  );

  assert.equal(emptyVendorPlans.length, 2);
  assert.ok(emptyVendorPlans.every((plan) => plan.complete === false));
  assert.ok(
    emptyVendorPlans.every((plan) =>
      plan.unmet.some(
        (item) =>
          item.category === 'gateway' &&
          item.vendor === emptyCatalogVendor.name,
      ),
    ),
  );

  assert.equal(omadaPlans.length, 2);
  assert.ok(
    omadaPlans.every((plan) => plan.complete === true),
    'Omada plans should remain complete despite the other vendor having no catalog rows',
  );
});

test('AC6 continues building other vendor-plan combinations when enclosure is unmet', () => {
  const secondVendor = {
    name: 'Test Vendor',
    needController: false,
    managementModes: ['dashboard'],
  };

  const result = runEngine(
    { ...input, housing: 'closet' },
    requirements,
    catalog,
    [omadaVendor, secondVendor],
    {
      selectGateway: ({ vendor, plan }) => ({
        ok: true,
        sku: {
          sku: `TEST-${vendor}-${plan}`,
          vendor,
          category: 'gateway',
          rack_units:
            vendor === omadaVendor.name && plan === 'cost_efficient'
              ? 1
              : 0,
        },
        qty: 1,
        flags: [],
      }),
    },
  );

  assert.equal(result.plans.length, 4);

  const failedPlan = result.plans.find(
    (plan) =>
      plan.vendor === omadaVendor.name &&
      plan.planType === 'CE',
  );

  assert.ok(failedPlan);
  assert.equal(failedPlan.complete, false);
  assert.equal(failedPlan.enclosureSelection.ok, false);
  assert.ok(
    failedPlan.unmet.some(
      (item) =>
        item.category === 'enclosure' &&
        item.vendor === omadaVendor.name,
    ),
  );

  const remainingPlans = result.plans.filter(
    (plan) => plan !== failedPlan,
  );

  assert.equal(remainingPlans.length, 3);
  assert.ok(
    remainingPlans.every((plan) => plan.complete === true),
    'The other vendor-plan combinations should complete despite the enclosure unmet',
  );
});

test('AC7 calls controller selection after counting selected devices and adds the controller', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const vendor = { ...testVendor };
  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GW-HA',
    vendor: vendor.name,
    category: 'gateway',
  };
  const apSku = {
    sku: 'TEST-AP',
    vendor: vendor.name,
    category: 'access_point',
  };
  const switchSku = {
    sku: 'TEST-SW',
    vendor: vendor.name,
    category: 'switch',
  };
  const controllerSku = {
    sku: 'TEST-CONTROLLER',
    vendor: vendor.name,
    category: 'controller',
  };

  const calls = [];

  const plan = buildPlan(
    vendor,
    'CE',
    requirements,
    input,
    [gatewaySku, apSku, switchSku, controllerSku],
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 2,
        flags: [],
      }),
      selectAccessPoints: () => ({
        ok: true,
        sku: apSku,
        qty: 2,
        flags: [],
      }),
      computePoeBudget: () => ({ perFloor: [{ loadW: 20, budgetW: 24 }] }),
      selectSwitches: () => ({
        ok: true,
        accessSwitches: [{ sku: switchSku, qty: 3 }],
      }),
      controller: {
        integratedControllerCheck: (selectedGateway, receivedCtx) => {
          calls.push('integratedControllerCheck');
          assert.strictEqual(selectedGateway, gatewaySku);
          assert.strictEqual(receivedCtx, ctx);
          return false;
        },
        countManagedDevices: (items) => {
          calls.push('countManagedDevices');
          return {
            aps: items.filter((item) => item.category === 'access_point')
              .reduce((sum, item) => sum + item.qty, 0),
            switches: items.filter((item) => item.category === 'switch')
              .reduce((sum, item) => sum + item.qty, 0),
            gateways: items.filter((item) => item.category === 'gateway')
              .reduce((sum, item) => sum + item.qty, 0),
          };
        },
        selectController: (receivedVendor, planType, counts, receivedCatalog, receivedCtx) => {
          calls.push('selectController');
          assert.equal(receivedVendor, vendor.name);
          assert.equal(planType, 'CE');
          assert.deepEqual(counts, {
            aps: 2,
            switches: 3,
            gateways: 2,
          });
          assert.strictEqual(receivedCatalog[0], gatewaySku);
          assert.strictEqual(receivedCtx, ctx);

          return {
            ok: true,
            sku: controllerSku,
            qty: 1,
            flags: [],
          };
        },
      },
    },
  );

  assert.deepEqual(calls, [
    'integratedControllerCheck',
    'countManagedDevices',
    'selectController',
  ]);
  assert.ok(
    plan.items.some(
      (item) =>
        item.category === 'controller' &&
        item.sku === controllerSku.sku &&
        item.qty === 1,
    ),
  );
});

test('AC7 skips separate controller selection when the gateway has an integrated controller', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const vendor = { ...testVendor };
  const ctx = createCtx();

  const gatewaySku = {
    sku: 'TEST-GW-INTEGRATED',
    vendor: vendor.name,
    category: 'gateway',
    capabilities: ['controller'],
  };

  let controllerSelectionCalls = 0;

  const plan = buildPlan(
    vendor,
    'CE',
    requirements,
    input,
    [gatewaySku],
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
      controller: {
        integratedControllerCheck: (selectedGateway, receivedCtx) => {
          assert.strictEqual(selectedGateway, gatewaySku);
          assert.strictEqual(receivedCtx, ctx);

          const controllerStep = require('../../src/types/engine/devices/controller');
          return controllerStep.integratedControllerCheck(selectedGateway, receivedCtx);
        },
        countManagedDevices: () => {
          throw new Error('Must not count devices for an integrated controller.');
        },
        selectController: () => {
          controllerSelectionCalls += 1;
          throw new Error('Must not select a separate controller.');
        },
      },
    },
  );

  assert.equal(controllerSelectionCalls, 0);
  assert.equal(plan.complete, true);
  assert.equal(
    plan.items.some((item) => item.category === 'controller'),
    false,
  );
  assert.ok(
    ctx.flags.some(
      (flag) => flag.code === 'CONTROLLER_CAPACITY_NOT_VERIFIED',
    ),
  );
});

test('AC7 skips controller checks when vendor needController is false', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const vendor = { ...omadaVendor, needController: false };
  const ctx = createCtx();
  const gatewaySku = {
    sku: 'TEST-GW-NO-CONTROLLER',
    vendor: vendor.name,
    category: 'gateway',
  };

  const controller = {
    integratedControllerCheck: () => {
      throw new Error('Controller check must be skipped.');
    },
    countManagedDevices: () => {
      throw new Error('Device counting must be skipped.');
    },
    selectController: () => {
      throw new Error('Controller selection must be skipped.');
    },
  };

  const plan = buildPlan(
    vendor,
    'CE',
    requirements,
    input,
    [gatewaySku],
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
      controller,
    },
  );

  assert.equal(plan.complete, true);
  assert.equal(
    plan.items.some((item) => item.category === 'controller'),
    false,
  );
  assert.equal(
    ctx.flags.some((flag) => flag.code === 'CONTROLLER_CAPACITY_NOT_VERIFIED'),
    false,
  );
});

test('AC6 records controller unmet against the plan vendor and marks the plan incomplete', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const vendor = { ...testVendor };
  const ctx = createCtx();
  const gatewaySku = {
    sku: 'TEST-GW-NON-INTEGRATED',
    vendor: vendor.name,
    category: 'gateway',
  };

  const plan = buildPlan(
    vendor,
    'CE',
    requirements,
    input,
    [gatewaySku],
    ctx,
    {
      selectGateway: () => ({
        ok: true,
        sku: gatewaySku,
        qty: 1,
        flags: [],
      }),
    },
  );

  assert.equal(plan.complete, false);
  assert.ok(
    plan.unmet.some(
      (item) =>
        item.category === 'controller' &&
        item.vendor === vendor.name &&
        item.reason === 'controller selection not implemented yet',
    ),
  );
});

test('AC6 propagates ValidationError from the controller selector unchanged', () => {
  const { buildPlan } = require('../../src/types/engine/orchestration');
  const { ValidationError } = require('../../src/types/engine/contracts');
  const vendor = { ...testVendor };
  const gatewaySku = {
    sku: 'TEST-GW-CONTROLLER-ERROR',
    vendor: vendor.name,
    category: 'gateway',
  };
  const selectorError = new ValidationError(
    'controller.catalog',
    'Invalid controller catalog.',
  );

  assert.throws(
    () =>
      buildPlan(
        vendor,
        'CE',
        requirements,
        input,
        [gatewaySku],
        createCtx(),
        {
          selectGateway: () => ({
            ok: true,
            sku: gatewaySku,
            qty: 1,
            flags: [],
          }),
          controller: {
            integratedControllerCheck: () => false,
            countManagedDevices: () => ({
              aps: 0,
              switches: 0,
              gateways: 1,
            }),
            selectController: () => {
              throw selectorError;
            },
          },
        },
      ),
    (error) =>
      error === selectorError &&
      error.name === 'ValidationError' &&
      error.field === 'controller.catalog',
  );
});

test('AC6 continues producing other vendor plans when controller selection is unmet', () => {
  const vendors = [omadaVendor, testVendor];
  const testVendorCatalog = catalog.map((sku) => ({
    ...sku,
    vendor: testVendor.name,
  }));

  const result = runEngine(
    input,
    requirements,
    [...catalog, ...testVendorCatalog],
    vendors,
    {
      selectGateway: ({ vendor }) => {
        const sku = {
          sku: `${vendor.replace(/\s+/g, '-')}-GATEWAY`,
          vendor,
          category: 'gateway',
        };

        return {
          ok: true,
          sku,
          qty: 1,
          flags: [],
        };
      },
    },
  );

  assert.equal(result.plans.length, 4);

  const omadaPlans = result.plans.filter(
    (plan) => plan.vendor === omadaVendor.name,
  );
  const testVendorPlans = result.plans.filter(
    (plan) => plan.vendor === testVendor.name,
  );

  assert.equal(omadaPlans.length, 2);
  assert.ok(omadaPlans.every((plan) => plan.complete === true));
  assert.ok(omadaPlans.every((plan) => plan.unmet.length === 0));

  assert.equal(testVendorPlans.length, 2);
  assert.ok(testVendorPlans.every((plan) => plan.complete === false));
  assert.ok(
    testVendorPlans.every((plan) =>
      plan.unmet.some(
        (item) =>
          item.category === 'controller' &&
          item.vendor === testVendor.name,
      ),
    ),
  );
});
