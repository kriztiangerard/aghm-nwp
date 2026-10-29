
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { resolveHousingType } =
  require('../../src/types/engine/devices/enclosure.js');
  
const { chooseEnclosure } =
  require('../../src/types/engine/devices/enclosure.js');

const { createCtx } =
  require('../../src/types/engine/ctx.js');

const { computeRequiredRackUnits } =
  require('../../src/types/engine/devices/enclosure.js');

test('required rack units are calculated from rack units multiplied by quantity', () => {
  const ctx = createCtx();

  const planItems = [
    {
      sku: { sku: 'SW-1U', category: 'switch', rack_units: 1 },
      qty: 2,
    },
    {
      sku: { sku: 'SW-2U', category: 'switch', rack_units: 2 },
      qty: 3,
    },
  ];

  const result = computeRequiredRackUnits(planItems, ctx);

  assert.strictEqual(result.requiredU, 8);
});

test('missing rack_units is excluded from the total and flagged as unknown', () => {
  const ctx = createCtx();

  const planItems = [
    {
      sku: { sku: 'SW-1U', category: 'switch', rack_units: 1 },
      qty: 2,
    },
    {
      sku: {
        sku: 'UNKNOWN-HEIGHT',
        category: 'switch',
      },
      qty: 3,
    },
  ];

  const result = computeRequiredRackUnits(planItems, ctx);

  assert.strictEqual(result.requiredU, 2);
  assert.ok(
    ctx.flags.some((flag) => flag.code === 'RACK_UNITS_UNKNOWN'),
  );
  assert.ok(
    ctx.flags.some((flag) => flag.message.includes('UNKNOWN-HEIGHT')),
  );
});

test('rack_units of zero is excluded from the total and flagged as not rack-mountable', () => {
  const ctx = createCtx();

  const planItems = [
    {
      sku: { sku: 'SW-1U', category: 'switch', rack_units: 1 },
      qty: 2,
    },
    {
      sku: {
        sku: 'PRINTER-0U',
        category: 'switch',
        rack_units: 0,
      },
      qty: 1,
    },
  ];

  const result = computeRequiredRackUnits(planItems, ctx);

  assert.strictEqual(result.requiredU, 2);
  assert.ok(
    ctx.flags.some(
      (flag) => flag.code === 'DEVICE_NOT_RACK_MOUNTABLE',
    ),
  );
  assert.ok(
    ctx.flags.some((flag) => flag.message.includes('PRINTER-0U')),
  );
});

test('access points are excluded from required rack units', () => {
  const ctx = createCtx();

  const planItems = [
    {
      sku: { sku: 'GW-1U', category: 'gateway', rack_units: 1 },
      qty: 1,
    },
    {
      sku: { sku: 'AP-0U', category: 'access_point', rack_units: 0 },
      qty: 6,
    },
  ];

  const result = computeRequiredRackUnits(planItems, ctx);

  assert.strictEqual(result.requiredU, 1);
  assert.strictEqual(
    ctx.flags.some((flag) => flag.code === 'DEVICE_NOT_RACK_MOUNTABLE'),
    false,
  );
});

test('closet housing resolves to rack', () => {
  const ctx = createCtx();

  const result = resolveHousingType('closet', 20, ctx);

  assert.strictEqual(result, 'rack');
});

test('wall housing resolves to wall', () => {
  const ctx = createCtx();

  const result = resolveHousingType('wall', 20, ctx);

  assert.strictEqual(result, 'wall');
});

test('notSure housing uses wall when required U is within the 9U threshold', () => {
  const ctx = createCtx();

  const result = resolveHousingType('notSure', 9, ctx);

  assert.strictEqual(result, 'wall');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'housing' &&
        entry.valueUsed === 'wall' &&
        entry.reason,
    ),
  );
});

test('notSure housing uses wall at exactly 9U', () => {
  const ctx = createCtx();

  const result = resolveHousingType('notSure', 9, ctx);

  assert.strictEqual(result, 'wall');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'housing' &&
        entry.valueUsed === 'wall' &&
        entry.reason.includes('9U'),
    ),
  );
});

test('notSure housing uses rack when required U exceeds 9U', () => {
  const ctx = createCtx();

  const result = resolveHousingType('notSure', 10, ctx);

  assert.strictEqual(result, 'rack');
  assert.ok(
    ctx.ledger.some(
      (entry) =>
        entry.field === 'housing' &&
        entry.valueUsed === 'rack' &&
        entry.reason.includes('exceeds'),
    ),
  );
});

test('chooseEnclosure selects the smallest priced generic wall cabinet that fits', () => {
  const ctx = createCtx();

  const catalog = [
    {
      sku: 'GENERIC-WALL-4U',
      vendor: 'Generic',
      name: 'Generic 4U wall cabinet',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 1000,
      rack_units: 4,
      form_factor: 'wall',
    },
    {
      sku: 'GENERIC-WALL-6U',
      vendor: 'Generic',
      name: 'Generic 6U wall cabinet',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 1500,
      rack_units: 6,
      form_factor: 'wall',
    },
    {
      sku: 'OTHER-WALL-9U',
      vendor: 'Omada',
      name: 'Vendor-specific 9U cabinet',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 500,
      rack_units: 9,
      form_factor: 'wall',
    },
    {
      sku: 'GENERIC-WALL-9U-UNPRICED',
      vendor: 'Generic',
      name: 'Unpriced 9U wall cabinet',
      category: 'enclosure',
      status: 'ACTIVE',
      price: null,
      rack_units: 9,
      form_factor: 'wall',
    },
  ];

  const result = chooseEnclosure({
    requirements: {},
    devices: [],
    ctx,
    catalog,
    vendor: 'Omada',
    plan: 'cost_efficient',
    housing: 'wall',
    requiredU: 5,
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.sku.sku, 'GENERIC-WALL-6U');
  assert.strictEqual(result.qty, 1);
  assert.ok(result.flags.some((flag) => flag.code === 'ENCLOSURE_GENERIC'));
});
test('chooseEnclosure selects a generic rack for closet housing', () => {
  const ctx = createCtx();

  const catalog = [
    {
      sku: 'GENERIC-RACK-12U',
      vendor: 'Generic',
      name: 'Generic 12U floor rack',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 3000,
      rack_units: 12,
      form_factor: 'rack',
    },
    {
      sku: 'GENERIC-RACK-22U',
      vendor: 'Generic',
      name: 'Generic 22U floor rack',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 5000,
      rack_units: 22,
      form_factor: 'rack',
    },
    {
      sku: 'GENERIC-WALL-9U',
      vendor: 'Generic',
      name: 'Generic 9U wall cabinet',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 2000,
      rack_units: 9,
      form_factor: 'wall',
    },
  ];

  const result = chooseEnclosure({
    requirements: {},
    devices: [],
    ctx,
    catalog,
    vendor: 'Omada',
    plan: 'cost_efficient',
    housing: 'closet',
    requiredU: 10,
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.sku.sku, 'GENERIC-RACK-12U');
  assert.strictEqual(result.qty, 1);
  assert.ok(result.flags.some((flag) => flag.code === 'ENCLOSURE_GENERIC'));
});
test('chooseEnclosure returns unmet when no generic enclosure can fit', () => {
  const ctx = createCtx();

  const catalog = [
    {
      sku: 'GENERIC-RACK-12U',
      vendor: 'Generic',
      name: 'Generic 12U floor rack',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 3000,
      rack_units: 12,
      form_factor: 'rack',
    },
  ];

  const result = chooseEnclosure({
    requirements: {},
    devices: [],
    ctx,
    catalog,
    vendor: 'Omada',
    plan: 'cost_efficient',
    housing: 'closet',
    requiredU: 15,
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.unmet.category, 'enclosure');
  assert.strictEqual(result.unmet.vendor, 'Omada');
  assert.ok(result.unmet.reason.includes('15U'));
  assert.strictEqual(ctx.unmet.length, 1);
});
test('chooseEnclosure ignores vendor-specific enclosure entries', () => {
  const ctx = createCtx();

  const catalog = [
    {
      sku: 'OMADA-WALL-6U',
      vendor: 'Omada',
      name: 'Omada 6U wall cabinet',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 500,
      rack_units: 6,
      form_factor: 'wall',
    },
  ];

  const result = chooseEnclosure({
    requirements: {},
    devices: [],
    ctx,
    catalog,
    vendor: 'Omada',
    plan: 'cost_efficient',
    housing: 'wall',
    requiredU: 5,
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.unmet.category, 'enclosure');
  assert.ok(result.unmet.reason.includes('5U'));
});
test('chooseEnclosure does not bill an enclosure when required U is zero', () => {
  const ctx = createCtx();

  const result = chooseEnclosure({
    requirements: {},
    devices: [],
    ctx,
    catalog: [],
    vendor: 'Omada',
    plan: 'cost_efficient',
    housing: 'notSure',
    requiredU: 0,
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.qty, 0);
  assert.ok(
    ctx.ledger.some((entry) =>
      entry.reason.includes('No rack-mountable devices were selected'),
    ),
  );
});
test('chooseEnclosure uses the lower price when capacities match', () => {
  const ctx = createCtx();

  const catalog = [
    {
      sku: 'GENERIC-WALL-6U-B',
      vendor: 'Generic',
      name: 'Generic 6U wall cabinet B',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 1600,
      rack_units: 6,
      form_factor: 'wall',
    },
    {
      sku: 'GENERIC-WALL-6U-A',
      vendor: 'Generic',
      name: 'Generic 6U wall cabinet A',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 1400,
      rack_units: 6,
      form_factor: 'wall',
    },
  ];

  const result = chooseEnclosure({
    requirements: {},
    devices: [],
    ctx,
    catalog,
    vendor: 'Omada',
    plan: 'cost_efficient',
    housing: 'wall',
    requiredU: 5,
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.sku.sku, 'GENERIC-WALL-6U-A');
});
test('chooseEnclosure uses SKU order when capacity and price match', () => {
  const ctx = createCtx();

  const catalog = [
    {
      sku: 'GENERIC-WALL-6U-B',
      vendor: 'Generic',
      name: 'Generic 6U wall cabinet B',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 1500,
      rack_units: 6,
      form_factor: 'wall',
    },
    {
      sku: 'GENERIC-WALL-6U-A',
      vendor: 'Generic',
      name: 'Generic 6U wall cabinet A',
      category: 'enclosure',
      status: 'ACTIVE',
      price: 1500,
      rack_units: 6,
      form_factor: 'wall',
    },
  ];

  const result = chooseEnclosure({
    requirements: {},
    devices: [],
    ctx,
    catalog,
    vendor: 'Omada',
    plan: 'cost_efficient',
    housing: 'wall',
    requiredU: 5,
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.sku.sku, 'GENERIC-WALL-6U-A');
});
test('rack-unit calculation excludes unrelated items and non-hardware controllers', () => {
  const ctx = createCtx();

  const planItems = [
    {
      sku: { sku: 'GW-1U', category: 'gateway', rack_units: 1 },
      qty: 1,
    },
    {
      sku: { sku: 'SW-2U', category: 'switch', rack_units: 2 },
      qty: 2,
    },
    {
      sku: {
        sku: 'CTRL-HW-1U',
        category: 'controller',
        controller_type: 'hardware',
        rack_units: 1,
      },
      qty: 1,
    },
    {
      sku: {
        sku: 'CTRL-CLOUD-1U',
        category: 'controller',
        controller_type: 'cloud',
        rack_units: 1,
      },
      qty: 1,
    },
    {
      sku: { sku: 'OPTIC-1U', category: 'optic', rack_units: 1 },
      qty: 2,
    },
    {
      sku: { sku: 'ENCLOSURE-12U', category: 'enclosure', rack_units: 12 },
      qty: 1,
    },
    {
      sku: { sku: 'AP-1U', category: 'access_point', rack_units: 1 },
      qty: 4,
    },
  ];

  const result = computeRequiredRackUnits(planItems, ctx);

  // Gateway 1U + switches 4U + hardware controller 1U = 6U.
  assert.strictEqual(result.requiredU, 6);
});
test('standalone firewalls contribute to required rack units', () => {
  const ctx = createCtx();

  const planItems = [
    {
      sku: {
        sku: 'FW-1U',
        category: 'firewall',
        rack_units: 1,
      },
      qty: 2,
    },
  ];

  const result = computeRequiredRackUnits(planItems, ctx);

  assert.strictEqual(result.requiredU, 2);
});
