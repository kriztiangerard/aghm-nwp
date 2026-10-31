'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { selectGateway } = require('../../src/types/engine/devices/gateway.js');
const { createCtx } = require('../../src/types/engine/ctx.js');

function makeGateway(overrides = {}) {
  return {
    sku: 'GW-1',
    vendor: 'TestVendor',
    category: 'gateway',
    line: 'Test',
    line_rank: 1,
    status: 'ACTIVE',
    price: 100,
    currency: 'PHP',
    site_to_site_vpn: true,
    max_vpn_tunnels: 2,
    dual_wan: true,
    ...overrides,
  };
}

test('HP requires site-to-site VPN and enough tunnels', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({ sku: 'GW-NO-VPN', site_to_site_vpn: false }),
    makeGateway({ sku: 'GW-ONE-TUNNEL', max_vpn_tunnels: 1 }),
    makeGateway({ sku: 'GW-TWO-TUNNELS', max_vpn_tunnels: 2 }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: { vpnTunnelsNeeded: { CE: 0, HP: 2 } },
    plan: 'high_performance',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-TWO-TUNNELS');
});

test('CE does not apply a VPN constraint when its tunnel requirement is zero', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-NO-VPN',
      site_to_site_vpn: false,
      max_vpn_tunnels: null,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: { vpnTunnelsNeeded: { CE: 0, HP: 2 } },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-NO-VPN');
  assert.equal(ctx.flags.length, 0);
});

test('unknown tunnel capacity is flagged and does not qualify for HP VPN requirements', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({ sku: 'GW-UNKNOWN', max_vpn_tunnels: null }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: { vpnTunnelsNeeded: { CE: 0, HP: 2 } },
    plan: 'high_performance',
    ctx,
  });

  assert.equal(result.ok, false);
  assert.ok(ctx.flags.some((flag) => flag.code === 'GATEWAY_VPN_CAPACITY_UNKNOWN'));
});

test('known sufficient gateway does not get an unknown-capacity flag from an unrelated gateway', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-UNKNOWN',
      max_vpn_tunnels: null,
      price: 50,
    }),
    makeGateway({
      sku: 'GW-SUFFICIENT',
      max_vpn_tunnels: 2,
      price: 100,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: { vpnTunnelsNeeded: { CE: 0, HP: 2 } },
    plan: 'high_performance',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-SUFFICIENT');
  assert.equal(
    ctx.flags.some((flag) => flag.code === 'GATEWAY_VPN_CAPACITY_UNKNOWN'),
    false
  );
});

test('required redundancy selects two gateway units', () => {
  const ctx = createCtx();
  const catalog = [makeGateway({ ha_capability: true })];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'required',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.qty, 2);
});

test('HP selection steps up from the supplied CE pick with different VPN requirements', () => {
  const ctx = createCtx();
  const cePick = makeGateway({
    sku: 'GW-CE',
    line_rank: 1,
    max_vpn_tunnels: 1,
  });

  const catalog = [
    cePick,
    makeGateway({
      sku: 'GW-HP-NEXT',
      line_rank: 2,
      max_vpn_tunnels: 2,
      price: 200,
    }),
    makeGateway({
      sku: 'GW-HP-HIGHER',
      line_rank: 3,
      max_vpn_tunnels: 2,
      price: 150,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: { vpnTunnelsNeeded: { CE: 1, HP: 2 } },
    plan: 'high_performance',
    cePick,
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-HP-NEXT');
});

test('gateway selection keeps Vendor A and Vendor B results separate', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'A-GW-01',
      vendor: 'Vendor A',
      max_vpn_tunnels: 2,
    }),
  ];

  const vendorAResult = selectGateway({
    catalog,
    vendor: 'Vendor A',
    requirements: { vpnTunnelsNeeded: { CE: 0, HP: 0 } },
    plan: 'cost_efficient',
    ctx,
  });

  const vendorBResult = selectGateway({
    catalog,
    vendor: 'Vendor B',
    requirements: { vpnTunnelsNeeded: { CE: 0, HP: 0 } },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(vendorAResult.ok, true);
  assert.equal(vendorAResult.sku.sku, 'A-GW-01');

  assert.equal(vendorBResult.ok, false);
  assert.deepEqual(vendorBResult.unmet, {
    category: 'gateway',
    vendor: 'Vendor B',
    reason: 'No purchasable (ACTIVE or SUNSETTING) SKUs available',
  });

  assert.deepEqual(ctx.unmet, [
    {
      category: 'gateway',
      vendor: 'Vendor B',
      reason: 'No purchasable (ACTIVE or SUNSETTING) SKUs available',
    },
  ]);
});

for (const vendor of ['Vendor A', 'Vendor B']) {
  test(`VPN acceptance criteria work for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-NO-VPN`,
        vendor,
        site_to_site_vpn: false,
        max_vpn_tunnels: 4,
      }),
      makeGateway({
        sku: `${vendor}-LOW-CAPACITY`,
        vendor,
        max_vpn_tunnels: 1,
      }),
      makeGateway({
        sku: `${vendor}-SUFFICIENT`,
        vendor,
        max_vpn_tunnels: 2,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: { vpnTunnelsNeeded: { CE: 0, HP: 2 } },
      plan: 'high_performance',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-SUFFICIENT`);
  });
}

for (const vendor of ['Vendor A', 'Vendor B']) {
test(`unknown VPN capacity is flagged for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-UNKNOWN`,
        vendor,
        max_vpn_tunnels: null,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: { vpnTunnelsNeeded: { CE: 0, HP: 2 } },
      plan: 'high_performance',
      ctx,
    });

    assert.equal(result.ok, false);
    assert.ok(
      ctx.flags.some(
        (flag) => flag.code === 'GATEWAY_VPN_CAPACITY_UNKNOWN'
      )
    );
  });
}

for (const vendor of ['Vendor A', 'Vendor B']) {
test(`required redundancy selects two gateway units for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-REDUNDANT-GW`,
        vendor,
        ha_capability: true,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        redundancy: 'required',
        vpnTunnelsNeeded: { CE: 0, HP: 0 },
      },
      plan: 'cost_efficient',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.qty, 2);
    assert.equal(result.sku.sku, `${vendor}-REDUNDANT-GW`);
  });
}

for (const vendor of ['Vendor A', 'Vendor B']) {
  test(`High-Performance steps up from the Cost-Efficient pick for ${vendor}`, () => {
    const ctx = createCtx();
    const cePick = makeGateway({
      sku: `${vendor}-CE`,
      vendor,
      line_rank: 1,
      max_vpn_tunnels: 1,
    });

    const catalog = [
      cePick,
      makeGateway({
        sku: `${vendor}-HP-NEXT`,
        vendor,
        line_rank: 2,
        max_vpn_tunnels: 2,
        price: 200,
      }),
      makeGateway({
        sku: `${vendor}-HP-HIGHER`,
        vendor,
        line_rank: 3,
        max_vpn_tunnels: 2,
        price: 150,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: { vpnTunnelsNeeded: { CE: 1, HP: 2 } },
      plan: 'high_performance',
      cePick,
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-HP-NEXT`);
  });
}

for (const vendor of ['Vendor A', 'Vendor B']) {
  test(`advanced security selects an IDPS-capable gateway for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-BASE`,
        vendor,
        idps_throughput_mbps: 0,
        price: 50,
      }),
      makeGateway({
        sku: `${vendor}-ADVANCED`,
        vendor,
        idps_throughput_mbps: 100,
        price: 150,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        securityTier: 'advanced',
        vpnTunnelsNeeded: { CE: 0, HP: 0 },
      },
      plan: 'cost_efficient',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-ADVANCED`);
    assert.equal(ctx.flags.some((flag) => flag.code === 'GATEWAY_SECURITY_TIER_FALLBACK'), false);
    assert.equal(ctx.ledger.some((entry) => entry.field === 'securityTier'), false);
  });

test(`advanced security falls back to base tier when no IDPS gateway exists for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-BASE`,
        vendor,
        idps_throughput_mbps: 0,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        securityTier: 'advanced',
        vpnTunnelsNeeded: { CE: 0, HP: 0 },
      },
      plan: 'cost_efficient',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-BASE`);
    assert.ok(ctx.flags.some((flag) => flag.code === 'GATEWAY_SECURITY_TIER_FALLBACK'));
    assert.ok(ctx.ledger.some(
      (entry) => entry.field === 'securityTier' && entry.valueUsed === 'base'
    ));
  });

  test(`advanced security falls back when IDPS gateway fails VPN requirements for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-ADVANCED-LOW-VPN`,
        vendor,
        idps_throughput_mbps: 100,
        max_vpn_tunnels: 1,
      }),
      makeGateway({
        sku: `${vendor}-BASE-SUFFICIENT-VPN`,
        vendor,
        idps_throughput_mbps: 0,
        max_vpn_tunnels: 2,
        price: 200,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        securityTier: 'advanced',
        vpnTunnelsNeeded: { CE: 0, HP: 2 },
      },
      plan: 'high_performance',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-BASE-SUFFICIENT-VPN`);
    assert.ok(ctx.flags.some((flag) => flag.code === 'GATEWAY_SECURITY_TIER_FALLBACK'));
    assert.ok(ctx.ledger.some(
      (entry) => entry.field === 'securityTier' && entry.valueUsed === 'base'
    ));
  });

  test(`advanced security falls back when no advanced gateway supports HA for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-ADVANCED-NO-HA`,
        vendor,
        idps_throughput_mbps: 100,
        dual_wan: true,
        ha_capability: false,
        price: 100,
      }),
      makeGateway({
        sku: `${vendor}-BASE-HA`,
        vendor,
        idps_throughput_mbps: 0,
        dual_wan: true,
        ha_capability: true,
        price: 200,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        securityTier: 'advanced',
        redundancy: 'required',
        vpnTunnelsNeeded: { CE: 0, HP: 0 },
      },
      plan: 'high_performance',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-BASE-HA`);
    assert.equal(result.qty, 2);
    assert.ok(ctx.flags.some(
      (flag) => flag.code === 'GATEWAY_SECURITY_TIER_FALLBACK'
    ));
    assert.ok(ctx.ledger.some(
      (entry) => entry.field === 'securityTier' && entry.valueUsed === 'base'
    ));
  });

  test(`base security tier does not trigger fallback for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-BASE`,
        vendor,
        idps_throughput_mbps: 0,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        securityTier: 'base',
        vpnTunnelsNeeded: { CE: 0, HP: 0 },
      },
      plan: 'cost_efficient',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-BASE`);
    assert.equal(ctx.flags.some((flag) => flag.code === 'GATEWAY_SECURITY_TIER_FALLBACK'), false);
    assert.equal(ctx.ledger.some((entry) => entry.field === 'securityTier'), false);
  });
}

test('required HA falls back to one non-HA gateway with an unmet flag', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-NON-HA',
      price: 100,
      ha_capability: false,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'required',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-NON-HA');
  assert.equal(result.qty, 1);

  assert.ok(
    result.flags.some(
      (flag) => flag.code === 'GATEWAY_HA_UNSUPPORTED'
    )
  );

  assert.ok(
    ctx.flags.some(
      (flag) =>
        flag.code === 'GATEWAY_HA_UNSUPPORTED' &&
        flag.message ===
          'HA gateway pairing not supported by TestVendor at this tier'
    )
  );
});

for (const vendor of ['Vendor A', 'Vendor B']) {
  test(`required HA fallback works for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-NON-HA`,
        vendor,
        price: 100,
        ha_capability: false,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        redundancy: 'required',
        vpnTunnelsNeeded: { CE: 0, HP: 0 },
      },
      plan: 'cost_efficient',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-NON-HA`);
    assert.equal(result.qty, 1);

    assert.ok(
      result.flags.some(
        (flag) => flag.code === 'GATEWAY_HA_UNSUPPORTED'
      )
    );

    assert.ok(
      ctx.flags.some(
        (flag) =>
          flag.code === 'GATEWAY_HA_UNSUPPORTED' &&
          flag.message ===
            `HA gateway pairing not supported by ${vendor} at this tier`
      )
    );
  });
}

test('required HA falls back when HA gateway fails VPN requirements', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-HA-INSUFFICIENT-VPN',
      ha_capability: true,
      max_vpn_tunnels: 1,
    }),
    makeGateway({
      sku: 'GW-NON-HA-SUFFICIENT-VPN',
      ha_capability: false,
      max_vpn_tunnels: 2,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'required',
      vpnTunnelsNeeded: { CE: 0, HP: 2 },
    },
    plan: 'high_performance',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-NON-HA-SUFFICIENT-VPN');
  assert.equal(result.qty, 1);
  assert.ok(
    result.flags.some(
      (flag) => flag.code === 'GATEWAY_HA_UNSUPPORTED'
    )
  );
});

test('required HA selects an HA-capable gateway at quantity two', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-NON-HA',
      price: 50,
      ha_capability: false,
    }),
    makeGateway({
      sku: 'GW-HA',
      price: 100,
      ha_capability: true,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'required',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-HA');
  assert.equal(result.qty, 2);
  assert.equal(
    result.flags.some(
      (flag) => flag.code === 'GATEWAY_HA_UNSUPPORTED'
    ),
    false
  );
});

test('optional redundancy does not add an HA unsupported flag', () => {
  const ctx = createCtx();

  const result = selectGateway({
    catalog: [makeGateway({ ha_capability: false })],
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'recommended',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.qty, 1);
  assert.equal(
    ctx.flags.some(
      (flag) => flag.code === 'GATEWAY_HA_UNSUPPORTED'
    ),
    false
  );
});

test('routing throughput selects a gateway that meets required Mbps', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-LOW-ROUTING',
      routing_throughput_mbps: 400,
    }),
    makeGateway({
      sku: 'GW-SUFFICIENT-ROUTING',
      routing_throughput_mbps: 1000,
      price: 200,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      throughputMetric: 'routing_throughput',
      requiredMbps: 500,
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-SUFFICIENT-ROUTING');
});

test('routing throughput rejects gateways below required Mbps', () => {
  const ctx = createCtx();

  const result = selectGateway({
    catalog: [
      makeGateway({ routing_throughput_mbps: 400 }),
    ],
    vendor: 'TestVendor',
    requirements: {
      throughputMetric: 'routing_throughput',
      requiredMbps: 500,
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, false);
});

test('IDPS throughput selects a gateway that meets required Mbps', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-LOW-IDPS',
      idps_throughput_mbps: 400,
    }),
    makeGateway({
      sku: 'GW-SUFFICIENT-IDPS',
      idps_throughput_mbps: 1000,
      price: 200,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      throughputMetric: 'idps_throughput',
      requiredMbps: 500,
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-SUFFICIENT-IDPS');
});

test('IDPS throughput rejects gateways below required Mbps', () => {
  const ctx = createCtx();

  const result = selectGateway({
    catalog: [
      makeGateway({ idps_throughput_mbps: 400 }),
    ],
    vendor: 'TestVendor',
    requirements: {
      throughputMetric: 'idps_throughput',
      requiredMbps: 500,
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, false);
});

test('unknown required throughput is flagged and does not qualify', () => {
  const ctx = createCtx();

  const result = selectGateway({
    catalog: [
      makeGateway({ idps_throughput_mbps: null }),
    ],
    vendor: 'TestVendor',
    requirements: {
      throughputMetric: 'idps_throughput',
      requiredMbps: 500,
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, false);
  assert.ok(
    ctx.flags.some(
      (flag) => flag.code === 'GATEWAY_THROUGHPUT_UNKNOWN'
    )
  );
});

test('no required Mbps means no throughput constraint', () => {
  const ctx = createCtx();

  const result = selectGateway({
    catalog: [
      makeGateway({ routing_throughput_mbps: 100 }),
    ],
    vendor: 'TestVendor',
    requirements: {
      throughputMetric: 'routing_throughput',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-1');
});



test('backupWan redundancy selects a dual-WAN gateway', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-NO-DUAL-WAN',
      dual_wan: false,
    }),
    makeGateway({
      sku: 'GW-DUAL-WAN',
      dual_wan: true,
      price: 200,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'backupWan',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-DUAL-WAN');
});

test('required redundancy needs both dual-WAN and HA capability', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-HA-ONLY',
      dual_wan: false,
      ha_capability: true,
    }),
    makeGateway({
      sku: 'GW-DUAL-WAN-HA',
      dual_wan: true,
      ha_capability: true,
      price: 200,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'required',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sku.sku, 'GW-DUAL-WAN-HA');
  assert.equal(result.qty, 2);
});

test('required redundancy does not assume unknown dual-WAN capability', () => {
  const ctx = createCtx();
  const catalog = [
    makeGateway({
      sku: 'GW-UNKNOWN-DUAL-WAN',
      dual_wan: null,
      ha_capability: true,
    }),
  ];

  const result = selectGateway({
    catalog,
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'required',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, false);
  assert.ok(
    ctx.flags.some(
      (flag) => flag.code === 'GATEWAY_DUAL_WAN_UNKNOWN'
    )
  );
});

test('backupWan does not select a gateway without dual-WAN capability', () => {
  const ctx = createCtx();

  const result = selectGateway({
    catalog: [
      makeGateway({
        sku: 'GW-NO-DUAL-WAN',
        dual_wan: false,
      }),
    ],
    vendor: 'TestVendor',
    requirements: {
      redundancy: 'backupWan',
      vpnTunnelsNeeded: { CE: 0, HP: 0 },
    },
    plan: 'cost_efficient',
    ctx,
  });

  assert.equal(result.ok, false);
});

for (const vendor of ['Vendor A', 'Vendor B']) {
  test(`routing throughput constraint works for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-LOW-ROUTING`,
        vendor,
        routing_throughput_mbps: 400,
      }),
      makeGateway({
        sku: `${vendor}-SUFFICIENT-ROUTING`,
        vendor,
        routing_throughput_mbps: 1000,
        price: 200,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        throughputMetric: 'routing_throughput',
        requiredMbps: 500,
        vpnTunnelsNeeded: { CE: 0, HP: 0 },
      },
      plan: 'cost_efficient',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-SUFFICIENT-ROUTING`);
  });

  test(`IDPS throughput constraint works for ${vendor}`, () => {
    const ctx = createCtx();
    const catalog = [
      makeGateway({
        sku: `${vendor}-LOW-IDPS`,
        vendor,
        idps_throughput_mbps: 400,
      }),
      makeGateway({
        sku: `${vendor}-SUFFICIENT-IDPS`,
        vendor,
        idps_throughput_mbps: 1000,
        price: 200,
      }),
    ];

    const result = selectGateway({
      catalog,
      vendor,
      requirements: {
        throughputMetric: 'idps_throughput',
        requiredMbps: 500,
        vpnTunnelsNeeded: { CE: 0, HP: 0 },
      },
      plan: 'cost_efficient',
      ctx,
    });

    assert.equal(result.ok, true);
    assert.equal(result.sku.sku, `${vendor}-SUFFICIENT-IDPS`);
  });
}
