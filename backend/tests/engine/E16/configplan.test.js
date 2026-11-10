'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildConfigurationPlan } = require('../../steps/configPlan.js');
const { makePlan, requirements, deepFreeze } = require('./fixtures.js');

const section = (result, id) => result.sections.find((item) => item.id === id);

test('AC5: every section lists {setting, value, source} rows', () => {
  const result = buildConfigurationPlan(makePlan(), requirements());
  assert.deepEqual(
    result.sections.map((item) => item.id),
    ['segmentation', 'qos', 'security', 'redundancy', 'vpn', 'backup']
  );
  result.sections.forEach((item) => {
    assert.ok(item.rows.length > 0);
    item.rows.forEach((entry) => {
      assert.deepEqual(Object.keys(entry).sort(), ['setting', 'source', 'value']);
      Object.values(entry).forEach((text) => assert.equal(typeof text, 'string'));
    });
  });
});

test('AC5: segmentation lists each requested segment', () => {
  const rows = section(buildConfigurationPlan(makePlan(), requirements()), 'segmentation').rows;
  assert.deepEqual(rows.map((entry) => entry.value), ['Corporate', 'Guest', 'Voice', 'Cameras / IoT']);
});

test('AC5: QoS and security reflect the requirements', () => {
  const on = buildConfigurationPlan(makePlan(), requirements());
  assert.equal(section(on, 'qos').rows[0].value, 'Enabled');
  assert.equal(section(on, 'security').rows[0].value, 'Advanced');
  assert.equal(section(on, 'security').rows[1].value, 'IDS/IPS throughput');

  const off = buildConfigurationPlan(makePlan(), { ...requirements(), qos: false, securityTier: 'standard', throughputMetric: 'routing_throughput' });
  assert.equal(section(off, 'qos').rows[0].value, 'Not required');
  assert.equal(section(off, 'security').rows[0].value, 'Standard');
  assert.equal(section(off, 'security').rows[1].value, 'Routing throughput');
});

test('AC5: VPN tunnels come from vpnTunnelsNeeded for the plan type', () => {
  assert.match(section(buildConfigurationPlan(makePlan({ planType: 'CE' }), requirements()), 'vpn').rows[0].value, /^1 site-to-site tunnel$/);
  assert.match(section(buildConfigurationPlan(makePlan({ planType: 'HP' }), requirements()), 'vpn').rows[0].value, /^2 site-to-site tunnels$/);
  const none = buildConfigurationPlan(makePlan(), { ...requirements(), vpnTunnelsNeeded: { CE: 0, HP: 0 } });
  assert.equal(section(none, 'vpn').rows[0].value, 'Not required');
});

test('AC5: redundancy follows the requirement and the WAN links actually drawn', () => {
  const required = section(buildConfigurationPlan(makePlan(), requirements()), 'redundancy').rows.map((entry) => entry.setting);
  assert.deepEqual(required, ['Internet link redundancy', 'Core switch redundancy']);

  const none = section(buildConfigurationPlan(makePlan(), { ...requirements(), redundancy: 'none' }), 'redundancy');
  assert.equal(none.rows[0].value, 'Single WAN link');

  const singleWan = makePlan({ topology: { nodes: [{ id: 'wan-0', role: 'wan' }], edges: [] } });
  const downgraded = section(buildConfigurationPlan(singleWan, requirements()), 'redundancy').rows[0].value;
  assert.match(downgraded, /single WAN is planned/);
});

test('AC5: backup advice is carried over', () => {
  assert.equal(
    section(buildConfigurationPlan(makePlan(), requirements()), 'backup').rows[0].value,
    'Consider a second ISP or cellular backup.'
  );
});

test('AC5: sections without source data are omitted', () => {
  const result = buildConfigurationPlan(makePlan(), { redundancy: 'none' });
  assert.deepEqual(result.sections.map((item) => item.id), ['redundancy']);
});

test('AC5: no IP ranges, CLI or vendor command syntax appear anywhere', () => {
  const text = JSON.stringify(buildConfigurationPlan(makePlan(), requirements()));
  assert.doesNotMatch(text, /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  assert.doesNotMatch(text, /\/\d{1,2}\b/);
  assert.doesNotMatch(text, /vlan \d+|interface |ip address|configure terminal|set |show /i);
});

test('deterministic, and the inputs are not mutated', () => {
  const plan = deepFreeze(makePlan());
  const reqs = deepFreeze(requirements());
  assert.deepEqual(buildConfigurationPlan(plan, reqs), buildConfigurationPlan(plan, reqs));
});

test('argument checks', () => {
  assert.throws(() => buildConfigurationPlan(null, requirements()), TypeError);
  assert.throws(() => buildConfigurationPlan(makePlan(), null), TypeError);
});