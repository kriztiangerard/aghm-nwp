
'use strict';

// Deployment & Vendor Constraint Processing (part 2)
// Algorithm Step 2.3-2.5
// Consumes: NormalizedInput + securityTier
// Produces: Requirements: redundancy, backupAdvice, vpnTunnelsNeeded,
//           requiredMbps, throughputMetric
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.
// Security tier must be known before the throughput metric.

const { addLedger, addFlag } = require('../ctx.js');
const { validateRequirements } = require('../contracts.js');

function deriveConnectivityRequirements(input, networkRequirements, ctx) {
  let redundancy = 'none';

  if (input.downtime === 'everyMinute') {
    redundancy = 'required';
  } else if (input.downtime === 'sameDay') {
    redundancy = 'backupWan';
  }

  let backupAdvice = 'No backup connection advice specified.';

  if (input.connection === 'dslCellular') {
    backupAdvice =
      'Recommend a second ISP using a different connection medium.';
  } else if (input.connection === 'fiber') {
    backupAdvice = 'Consider a second ISP or cellular backup.';
  } else if (input.connection === 'notChecked') {
    backupAdvice =
      'Check the primary connection type; backup-medium advice is provisional.';
    addFlag(
      ctx,
      'CONNECTION_TYPE_NOT_CHECKED',
      'Primary connection type has not been checked; backup advice is provisional.'
    );
  }

  const vpnTunnelsNeeded = { CE: 0, HP: 0 };
  const locations = input.locations;
  const newSites = input.growth?.newSites ?? 0;

  if (locations === 'twoOrMore') {
    vpnTunnelsNeeded.CE = 1;
    vpnTunnelsNeeded.HP = newSites >= 1 ? 2 : 1;

    addLedger(
      ctx,
      'otherLocations',
      1,
      'number of other locations assumed to be 1'
    );

    addFlag(
      ctx,
      'OTHER_LOCATION_COUNT_ASSUMED',
      'The number of other existing locations was assumed to be 1.'
    );
  } else if (locations === 'one' && newSites >= 2) {
    vpnTunnelsNeeded.HP = 2;

    addFlag(
      ctx,
      'FUTURE_SITE_VPN_ADVISORY',
      'High-Performance plan allows for VPN tunnels for 2 or more new sites; the CE plan has no VPN tunnel requirement.'
    );
  } else if (locations === 'one' && newSites === 1) {
    vpnTunnelsNeeded.HP = 2;
  }

  let requiredMbps;
  let throughputMetric;

  if (Number.isFinite(input.internetMbps) && input.internetMbps >= 0) {
    requiredMbps = input.internetMbps;
  }

  if (networkRequirements.securityTier === 'advanced') {
    throughputMetric = 'idps_throughput';
  } else {
    throughputMetric = 'routing_throughput';
  }

  const requirements = {
    redundancy,
    backupAdvice,
    vpnTunnelsNeeded,
    throughputMetric,
  };

  if (requiredMbps !== undefined) {
    requirements.requiredMbps = requiredMbps;
  }

  validateRequirements(requirements);

  return requirements;
}

module.exports = { deriveConnectivityRequirements };
