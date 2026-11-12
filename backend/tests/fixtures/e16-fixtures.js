'use strict';
// Shared fixtures for the NWP-ENGINE-016 tests. Plain data only; nothing here touches a database.

const clone = (value) => JSON.parse(JSON.stringify(value));

const catalog = [
  { sku: 'GW1', vendor: 'V', name: 'Gateway One', category: 'gateway', dual_wan: true, status: 'ACTIVE' },
  { sku: 'GW-NODUAL', vendor: 'V', name: 'Gateway Single', category: 'gateway', dual_wan: false, status: 'ACTIVE' },
  { sku: 'GW-UNKNOWN', vendor: 'V', name: 'Gateway Unknown', category: 'gateway', status: 'ACTIVE' },
  { sku: 'CORE', vendor: 'V', name: 'Core Switch', category: 'switch', copper_ports: 8, sfp_ports: 4, poe_ports: 0, status: 'ACTIVE' },
  { sku: 'ACC', vendor: 'V', name: 'Access Switch', category: 'switch', copper_ports: 8, sfp_ports: 2, poe_ports: 4, status: 'ACTIVE' },
  { sku: 'AP1', vendor: 'V', name: 'AP One', category: 'access_point', status: 'ACTIVE' },
  { sku: 'CTL', vendor: 'V', name: 'Controller', category: 'controller', status: 'ACTIVE' },
];

const bomLine = (category, sku, name, qty, extra = {}) => ({
  category, sku, name, vendor: 'V', qty, unitPrice: 100, lineTotal: 100 * qty, status: 'ACTIVE', isGeneric: false, ...extra,
});

function makePlan(overrides = {}) {
  return {
    vendor: 'V',
    planType: 'CE',
    complete: true,
    items: [
      { category: 'gateway', sku: 'GW1', qty: 1 },
      { category: 'controller', sku: 'CTL', qty: 1 },
      { category: 'switch', sku: 'CORE', qty: 2 },
      { category: 'switch', sku: 'ACC', qty: 2 },
      { category: 'access_point', sku: 'AP1', qty: 6 },
    ],
    bom: {
      currency: 'PHP',
      lines: [
        bomLine('gateway', 'GW1', 'Gateway One', 1),
        bomLine('controller', 'CTL', 'Controller', 1),
        bomLine('switch', 'CORE', 'Core Switch', 2),
        bomLine('switch', 'ACC', 'Access Switch', 2, { status: 'SUNSETTING' }),
        bomLine('access_point', 'AP1', 'AP One', 6),
      ],
      total: 1000,
      totalIsPartial: false,
    },
    unmet: [],
    flags: [],
    ledger: [],
    ...overrides,
  };
}

const requirements = () => ({
  securityTier: 'advanced',
  vlans: ['Corporate', 'Guest', 'Voice', 'Cameras_IoT'],
  qos: true,
  redundancy: 'required',
  backupAdvice: 'Consider a second ISP or cellular backup.',
  vpnTunnelsNeeded: { CE: 1, HP: 2 },
  throughputMetric: 'idps_throughput',
  backbone: 'fiber',
});

const input = (overrides = {}) => ({
  floors: 2,
  wiredPcs: 5,
  wifiDevices: 40,
  voipPhones: 2,
  cameras: 2,
  otherDevices: { hasOtherDevices: true, description: 'printers' },
  existingEquipment: 'no',
  ...overrides,
});

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

module.exports = { catalog, makePlan, requirements, input, bomLine, clone, deepFreeze };