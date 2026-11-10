'use strict';
// BOM assembly, advisories, cost estimate, and installation-materials reference.
// Installation materials are advisory reference information, not BOM lines.

const installationMaterialsConfig = require('./installation-materials.json');

function buildInstallationMaterials(plan, requirements = {}) {
  if (!plan || typeof plan !== 'object') {
    throw new TypeError('plan must be an object');
  }

  const horizontalCablingOptions = requirements.horizontalCablingOptions;

  const configuredItems = installationMaterialsConfig.items.filter((item) => {
    if (item.item !== 'cat6_cabling' || horizontalCablingOptions === undefined) {
      return true;
    }

    return horizontalCablingOptions.includes('Cat6');
  });

  const items = configuredItems.map((item) => ({
    ...item,
    priceDisplay: item.representativeUnitPrice === null
      ? 'price on request'
      : `${installationMaterialsConfig.currency} ${item.representativeUnitPrice.toFixed(2)} per ${item.unit}`,
  }));

  if (plan.optics !== undefined && plan.optics !== null) {
    const { links, modules, formFactor } = plan.optics;
    items.push({
      item: 'sfp_modules',
      description: `SFP modules; estimate based on ${links} fiber uplink${links === 1 ? '' : 's'}.`,
      unit: 'module',
      links,
      modules,
      formFactor: formFactor === null ? 'form factor not determined' : formFactor,
    });
  }

  return {
    currency: installationMaterialsConfig.currency,
    asOfDate: installationMaterialsConfig.asOfDate,
    pricingBasis: 'Representative unit prices',
    items,
    note: 'Actual material quantities must be determined through a physical site survey and detailed deployment planning.',
  };
}

// NWP-ENGINE-017 implementation is tracked separately.
function assembleBom({ selections, requirements, ctx }) {
  throw new Error('NWP-ENGINE-017 not implemented');
}

module.exports = { assembleBom, buildInstallationMaterials };
