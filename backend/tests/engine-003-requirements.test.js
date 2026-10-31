
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createCtx } = require('../src/types/engine/ctx');
const { validateRequirements } = require('../src/types/engine/contracts');
const { deriveNetworkRequirements } = require('../src/types/engine/requirements/network');
const { deriveConnectivityRequirements } = require('../src/types/engine/requirements/connectivity');

function deriveBoth(input) {
  const ctx = createCtx();
  const network = deriveNetworkRequirements(input, ctx);
  const connectivity = deriveConnectivityRequirements(input, network, ctx);
  const requirements = { ...network, ...connectivity };

  assert.equal(validateRequirements(requirements), true);

  return { requirements, ctx };
}

function baseInput(overrides = {}) {
  return {
    locations: 'one',
    growth: { expected: false, band: null, newSites: 0 },
    guestWifi: false,
    sensitiveData: false,
    voipPhones: 0,
    cameras: 0,
    downtime: 'waitItOut',
    connection: 'fiber',
    internetMbps: 500,
    ...overrides,
  };
}

test('Q25a 11-30% derives growth g = 0.30', () => {
  const { requirements } = deriveBoth(baseInput({
    growth: { expected: true, band: '11-30', newSites: 0 },
  }));

  assert.equal(requirements.g, 0.30);
});

test('Guest, Restricted, and Voice VLANs derive advanced security and QoS', () => {
  const { requirements } = deriveBoth(baseInput({
    guestWifi: true,
    sensitiveData: true,
    voipPhones: 12,
  }));

  assert.deepEqual(requirements.vlans, [
    'Corporate', 'Guest', 'Restricted', 'Voice',
  ]);
  assert.equal(requirements.securityTier, 'advanced');
  assert.equal(requirements.qos, true);
});

test('Cameras add Cameras_IoT without adding Voice or enabling QoS', () => {
  const { requirements } = deriveBoth(baseInput({ cameras: 4 }));

  assert.deepEqual(requirements.vlans, ['Corporate', 'Cameras_IoT']);
  assert.equal(requirements.qos, false);
});

test('everyMinute requires redundancy', () => {
  const { requirements } = deriveBoth(baseInput({
    downtime: 'everyMinute',
  }));

  assert.equal(requirements.redundancy, 'required');
});

test('sameDay downtime recommends backup WAN', () => {
  const { requirements } = deriveBoth(baseInput({
    downtime: 'sameDay',
  }));

  assert.equal(requirements.redundancy, 'backupWan');
});

test('DSL/cellular connection recommends a second ISP on a different medium', () => {
  const { requirements } = deriveBoth(baseInput({
    connection: 'dslCellular',
  }));

  assert.equal(
    requirements.backupAdvice,
    'Recommend a second ISP using a different connection medium.'
  );
});

test('advanced security selects IDS/IPS throughput and preserves 500 Mbps', () => {
  const { requirements } = deriveBoth(baseInput({
    sensitiveData: true,
    internetMbps: 500,
  }));

  assert.equal(requirements.throughputMetric, 'idps_throughput');
  assert.equal(requirements.requiredMbps, 500);
});

test('two or more existing sites assumes one other location and requires a CE tunnel', () => {
  const { requirements, ctx } = deriveBoth(baseInput({
    locations: 'twoOrMore',
  }));

  assert.equal(requirements.vpnTunnelsNeeded.CE, 1);
  assert.equal(requirements.vpnTunnelsNeeded.HP, 1);
  assert.equal(
    ctx.ledger.some((entry) =>
      entry.reason === 'number of other locations assumed to be 1'
    ),
    true
  );
  assert.equal(
    ctx.flags.some((flag) => flag.code === 'OTHER_LOCATION_COUNT_ASSUMED'),
    true
  );
});

test('one site with no new sites has no VPN tunnel requirement', () => {
  const { requirements } = deriveBoth(baseInput());

  assert.deepEqual(requirements.vpnTunnelsNeeded, { CE: 0, HP: 0 });
});

test('one site with two or more new sites has an HP minimum of two tunnels', () => {
  const { requirements } = deriveBoth(baseInput({
    growth: { expected: true, band: '11-30', newSites: 2 },
  }));

  assert.equal(requirements.vpnTunnelsNeeded.CE, 0);
  assert.equal(requirements.vpnTunnelsNeeded.HP, 2);
});

test('two or more existing sites plus one new site requires CE 1 and HP 2', () => {
  const { requirements } = deriveBoth(baseInput({
    locations: 'twoOrMore',
    growth: { expected: true, band: '11-30', newSites: 1 },
  }));

  assert.equal(requirements.vpnTunnelsNeeded.CE, 1);
  assert.equal(requirements.vpnTunnelsNeeded.HP, 2);
});


test('notChecked preserves supplied throughput and adds only the connection advisory', () => {
  const { requirements, ctx } = deriveBoth(baseInput({
    connection: 'notChecked',
    internetMbps: 500,
  }));

  assert.equal(requirements.requiredMbps, 500);

  assert.equal(
    ctx.flags.some((flag) => flag.code === 'CONNECTION_TYPE_NOT_CHECKED'),
    true
  );

  assert.equal(
    ctx.flags.some((flag) => flag.code === 'THROUGHPUT_UNCHANGED'),
    false
  );
});
