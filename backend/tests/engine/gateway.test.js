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
  const catalog = [makeGateway()];

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
