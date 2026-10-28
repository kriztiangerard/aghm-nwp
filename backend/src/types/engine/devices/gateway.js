'use strict';
// Gateway selection
// Algorithm Step 3.2
// Consumes: Requirements + select()
// Produces: SelectionResult (gateway)
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

const { selectSku } = require('../select.js');
const { addFlag } = require('../ctx.js');

function selectGateway({ catalog, vendor, requirements, plan, cePick, ctx }) {
  if (plan !== 'cost_efficient' && plan !== 'high_performance') {
    throw new Error(`selectGateway: unknown plan '${plan}'`);
  }

  const planKey = plan === 'cost_efficient' ? 'CE' : 'HP';
  const vpnTunnelsNeeded = requirements.vpnTunnelsNeeded?.[planKey] ?? 0;

  const pool = catalog.filter(
    (sku) => sku.vendor === vendor && sku.category === 'gateway'
  );

  const hasKnownSufficientTunnelCapacity = pool.some(
    (sku) =>
      ['ACTIVE', 'SUNSETTING'].includes(sku.status) &&
      sku.site_to_site_vpn === true &&
      typeof sku.price === 'number' &&
      Number.isFinite(sku.price) &&
      Number.isFinite(sku.max_vpn_tunnels) &&
      sku.max_vpn_tunnels >= vpnTunnelsNeeded
  );

  const missingTunnelCapacity =
    vpnTunnelsNeeded > 0 &&
    !hasKnownSufficientTunnelCapacity &&
    pool.some(
      (sku) =>
        ['ACTIVE', 'SUNSETTING'].includes(sku.status) &&
        sku.site_to_site_vpn === true &&
        typeof sku.price === 'number' &&
        Number.isFinite(sku.price) &&
        (sku.max_vpn_tunnels === undefined ||
          sku.max_vpn_tunnels === null)
    );

  if (missingTunnelCapacity) {
    addFlag(
      ctx,
      'GATEWAY_VPN_CAPACITY_UNKNOWN',
      `Some ${vendor} gateways have unknown max_vpn_tunnels; unknown capacity is not assumed to satisfy the requirement`
    );
  }

  const predicate = (sku) => {
    if (vpnTunnelsNeeded <= 0) return true;

    return (
      sku.site_to_site_vpn === true &&
      Number.isFinite(sku.max_vpn_tunnels) &&
      sku.max_vpn_tunnels >= vpnTunnelsNeeded
    );
  };

  return selectSku({
    pool,
    predicate,
    plan,
    category: 'gateway',
    vendor,
    ctx,
    qty: requirements.redundancy === 'required' ? 2 : 1,
    cePick
  });
}

module.exports = { selectGateway };
