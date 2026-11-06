'use strict';

const params = require('./params.js');
const { addLedger, addFlag } = require('./ctx.js');

const PLAN_TYPES = ['CE', 'HP'];

function getPlanTotal(plan) {
  const total = plan?.bom?.total;

  return typeof total === 'number' && Number.isFinite(total)
    ? total
    : null;
}

function compareCandidates(a, b, vendorOrder) {
  const aTotal = getPlanTotal(a.plan);
  const bTotal = getPlanTotal(b.plan);

  // A null total is always ranked last.
  if (aTotal === null && bTotal !== null) return 1;
  if (aTotal !== null && bTotal === null) return -1;

  // For non-null totals, non-partial plans rank ahead of partial plans.
  const aIsPartial = a.plan.bom.totalIsPartial === true;
  const bIsPartial = b.plan.bom.totalIsPartial === true;

  if (aIsPartial !== bIsPartial) {
    return aIsPartial ? 1 : -1;
  }

  // Within the same completeness group, the lower total wins.
  if (aTotal !== bTotal) {
    return aTotal - bTotal;
  }

  // Equal totals: earlier vendor in the supplied list wins.
  const aVendorOrder = vendorOrder.has(a.plan.vendor)
    ? vendorOrder.get(a.plan.vendor)
    : Infinity;
  const bVendorOrder = vendorOrder.has(b.plan.vendor)
    ? vendorOrder.get(b.plan.vendor)
    : Infinity;

  if (aVendorOrder !== bVendorOrder) {
    return aVendorOrder - bVendorOrder;
  }

  // Preserve original plan order if all ranking criteria are equal.
  return a.index - b.index;
}

function selectDefaultVendors(plans, input, vendors, ctx) {
  const defaultVendor = { CE: null, HP: null };

  const vendorOrder = new Map(
    vendors.map((vendor, index) => [vendor.name, index])
  );

  addLedger(
    ctx,
    'defaultVendor.selectionRule',
    'Complete plans; non-partial totals first; lowest total within each group; vendor order breaks ties',
    'CE and HP defaults are selected independently using plan data.'
  );

  addLedger(
    ctx,
    'defaultVendor.managementPreference',
    input.management,
    input.management === 'notSure'
      ? 'No management-mode filter is applied.'
      : 'Only vendors supporting the selected management mode are preferred.'
  );

  addLedger(
    ctx,
    'defaultVendor.budgetFilter',
    params.BUDGET_BAND_PLAN_CAP_PHP,
    params.BUDGET_BAND_PLAN_CAP_PHP === null
      ? `No plan-total cap is defined for monthly budget band ${input.monthlyBudgetBand}; no budget filtering is applied.`
      : 'A budget cap is configured, but its per-band structure has not yet been defined.'
  );

  addLedger(
    ctx,
    'defaultVendor.excludedInputs',
    {
      itSupport: input.itSupport,
      downtime: input.downtime,
    },
    'IT support model and downtime are recorded but are not separate inputs to this selection rule.'
  );

  for (const planType of PLAN_TYPES) {
    const completeCandidates = plans
      .map((plan, index) => ({ plan, index }))
      .filter(
        ({ plan }) =>
          plan.planType === planType && plan.complete === true
      );

    if (completeCandidates.length === 0) {
      addFlag(
        ctx,
        `DEFAULT_VENDOR_NO_COMPLETE_${planType}_PLAN`,
        `No complete ${planType} plan is available; the default vendor is null.`
      );

      addLedger(
        ctx,
        `defaultVendor.${planType}`,
        null,
        `No complete ${planType} plan was available.`
      );

      continue;
    }

    let candidates = completeCandidates;

    if (input.management === 'dashboard' || input.management === 'cli') {
      const managementCandidates = candidates.filter(({ plan }) => {
        const descriptor = vendors.find(
          (vendor) => vendor.name === plan.vendor
        );

        return descriptor?.managementModes?.includes(input.management);
      });

      if (managementCandidates.length === 0) {
        addLedger(
          ctx,
          `defaultVendor.${planType}.managementFilter`,
          input.management,
          `The management filter was ignored because it left no ${planType} candidates.`
        );
      } else {
        candidates = managementCandidates;

        addLedger(
          ctx,
          `defaultVendor.${planType}.managementFilter`,
          input.management,
          `Only ${planType} candidates supporting ${input.management} were retained.`
        );
      }
    } else {
      addLedger(
        ctx,
        `defaultVendor.${planType}.managementFilter`,
        'notSure',
        'The management filter was not applied.'
      );
    }

    // The budget cap parameter is currently null, so no budget filter applies.
    // Do not invent a cap or per-band configuration before the team defines it.
    candidates.sort((a, b) => compareCandidates(a, b, vendorOrder));

    const winner = candidates[0].plan;
    defaultVendor[planType] = winner.vendor;

    addLedger(
      ctx,
      `defaultVendor.${planType}`,
      winner.vendor,
      `Selected from ${candidates.length} eligible ${planType} candidate(s).`
    );
  }

  return defaultVendor;
}

module.exports = { selectDefaultVendors };
