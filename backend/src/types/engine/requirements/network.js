
'use strict';

// Deployment & Vendor Constraint Processing (part 1)
// Track B · Algorithm Step 2.1-2.2
// Consumes: NormalizedInput
// Produces: Requirements: g, securityTier, vlans, qos
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

const params = require('../params.js');
const { addLedger } = require('../ctx.js');
const { validateRequirements } = require('../contracts.js');

function deriveNetworkRequirements(input, ctx) {
  const growth = input.growth || {};
  let g = 0;

  if (growth.expected) {
    const band = growth.band;
    const mappedGrowth = params.G_BY_BAND[band];

    if (Number.isFinite(mappedGrowth)) {
      g = mappedGrowth;
    } else {
      addLedger(
        ctx,
        'growth.band',
        0,
        'Growth was expected, but its band was unavailable; using 0 as a fallback.'
      );
    }
  }

  const vlans = ['Corporate'];

  if (input.guestWifi) vlans.push('Guest');
  if (input.sensitiveData) vlans.push('Restricted');
  if (input.voipPhones > 0) vlans.push('Voice');
  if (input.cameras > 0) vlans.push('Cameras_IoT');

  const requirements = {
    g,
    securityTier: input.sensitiveData ? 'advanced' : 'standard',
    vlans,
    qos: input.voipPhones > 0,
  };

  validateRequirements(requirements);

  return requirements;
}

module.exports = { deriveNetworkRequirements };
