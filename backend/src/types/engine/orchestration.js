'use strict';

// NWP-ENGINE-015: Vendor x plan orchestration.
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
const { createCtx, addLedger, addFlag } = require('./ctx');
const { assembleEngineResult } = require('./steps/assemble');
const { noCurrentModelUnmet } = require('./lifecycle');

const { selectGateway } = require('./devices/gateway');
const { selectAccessPoints } = require('./devices/aps');
const { computePoeBudget } = require('./devices/poe');
const { selectSwitches } = require('./devices/switches');
const { selectDefaultVendors } = require('./default-vendor.js');
const controllerStep = require('./devices/controller');

const {
  computeRequiredRackUnits,
  resolveHousingType,
  chooseEnclosure,
} = require('./devices/enclosure');

const { recommendPower } = require('./devices/power');
const { planOptics } = require('./devices/optics');
const { buildBom, buildInstallationMaterials } = require('./bom');

const DEFAULT_STEPS = Object.freeze({
  selectGateway,
  selectAccessPoints,
  computePoeBudget,
  selectSwitches,
  buildBom,
  buildInstallationMaterials,
});

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

const BOM_FLAG_CODES = Object.freeze({
  PARTIAL_PRICE: 'BOM_PARTIAL_PRICE',
  PLAN_INCOMPLETE: 'BOM_PLAN_INCOMPLETE',
  PRICE_STALE: 'BOM_PRICE_STALE',
});

// NWP-ENGINE-016 AC10: the result must not hold full catalog rows. Selector results (switchSelection,
// enclosureSelection) are kept on the plan, but every embedded SKU object is replaced by its SKU string.
function toPublicSelection(value) {
  if (Array.isArray(value)) return value.map(toPublicSelection);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        key === 'sku' && entry && typeof entry === 'object' ? entry.sku : toPublicSelection(entry),
      ]),
    );
  }
  return value;
}

function appendUnique(list, extra) {
  const seen = new Set(list.map((entry) => JSON.stringify(entry)));
  return [...list, ...extra.filter((entry) => !seen.has(JSON.stringify(entry)))];
}

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

function recordUnmetIfMissing(ctx, unmet, vendor, catalog) {
  const hasCurrentModel = catalog.some(
    (sku) =>
      sku.vendor === vendor &&
      sku.category === unmet.category &&
      ['ACTIVE', 'SUNSETTING'].includes(sku.status),
  );
  const isMissingCurrentModel =
    unmet.category !== 'enclosure' &&
    !hasCurrentModel &&
    unmet.reason.startsWith('No purchasable');
  const vendorUnmet = isMissingCurrentModel
    ? noCurrentModelUnmet(unmet.category, vendor).unmet
    : { ...unmet, vendor };

  const existingIndex = ctx.unmet.findIndex(
    (item) =>
      item.category === vendorUnmet.category &&
      item.vendor === vendorUnmet.vendor,
  );

  if (existingIndex === -1) ctx.unmet.push(vendorUnmet);
  else ctx.unmet[existingIndex] = vendorUnmet;
  return vendorUnmet;
}

function assertSelectedVendor(selection, vendor, category) {
  if (!selection?.ok || !selection.sku) {
    return;
  }

  const selectedVendor = selection.sku.vendor;

  // Generic is allowed only for enclosure selection.
  if (
    selectedVendor === vendor.name ||
    (category === 'enclosure' && selectedVendor === require('./params').GENERIC_VENDOR_NAME)
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
    recordUnmetIfMissing(ctx, gatewayResult.unmet, vendor.name, catalog);
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
      recordUnmetIfMissing(ctx, apResult.unmet, vendor.name, catalog);
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

      // NWP-ENGINE-016: the core switch is listed first among the switch items; the topology treats the first
      // switch item as the core and every later one as an access switch.
      // Preferred source: switchResult.coreSwitch ({ sku, qty }) from the core-switch selector in switches.js.
      // Stopgap until that selector exists: reuse the first access switch SKU, and only when the building has more
      // than one floor (a single-floor site has no uplinks to a core, so its access switch also serves as the core).
      let coreSwitch = null;

      if (switchResult.coreSwitch) {
        coreSwitch = switchResult.coreSwitch;
      } else if (
        switchResult.uplinksPerFloor > 0 &&
        switchResult.accessSwitches.length > 0 &&
        Number.isFinite(switchResult.coreSwitchQuantity) &&
        switchResult.coreSwitchQuantity > 0
      ) {
        coreSwitch = {
          sku: switchResult.accessSwitches[0].sku,
          qty: switchResult.coreSwitchQuantity,
        };
        addLedger(
          ctx,
          'coreSwitch',
          coreSwitch.sku.sku,
          'ESTIMATE: no core switch selector exists yet, so the first access switch model is used as the core switch.',
        );
      }

      if (coreSwitch) {
        assertSelectedVendor({ ok: true, sku: coreSwitch.sku }, vendor, 'switch');
        if (!coreSwitch.sku?.sku || !Number.isFinite(coreSwitch.qty)) {
          throw new TypeError('The core switch must include a SKU and quantity.');
        }

        plan.items.push({
          category: 'switch',
          sku: coreSwitch.sku.sku,
          qty: coreSwitch.qty,
        });
        selectedDeviceItems.push({
          sku: coreSwitch.sku,
          qty: coreSwitch.qty,
        });
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

      recordUnmetIfMissing(ctx, switchResult.unmet, vendor.name, catalog);
      plan.complete = false;
    }
  }

    // NWP-ENGINE-015 AC7: controller step. Selection logic lives in NWP-ENGINE-018.
  if (vendor.needController && gatewayResult.ok) {
    const controller = steps.controller || controllerStep;

    if (!controller.integratedControllerCheck(gatewayResult.sku, ctx)) {
      const counts = controller.countManagedDevices(plan.items);
      const controllerResult = controller.selectController(
        vendor.name, planType, counts, catalog, ctx,
      );

      validateSelectionResult(controllerResult);
      assertSelectedVendor(controllerResult, vendor, 'controller');

      if (controllerResult.ok) {
        plan.items.push({
          category: 'controller',
          sku: controllerResult.sku.sku,
          qty: controllerResult.qty,
        });
        selectedDeviceItems.push({
          sku: controllerResult.sku,
          qty: controllerResult.qty,
        });
      } else {
        recordUnmetIfMissing(ctx, controllerResult.unmet, vendor.name, catalog);
        plan.complete = false;
      }
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
    recordUnmetIfMissing(ctx, enclosureResult.unmet, vendor.name, catalog);
    plan.complete = false;
  }

  // Power recommendation is advisory; it does not select or add equipment.
  plan.powerProtection = recommendPower({ input });

  // BOM-01
  if (typeof steps.buildBom === 'function') {
    const bom = steps.buildBom(plan, catalog);
    validateBom(bom);
    plan.bom = bom;

    const addBomAdvisory = (code, message) => {
      if (!ctx.flags.some((flag) => flag.code === code)) {
        addFlag(ctx, code, message);
      }
    };

    const unpricedLines = bom.lines.filter(
      (line) => line.unitPrice === null,
    );

    if (unpricedLines.length > 0) {
      const skus = unpricedLines.map((line) => line.sku).sort();
      addBomAdvisory(
        BOM_FLAG_CODES.PARTIAL_PRICE,
        `No catalog price is available for selected SKU(s): ${skus.join(', ')}.`,
      );
    }

    if (plan.complete === false || plan.unmet.length > 0) {
      const missing = plan.unmet
        .map((item) => `${item.category}: ${item.reason}`)
        .join('; ');

      addBomAdvisory(
        BOM_FLAG_CODES.PLAN_INCOMPLETE,
        missing
          ? `Required equipment is missing from this plan: ${missing}`
          : 'Required equipment is missing from this plan.',
      );
    }

    const staleLines = bom.lines.filter((line) => line.isStale === true);

    if (staleLines.length > 0) {
      const details = staleLines
        .sort((a, b) => a.sku.localeCompare(b.sku))
        .map((line) => (
          line.priceUpdatedAt
            ? `${line.sku} (last verified: ${line.priceUpdatedAt})`
            : `${line.sku} (last verified date unavailable)`
        ));

      addBomAdvisory(
        BOM_FLAG_CODES.PRICE_STALE,
        `Catalog prices are stale for selected SKU(s): ${details.join(', ')}.`,
      );
    }
  }

  // NWP-BOM-002: advisory installation-materials summary (reference information, not BOM lines, not in the BOM total).
  if (typeof steps.buildInstallationMaterials === 'function') {
    plan.installationMaterials = steps.buildInstallationMaterials(plan, planRequirements);
  }

  return plan;
}


function runEngine(input, reqs, catalog, vendors, steps = DEFAULT_STEPS, sharedCtx = createCtx()) {
  validateEngineInputs(input, reqs, catalog, vendors);

  if (!sharedCtx || !Array.isArray(sharedCtx.ledger)
      || !Array.isArray(sharedCtx.flags) || !Array.isArray(sharedCtx.unmet)) {
    throw new TypeError('runEngine requires a sharedCtx from createCtx()');
  }

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

  // ENGINE-017 selects CE and HP defaults independently.
  const selectionCtx = createCtx();
  const defaultVendor = selectDefaultVendors(
    plans,
    input,
    vendors,
    selectionCtx,
  );

  // NWP-ENGINE-016: topology, configuration plan, limitations, and the merged ledger and flags.
  // Shared (requirements-phase) entries come first, then each plan's own entries (assembleEngineResult), then the
  // default-vendor selection entries, as before. Selector results stay on the plan with SKU objects reduced to SKU
  // strings, so the result holds no catalog rows. The handler stamps generatedAt with finalizeEngineResult.
  const publicPlans = plans.map((plan) => {
    const next = { ...plan };
    if (plan.switchSelection !== undefined) next.switchSelection = toPublicSelection(plan.switchSelection);
    if (plan.enclosureSelection !== undefined) next.enclosureSelection = toPublicSelection(plan.enclosureSelection);
    return next;
  });

  const assembled = assembleEngineResult({
    requirements: reqs,
    sharedCtx: { ledger: sharedCtx.ledger, flags: sharedCtx.flags, unmet: [] },
    plans: publicPlans,
    defaultVendor,
    input,
    catalog,
  });

  return {
    ...assembled,
    ledger: appendUnique(assembled.ledger, selectionCtx.ledger),
    flags: appendUnique(assembled.flags, selectionCtx.flags),
    unmet: [...sharedCtx.unmet, ...plans.flatMap((plan) => plan.unmet || [])],
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