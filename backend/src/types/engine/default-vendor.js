
'use strict';

const { addLedger, addFlag } = require('./ctx.js');
const params = require('./params.js');

const PLAN_TYPES = Object.freeze({
  CE: 'CE',
  HP: 'HP',
});

const NO_COMPLETE_PLAN_FLAG = 'DEFAULT_VENDOR_NO_COMPLETE_PLAN';

function getPlanType(planType) {
  if (planType === 'CE' || planType === 'HP') {
    return planType;
  }

  return null;
}

function getVendorName(plan) {
  if (typeof plan.vendor === 'string') {
    return plan.vendor;
  }

  if (plan.vendor && typeof plan.vendor.name === 'string') {
    return plan.vendor.name;
  }

  return null;
}

function getVendorDescriptor(vendorName, vendors) {
  return vendors.find((vendor) => vendor.name === vendorName) || null;
}

function getBudgetCap(input) {
  const caps = params.BUDGET_BAND_PLAN_CAP_PHP;

  if (!caps || input.monthlyBudgetBand == null) {
    return null;
  }

  if (typeof caps === 'number') {
    return caps;
  }

  return Object.prototype.hasOwnProperty.call(caps, input.monthlyBudgetBand)
    ? caps[input.monthlyBudgetBand]
    : null;
}

function getTotal(plan) {
  if (!plan.bom || plan.bom.total == null) {
    return null;
  }

  return Number.isFinite(plan.bom.total) && plan.bom.total >= 0
    ? plan.bom.total
    : null;
}

function comparePlans(a, b, vendorOrder) {
  const aPartial = a.bom.totalIsPartial === true;
  const bPartial = b.bom.totalIsPartial === true;

  if (aPartial !== bPartial) {
    return aPartial ? 1 : -1;
  }

  const aTotal = getTotal(a);
  const bTotal = getTotal(b);

  if (aTotal === null && bTotal !== null) {
    return 1;
  }

  if (aTotal !== null && bTotal === null) {
    return -1;
  }

  if (aTotal !== null && bTotal !== null && aTotal !== bTotal) {
    return aTotal - bTotal;
  }

  return vendorOrder.get(getVendorName(a)) - vendorOrder.get(getVendorName(b));
}

function selectForPlanType(planType, plans, input, vendors, ctx) {
  const completePlans = plans.filter(
    (plan) => getPlanType(plan.planType) === planType && plan.complete === true,
  );

  if (completePlans.length === 0) {
    addFlag(
      ctx,
      NO_COMPLETE_PLAN_FLAG,
      `No complete ${planType} plan is available for default vendor selection.`,
    );

    return null;
  }

  const management = input.management;
  const vendorOrder = new Map(vendors.map((vendor, index) => [vendor.name, index]));

  let candidates = completePlans;

  if (management === 'dashboard' || management === 'cli') {
    const managementCandidates = candidates.filter((plan) => {
      const vendor = getVendorDescriptor(getVendorName(plan), vendors);

      return vendor && vendor.managementModes.includes(management);
    });

    if (managementCandidates.length > 0) {
      candidates = managementCandidates;
    } else {
      addLedger(
        ctx,
        `defaultVendor.${planType}.managementFilter`,
        'ignored',
        `No complete ${planType} plans matched management preference "${management}"; management filter was dropped.`,
      );
    }
  }

  const budgetCap = getBudgetCap(input);

  if (budgetCap == null) {
    addLedger(
      ctx,
      `defaultVendor.${planType}.budgetFilter`,
      'not applied',
      'BUDGET_BAND_PLAN_CAP_PHP is undefined or null; no budget filtering was applied.',
    );
  } else {
    const budgetCandidates = candidates.filter((plan) => {
      const total = getTotal(plan);

      return total !== null && total <= budgetCap;
    });

    if (budgetCandidates.length > 0) {
      candidates = budgetCandidates;
    } else {
      addLedger(
        ctx,
        `defaultVendor.${planType}.budgetFilter`,
        'ignored',
        `No complete ${planType} plans fit the budget cap of PHP ${budgetCap}; budget filter was dropped.`,
      );
    }
  }

  candidates.sort((a, b) => comparePlans(a, b, vendorOrder));

  const selected = candidates[0];
  const selectedVendor = getVendorName(selected);

  addLedger(
    ctx,
    `defaultVendor.${planType}`,
    selectedVendor,
    `Selected the lowest-total complete ${planType} plan after applicable management and budget filtering. Partial totals rank after complete totals; null totals rank last. IT support model and downtime are not separate inputs to this rule.`,
  );

  return selectedVendor;
}

function selectDefaultVendors(plans, input, vendors, ctx) {
  if (!Array.isArray(plans) || !Array.isArray(vendors)) {
    throw new TypeError('plans and vendors must be arrays.');
  }

  if (!input || !ctx || !Array.isArray(ctx.ledger) || !Array.isArray(ctx.flags)) {
    throw new TypeError('input and a valid ctx are required.');
  }

  return {
    CE: selectForPlanType(PLAN_TYPES.CE, plans, input, vendors, ctx),
    HP: selectForPlanType(PLAN_TYPES.HP, plans, input, vendors, ctx),
  };
}

// Compatibility wrapper for the original placeholder API.
function chooseDefaultVendor({ plans, input, vendors = [], ctx }) {
  return selectDefaultVendors(plans, input, vendors, ctx);
}

module.exports = {
  selectDefaultVendors,
  chooseDefaultVendor,
};
