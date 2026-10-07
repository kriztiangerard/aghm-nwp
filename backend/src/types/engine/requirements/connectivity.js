'use strict';
// Deployment & Vendor Constraint Processing (part 2)
// Algorithm Step 2.3-2.5
// Consumes: NormalizedInput + securityTier
// Produces: Requirements: redundancy, backupAdvice, vpnTunnelsNeeded, requiredMbps, throughputMetric
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.
// Security tier must be known before the throughput metric (Step 2.2 before 2.5).

function deriveConnectivityRequirements(input, networkRequirements, ctx) {
  throw new Error('NWP-ENGINE-003 not implemented');
}

module.exports = { deriveConnectivityRequirements };
