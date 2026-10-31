'use strict';
// Gateway selection
// Algorithm Step 3.2
// Consumes: Requirements + select()
// Produces: SelectionResult (gateway)
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

const { selectSku } = require('../select.js');
const { addFlag, addLedger } = require('../ctx.js');

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

  const selectionArgs = {
    predicate,
    plan,
    category: 'gateway',
    vendor,
    ctx,
    cePick
  };

  const selectForTier = (tierPool) => {
    if (requirements.redundancy !== 'required') {
      return selectSku({ ...selectionArgs, pool: tierPool, qty: 1 });
    }

    const haPool = tierPool.filter((sku) => sku.ha_capability === true);

    const hasQualifyingHaGateway = haPool.some(
      (sku) =>
        ['ACTIVE', 'SUNSETTING'].includes(sku.status) &&
        predicate(sku) &&
        typeof sku.price === 'number' &&
        Number.isFinite(sku.price)
    );

    if (hasQualifyingHaGateway) {
      return selectSku({ ...selectionArgs, pool: haPool, qty: 2 });
    }

    const result = selectSku({ ...selectionArgs, pool: tierPool, qty: 1 });

    if (!result.ok) {
      return result;
    }

    const code = 'GATEWAY_HA_UNSUPPORTED';
    const message = `HA gateway pairing not supported by ${vendor} at this tier`;

    addFlag(ctx, code, message);

    return {
      ...result,
      flags: [...result.flags, { code, message }]
    };
  };

  if (requirements.securityTier !== 'advanced') {
    return selectForTier(pool);
  }

  const advancedPool = pool.filter(
    (sku) =>
      typeof sku.idps_throughput_mbps === 'number' &&
      Number.isFinite(sku.idps_throughput_mbps) &&
      sku.idps_throughput_mbps > 0
  );

  const hasQualifyingAdvancedGateway = advancedPool.some(
    (sku) =>
      ['ACTIVE', 'SUNSETTING'].includes(sku.status) &&
      predicate(sku) &&
      typeof sku.price === 'number' &&
      Number.isFinite(sku.price)
  );

  if (hasQualifyingAdvancedGateway) {
    return selectForTier(advancedPool);
  }

  addFlag(
    ctx,
    'GATEWAY_SECURITY_TIER_FALLBACK',
    `No qualifying advanced-security ${vendor} gateway is available; selection fell back to the base security tier`
  );
  addLedger(
    ctx,
    'securityTier',
    'base',
    'No purchasable gateway with positive IDPS throughput met the other requirements; base security tier was used.'
  );

  return selectForTier(pool);
}

module.exports = { selectGateway };
