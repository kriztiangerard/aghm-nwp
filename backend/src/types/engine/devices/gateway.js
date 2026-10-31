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

  const requiredMbps = requirements.requiredMbps;
  const throughputMetric = requirements.throughputMetric;

  const throughputField = {
    routing_throughput: 'routing_throughput_mbps',
    idps_throughput: 'idps_throughput_mbps',
  }[throughputMetric];

  if (requiredMbps !== undefined && !throughputField) {
    throw new Error(
      `selectGateway: unsupported throughput metric '${throughputMetric}'`
    );
  }

  const hasThroughputRequirement = Number.isFinite(requiredMbps);

  const hasKnownSufficientThroughput =
    !hasThroughputRequirement ||
    pool.some(
      (sku) =>
        ['ACTIVE', 'SUNSETTING'].includes(sku.status) &&
        typeof sku.price === 'number' &&
        Number.isFinite(sku.price) &&
        Number.isFinite(sku[throughputField]) &&
        sku[throughputField] >= requiredMbps
    );

  const hasUnknownThroughput =
    hasThroughputRequirement &&
    !hasKnownSufficientThroughput &&
    pool.some(
      (sku) =>
        ['ACTIVE', 'SUNSETTING'].includes(sku.status) &&
        typeof sku.price === 'number' &&
        Number.isFinite(sku.price) &&
        (sku[throughputField] === undefined ||
          sku[throughputField] === null)
    );

  if (hasUnknownThroughput) {
    addFlag(
      ctx,
      'GATEWAY_THROUGHPUT_UNKNOWN',
      `Some ${vendor} gateways have unknown ${throughputField}; unknown throughput is not assumed to satisfy the requirement`
    );
  }

  const predicate = (sku) => {
    if (
      vpnTunnelsNeeded > 0 &&
      !(
        sku.site_to_site_vpn === true &&
        Number.isFinite(sku.max_vpn_tunnels) &&
        sku.max_vpn_tunnels >= vpnTunnelsNeeded
      )
    ) {
      return false;
    }

    if (
      hasThroughputRequirement &&
      !(
        Number.isFinite(sku[throughputField]) &&
        sku[throughputField] >= requiredMbps
      )
    ) {
      return false;
    }

    return true;
  };

  const selectionArgs = {
    predicate,
    plan,
    category: 'gateway',
    vendor,
    ctx,
    cePick
  };

  const redundancy = requirements.redundancy;
  const needsDualWan = ['backupWan', 'required'].includes(redundancy);
  const needsHa = redundancy === 'required';

  const hasQualifyingDualWan = (tierPool) =>
    tierPool.some(
      (sku) =>
        ['ACTIVE', 'SUNSETTING'].includes(sku.status) &&
        sku.dual_wan === true &&
        (!needsHa || sku.ha_capability === true) &&
        predicate(sku) &&
        typeof sku.price === 'number' &&
        Number.isFinite(sku.price)
    );

  const hasUnknownDualWan =
    needsDualWan &&
    !hasQualifyingDualWan(pool) &&
    pool.some(
      (sku) =>
        ['ACTIVE', 'SUNSETTING'].includes(sku.status) &&
        (sku.dual_wan === undefined || sku.dual_wan === null) &&
        predicate(sku) &&
        typeof sku.price === 'number' &&
        Number.isFinite(sku.price)
    );

  if (hasUnknownDualWan) {
    addFlag(
      ctx,
      'GATEWAY_DUAL_WAN_UNKNOWN',
      `Some ${vendor} gateways have unknown dual_wan capability; unknown capability is not assumed to satisfy the redundancy requirement`
    );
  }

  const selectForTier = (tierPool) => {
    if (!needsDualWan) {
      return selectSku({ ...selectionArgs, pool: tierPool, qty: 1 });
    }

    const dualWanPool = tierPool.filter(
      (sku) => sku.dual_wan === true
    );

    if (!needsHa) {
      return selectSku({
        ...selectionArgs,
        pool: dualWanPool,
        qty: 1
      });
    }

    const haPool = dualWanPool.filter(
      (sku) => sku.ha_capability === true
    );

    if (hasQualifyingDualWan(tierPool)) {
      return selectSku({
        ...selectionArgs,
        pool: haPool,
        qty: 2
      });
    }

    const result = selectSku({
      ...selectionArgs,
      pool: dualWanPool,
      qty: 1
    });

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
      (!needsDualWan ||
        (sku.dual_wan === true &&
          (!needsHa || sku.ha_capability === true))) &&
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
