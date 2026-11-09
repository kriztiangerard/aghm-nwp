'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const raw = require('../fixtures/raw-answers/input1-baseline.json');
const requirements = require('../fixtures/requirements/input1-requirements.json');
const catalogSnapshot = require('../fixtures/catalogs/omada.snapshot.json');

const { normalize } = require('../../src/types/engine/normalize');
const { createCtx } = require('../../src/types/engine/ctx');
const { computePoeBudget } = require('../../src/types/engine/devices/poe');
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
        calls.push({ plan, receivedCatalog });
        return { ...validTestBom };
      },
    },
  );

  assert.equal(result.plans.length, 2);
  assert.equal(calls.length, 2);

  result.plans.forEach((plan, index) => {
    assert.strictEqual(calls[index].plan, plan);
    assert.strictEqual(calls[index].receivedCatalog, testCatalog);
    assert.deepEqual(plan.bom, validTestBom);
  });
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

  assert.ok(
    syntheticProductLines.every((line) => line.vendor_id === 999),
    'synthetic product-line fixture should use vendor_id 999',
  );

  assert.ok(
    result.plans.every((plan) => plan.vendor !== 'Generic'),
    'Generic must not become a plan vendor',
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
  assert.ok(
    missingNullableFieldRun.plans.some((plan) =>
      plan.items.some((item) =>
        item.category === 'access_point' && item.sku === 'SYN-AP-005',
      ),
    ),
    'a sunsetting synthetic AP should be selectable through the normal AP selector',
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