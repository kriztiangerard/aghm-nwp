'use strict';

// NWP-ENGINE-015 � Vendor � plan orchestration.
// This module coordinates existing engine steps; it does not implement their algorithms.

const {
  CONTRACT_VERSION,
  ValidationError,
  validateNormalizedInput,
  validateRequirements,
  validateCatalogSku,
  validateVendorDescriptors,
  validateBom,
} = require('./contracts');
const { createCtx } = require('./ctx');

const { selectGateway } = require('./devices/gateway');
const { selectAccessPoints } = require('./devices/aps');
const { computePoeBudget } = require('./devices/poe');
const { selectSwitches } = require('./devices/switches');

const {
  computeRequiredRackUnits,
  resolveHousingType,
  chooseEnclosure,
} = require('./devices/enclosure');

const { recommendPower } = require('./devices/power');
const { planOptics } = require('./devices/optics');

function getPlanRequirements(reqs, planType) {
  if (planType !== 'CE' && planType !== 'HP') {
    throw new Error(`Unknown plan type '${planType}'`);
  }

  return {
    ...reqs,
    wireless: reqs.wireless,
    vpnTunnelsNeeded: reqs.vpnTunnelsNeeded,
  };
}

const PLAN_TYPES = Object.freeze([
  { planType: 'CE', selectorPlan: 'cost_efficient' },
  { planType: 'HP', selectorPlan: 'high_performance' },
]);

function validateEngineInputs(input, reqs, catalog, vendors) {
  validateNormalizedInput(input);
  validateRequirements(reqs);

if (!Array.isArray(catalog)) {
  throw new ValidationError('catalog', 'Must be an array.');
}

  catalog.forEach((sku, index) => {
    try {
      validateCatalogSku(sku);
    } catch (error) {
      error.message = `catalog[${index}]: ${error.message}`;
      throw error;
    }
  });

  validateVendorDescriptors(vendors);

  const genericName = require('./params').GENERIC_VENDOR_NAME;

  vendors.forEach((vendor) => {
    if (vendor.name === genericName) {
  throw new ValidationError(
    'vendors',
    `Vendor '${genericName}' is reserved for generic infrastructure and cannot have plans.`,
  );
}

  });

  return { genericName };
}

function createEmptyPlan(vendor, planType, catalog) {
  const ctx = createCtx();

  return {
    vendor: vendor.name,
    planType,
    complete: false,
    items: [],
    bom: {
      currency: catalog[0]?.currency || 'PHP',
      lines: [],
      total: null,
      totalIsPartial: true,
    },
    unmet: ctx.unmet,
    flags: ctx.flags,
    ledger: ctx.ledger,
  };
}

function recordUnmetIfMissing(ctx, unmet, vendor) {
  const vendorUnmet = {
    ...unmet,
    vendor,
  };

  const alreadyRecorded = ctx.unmet.some(
    (item) =>
      item.category === vendorUnmet.category &&
      item.vendor === vendorUnmet.vendor &&
      item.reason === vendorUnmet.reason,
  );

  if (!alreadyRecorded) {
    ctx.unmet.push(vendorUnmet);
  }
}

function assertSelectedVendor(selection, vendor, category) {
  if (!selection?.ok || !selection.sku) {
    return;
  }

  const selectedVendor = selection.sku.vendor;

  // Generic is allowed only for enclosure selection.
  if (
    selectedVendor === vendor.name ||
    (category === 'enclosure' && selectedVendor === 'Generic')
  ) {
    return;
  }

  const error = new Error(
    `NWP-ENGINE-015 vendor consistency defect: ` +
    `${vendor.name} plan selected ${selectedVendor} ` +
    `${category} SKU ${selection.sku.sku}.`,
  );

  error.name = 'OrchestrationDefect';
  throw error;
}

function buildPlan(vendor, planType, reqs, input, catalog, ctx, steps = {}) {
  const selectorPlan = planType === 'CE'
    ? 'cost_efficient'
    : planType === 'HP'
      ? 'high_performance'
      : null;

  if (!selectorPlan) {
    throw new Error(`Unknown plan type '${planType}'`);
  }

  if (!ctx || !Array.isArray(ctx.ledger)
      || !Array.isArray(ctx.flags) || !Array.isArray(ctx.unmet)) {
    throw new TypeError('buildPlan requires a context from createCtx()');
  }

  // The orchestration layer receives selector implementations as dependencies.
  // This keeps the call order testable without hiding unfinished selector errors.
  if (typeof steps.selectGateway !== 'function') {
    throw new Error('buildPlan requires steps.selectGateway');
  }

  const plan = {
    vendor: vendor.name,
    planType,
    complete: true,
    items: [],
    bom: {
      currency: catalog[0]?.currency || 'PHP',
      lines: [],
      total: null,
      totalIsPartial: true,
    },
    unmet: ctx.unmet,
    flags: ctx.flags,
    ledger: ctx.ledger,
  };

  const planRequirements = getPlanRequirements(reqs, planType);
  const selectedDeviceItems = [];

    const gatewayResult = steps.selectGateway({
    catalog,
    vendor: vendor.name,
    requirements: planRequirements,
    plan: selectorPlan,
    cePick: steps.cePick,
    ctx,
  });

  const { validateSelectionResult } = require('./contracts');
  validateSelectionResult(gatewayResult);
  assertSelectedVendor(gatewayResult, vendor, 'gateway');

  if (gatewayResult.ok) {
    plan.items.push({
      category: 'gateway',
      sku: gatewayResult.sku.sku,
      qty: gatewayResult.qty,
    });
      selectedDeviceItems.push({
    sku: gatewayResult.sku,
    qty: gatewayResult.qty,
  });
  } else {
    recordUnmetIfMissing(ctx, gatewayResult.unmet, vendor.name);
    plan.complete = false;
  }

  let apResult = null;

  // AP selection is optional until the caller supplies the selector.
  // This preserves existing gateway-only orchestration tests.
  if (typeof steps.selectAccessPoints === 'function') {
    apResult = steps.selectAccessPoints({
      catalog,
      vendor: vendor.name,
      requirements: planRequirements,
      plan: planType,
      cePick: steps.cePick,
      ctx,
      input,
    });

    validateSelectionResult(apResult);
    assertSelectedVendor(apResult, vendor, 'access_point');

    if (apResult.ok) {
      plan.items.push({
        category: 'access_point',
        sku: apResult.sku.sku,
        qty: apResult.qty,
      });
        selectedDeviceItems.push({
    sku: apResult.sku,
    qty: apResult.qty,
  });
    } else {
      recordUnmetIfMissing(ctx, apResult.unmet, vendor.name);
      plan.complete = false;
    }
  }

    // PoE budgeting requires a successful AP selection.
  // If AP selection failed, preserve the incomplete plan and continue orchestration.
  let poeBudget = null;

  if (
    typeof steps.computePoeBudget === 'function' &&
    apResult?.ok === true
  ) {
    poeBudget = steps.computePoeBudget({
      requirements: planRequirements,
      apSelection: apResult,
      plan: planType,
      ctx,
    });

    plan.poeBudget = poeBudget;
  }

  // Switch selection requires both a successful AP selection and a PoE budget.
  // The switch selector has a different result contract from gateway/AP selectors.
  if (
    typeof steps.selectSwitches === 'function' &&
    apResult?.ok === true &&
    poeBudget !== null
  ) {
    const switchResult = steps.selectSwitches({
      catalog,
      vendor: vendor.name,
      requirements: planRequirements,
      poeBudget,
      apSelection: apResult,
      plan: planType,
      cePick: steps.cePick,
      ctx,
    });

    if (!switchResult || typeof switchResult.ok !== 'boolean') {
      throw new TypeError(
        'Switch selector must return an object with an ok boolean flag.',
      );
    }

    if (switchResult.ok) {
      if (!Array.isArray(switchResult.accessSwitches)) {
        throw new TypeError(
          'Successful switch selection must include an accessSwitches array.',
        );
      }

      switchResult.accessSwitches.forEach((accessSwitch) => {
        assertSelectedVendor(
  { ok: true, sku: accessSwitch.sku },
  vendor,
  'switch',
);
        if (!accessSwitch?.sku || !Number.isFinite(accessSwitch.qty)) {
          throw new TypeError(
            'Each selected access switch must include a SKU and quantity.',
          );
        }

        plan.items.push({
          category: 'switch',
          sku: accessSwitch.sku.sku,
          qty: accessSwitch.qty,
          floor: accessSwitch.floor,
          uplinksPerSwitch: accessSwitch.uplinksPerSwitch,
        });
        selectedDeviceItems.push({
  sku: accessSwitch.sku,
  qty: accessSwitch.qty,
});
      });

      plan.switchSelection = switchResult;
    } else {
      if (
        !switchResult.unmet ||
        typeof switchResult.unmet.category !== 'string' ||
        typeof switchResult.unmet.reason !== 'string'
      ) {
        throw new TypeError(
          'Unsuccessful switch selection must include an unmet result.',
        );
      }

      recordUnmetIfMissing(ctx, switchResult.unmet, vendor.name);
      plan.complete = false;
    }
  }

  // Selector results already contain the full SKU objects needed for rack sizing.
const resolvedItems = selectedDeviceItems;
  // NWP-ENGINE-012: optics requirement uses the first selected switch.
  // Optics are a requirement only; they are not selected SKUs or BOM lines.
  const selectedSwitchSpecs =
    plan.switchSelection?.ok === true
      ? (
          plan.switchSelection.accessSwitches?.[0]?.sku?.switch_specs ??
          plan.switchSelection.accessSwitches?.[0]?.sku
         )
      : undefined;

  plan.optics = planOptics(
    input,
    planRequirements,
    selectedSwitchSpecs,
    ctx,
  );
  const { requiredU } = computeRequiredRackUnits(resolvedItems, ctx);

  const enclosureResult = chooseEnclosure({
    requirements: planRequirements,
    devices: resolvedItems,
    ctx,
    catalog,
    vendor: vendor.name,
    plan: planType,
    housing: input.housing,
    requiredU,
  });

    // Preserve the enclosure selector result for both success and failure.
  plan.enclosureSelection = enclosureResult;
  assertSelectedVendor(enclosureResult, vendor, 'enclosure');

  if (enclosureResult.ok) {
    if (enclosureResult.qty > 0) {
      plan.items.push({
        category: 'enclosure',
        sku: enclosureResult.sku.sku,
        qty: enclosureResult.qty,
      });
    }
  } else {
    recordUnmetIfMissing(ctx, enclosureResult.unmet, vendor.name);
    plan.complete = false;
  }

  // Power recommendation is advisory; it does not select or add equipment.
  plan.powerProtection = recommendPower({ input });

  // BOM assembly is injected until BOM-001 provides its implementation.
  if (typeof steps.buildBom === 'function') {
    const bom = steps.buildBom(plan, catalog);
    validateBom(bom);
    plan.bom = bom;
  }

  return plan;
}

function runEngine(input, reqs, catalog, vendors, steps = { selectGateway }) {
  validateEngineInputs(input, reqs, catalog, vendors);

  const plans = [];

  vendors.forEach((vendor) => {
    PLAN_TYPES.forEach(({ planType }) => {
      const ctx = createCtx();

      plans.push(
        buildPlan(
          vendor,
          planType,
          reqs,
          input,
          catalog,
          ctx,
          steps,
        ),
      );
    });
  });

  return {
    contractVersion: CONTRACT_VERSION,
    requirements: reqs,
    ledger: [],
    flags: [],
    plans,
    defaultVendor: { CE: null, HP: null },
  };
}

module.exports = {
  runEngine,
  validateEngineInputs,
  PLAN_TYPES,
  createEmptyPlan,
  buildPlan,
  getPlanRequirements,
};
