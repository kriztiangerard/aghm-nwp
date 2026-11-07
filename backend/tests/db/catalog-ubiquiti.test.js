'use strict';
// NWP-SETUP-006 — static validation of the Ubiquiti UniFi catalog JSON files.
// Covers the automatable cases 006-01 to 006-06, 006-08 to 006-14, 006-16 to 006-21 in NWP-SETUP-006-007-test-cases.md.
// 006-07 and the "which gateways should have firewall_specs" list in 006-15 are manual (compare against spec sheets).
//
// Run:  node --test tests/setup-006/
// Dev deps: npm i -D ajv ajv-formats
// Env overrides:
//   CATALOG_DIR        directory holding unifi-routers.json, unifi-switches.json, unifi-aps.json
//   SCHEMA_PATH        path to device-schemas.json
//   PRODUCT_LINES_PATH path to product_lines.json (006-11 is skipped if the file is absent)

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const CATALOG_DIR = process.env.CATALOG_DIR || path.resolve(__dirname, '../../db/catalog');
const SCHEMA_PATH = process.env.SCHEMA_PATH || path.resolve(__dirname, '../../db/catalog/schema/device-schemas.json');
const PRODUCT_LINES_PATH = process.env.PRODUCT_LINES_PATH || path.resolve(CATALOG_DIR, 'product_lines.json');

const FILES = [
  { file: 'unifi-routers.json', category: 'gateway_router', def: 'gatewayRouterDevice' },
  { file: 'unifi-switches.json', category: 'switch', def: 'switchDevice' },
  { file: 'unifi-aps.json', category: 'ap', def: 'apDevice' },
];

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const schema = readJson(SCHEMA_PATH);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema);
const validatorFor = (def) => ajv.getSchema(`${schema.$id}#/$defs/${def}`);

const CORE_KEYS = new Set(Object.keys(schema.$defs.coreDevice.properties).concat(['category']));
const SPEC_BLOCKS = {
  gateway_router: ['gateway_router_specs', 'firewall_specs', 'switch_specs', 'controller_specs'],
  switch: ['switch_specs'],
  ap: ['ap_specs'],
};
const REQUIRED_BLOCK = { gateway_router: 'gateway_router_specs', switch: 'switch_specs', ap: 'ap_specs' };
const CAPABILITY_VOCAB = new Set(schema.$defs.coreDevice.properties.capabilities.items.enum);
const SPEC_ATTRS = ['poe_ports', 'poe_budget_w', 'port_count', 'wifi_standard', 'wan_ports', 'lan_ports',
  'sfp_ports', 'max_concurrent_clients', 'switching_capacity_gbps'];

const fmtErrors = (errs) => (errs || []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
const label = (d, i) => `${d && d.sku ? d.sku : `entry[${i}]`}`;

const data = {};
before(() => {
  for (const f of FILES) {
    const p = path.join(CATALOG_DIR, f.file);
    data[f.file] = fs.existsSync(p) ? readJson(p) : undefined;
  }
});

function forEachEntry(fn) {
  for (const f of FILES) {
    (data[f.file] || []).forEach((d, i) => fn(d, i, f));
  }
}

// ---------- AC 2: files ----------
describe('AC2 separate files per category', () => {
  for (const f of FILES) {
    it(`006-08 ${f.file} exists, parses and is a non-empty array`, () => {
      assert.ok(fs.existsSync(path.join(CATALOG_DIR, f.file)), `${f.file} not found in ${CATALOG_DIR}`);
      assert.ok(Array.isArray(data[f.file]) && data[f.file].length > 0);
    });
    it(`006-09 ${f.file} contains only ${f.category}`, () => {
      const bad = (data[f.file] || []).filter((d) => d.category !== f.category).map(label);
      assert.deepEqual(bad, []);
    });
  }

  it('006-10 sku and name are unique across all files', () => {
    const skus = new Map();
    const names = new Map();
    const dup = [];
    forEachEntry((d) => {
      if (skus.has(d.sku)) dup.push(`sku ${d.sku}`);
      if (names.has(d.name)) dup.push(`name ${d.name}`);
      skus.set(d.sku, true);
      names.set(d.name, true);
    });
    assert.deepEqual(dup, []);
  });

  it('006-11 every product_line resolves in product_lines.json', (t) => {
    if (!fs.existsSync(PRODUCT_LINES_PATH)) return t.skip('product_lines.json not found');
    const lines = readJson(PRODUCT_LINES_PATH);
    const known = new Set(lines.map((l) => `${l.vendor_id}|${l.category}|${l.name}`));
    const bad = [];
    forEachEntry((d, i) => {
      if (!known.has(`${d.vendor_id}|${d.category}|${d.product_line}`)) bad.push(label(d, i));
    });
    assert.deepEqual(bad, []);
  });
});

// ---------- AC 1: core vs specs ----------
describe('AC1 core attributes separated from spec attributes', () => {
  for (const f of FILES) {
    it(`006-01 ${f.file}: every entry validates against ${f.def}`, () => {
      const validate = validatorFor(f.def);
      const failures = [];
      (data[f.file] || []).forEach((d, i) => {
        if (!validate(d)) failures.push(`${label(d, i)}: ${fmtErrors(validate.errors)}`);
      });
      assert.deepEqual(failures, []);
    });
  }

  it('006-02 core fields present with sane types', () => {
    const problems = [];
    forEachEntry((d, i) => {
      const id = label(d, i);
      for (const k of ['vendor_id', 'sku', 'price', 'name', 'is_rack_mountable', 'u_height', 'lifecycle_status', 'product_line', 'category']) {
        if (!(k in d)) problems.push(`${id}: missing ${k}`);
      }
      if (d.price !== null && !(typeof d.price === 'number' && d.price >= 0)) problems.push(`${id}: bad price`);
      if (!Number.isInteger(d.u_height) || d.u_height < 0) problems.push(`${id}: bad u_height`);
    });
    assert.deepEqual(problems, []);
  });

  it('006-03 no spec attributes at the top level, no unknown keys', () => {
    const problems = [];
    forEachEntry((d, i) => {
      const allowed = new Set([...CORE_KEYS, ...SPEC_BLOCKS[d.category] || []]);
      for (const k of Object.keys(d)) {
        if (SPEC_ATTRS.includes(k)) problems.push(`${label(d, i)}: spec attribute ${k} at top level`);
        else if (!allowed.has(k)) problems.push(`${label(d, i)}: unknown key ${k}`);
      }
    });
    assert.deepEqual(problems, []);
  });

  it('006-04 each device has its own category block and no foreign blocks', () => {
    const problems = [];
    forEachEntry((d, i) => {
      if (!d[REQUIRED_BLOCK[d.category]]) problems.push(`${label(d, i)}: missing ${REQUIRED_BLOCK[d.category]}`);
      const all = ['gateway_router_specs', 'switch_specs', 'ap_specs', 'firewall_specs', 'controller_specs'];
      for (const b of all) {
        if (d[b] && !SPEC_BLOCKS[d.category].includes(b)) problems.push(`${label(d, i)}: ${b} not allowed on ${d.category}`);
      }
    });
    assert.deepEqual(problems, []);
  });

  it('006-05 conditional schema rules (sfp_form_factor, lan_ports with integrated switch)', () => {
    const problems = [];
    forEachEntry((d, i) => {
      const id = label(d, i);
      for (const b of ['gateway_router_specs', 'switch_specs']) {
        const s = d[b];
        if (s && s.sfp_ports >= 1 && !s.sfp_form_factor) problems.push(`${id}: ${b} sfp_ports>0 without sfp_form_factor`);
      }
      if (d.switch_specs && d.gateway_router_specs && d.gateway_router_specs.lan_ports !== 0) {
        problems.push(`${id}: lan_ports must be 0 when switch_specs present`);
      }
    });
    assert.deepEqual(problems, []);
  });

  it('006-06 specs are internally consistent', () => {
    const problems = [];
    forEachEntry((d, i) => {
      const id = label(d, i);
      const s = d.switch_specs;
      if (s) {
        if (s.poe_ports > s.port_count) problems.push(`${id}: poe_ports > port_count`);
        if (s.sfp_ports > s.port_count) problems.push(`${id}: sfp_ports > port_count`);
        if (s.poe_ports > 0 && !(s.poe_budget_w > 0)) problems.push(`${id}: poe_ports>0 without poe_budget_w`);
      }
      const g = d.gateway_router_specs;
      if (g && g.sfp_ports > (g.wan_ports || 0) + (g.lan_ports || 0) && !d.switch_specs) {
        problems.push(`${id}: sfp_ports > wan_ports + lan_ports`);
      }
    });
    assert.deepEqual(problems, []);
  });
});

// ---------- AC 3: capabilities ----------
describe('AC3 capabilities mappable to Capability/DeviceCapability', () => {
  it('006-12 capabilities are arrays of unique strings from the fixed vocabulary', () => {
    const problems = [];
    forEachEntry((d, i) => {
      if (d.capabilities === undefined) return;
      if (!Array.isArray(d.capabilities)) return problems.push(`${label(d, i)}: not an array`);
      if (new Set(d.capabilities).size !== d.capabilities.length) problems.push(`${label(d, i)}: duplicates`);
      for (const c of d.capabilities) {
        if (!CAPABILITY_VOCAB.has(c)) problems.push(`${label(d, i)}: "${c}" not in vocabulary`);
      }
    });
    assert.deepEqual(problems, []);
  });

  it('006-13 multi-role devices tagged for every role they carry', () => {
    const problems = [];
    const roles = { switch_specs: 'switch', controller_specs: 'controller', firewall_specs: 'firewall' };
    forEachEntry((d, i) => {
      for (const [block, cap] of Object.entries(roles)) {
        if (d[block] && !(d.capabilities || []).includes(cap)) problems.push(`${label(d, i)}: has ${block} but no "${cap}" capability`);
      }
    });
    assert.deepEqual(problems, []);
  });

  it('006-14 distinct capability strings are a subset of the seeded vocabulary', () => {
    const used = new Set();
    forEachEntry((d) => (d.capabilities || []).forEach((c) => used.add(c)));
    const extra = [...used].filter((c) => !CAPABILITY_VOCAB.has(c));
    assert.deepEqual(extra, []);
  });
});

// ---------- AC 4: firewall specs ----------
describe('AC4 firewall_specs alongside gateway specs', () => {
  it('006-15 firewall-tagged gateways carry firewall_specs, and vice versa', () => {
    const problems = [];
    (data['unifi-routers.json'] || []).forEach((d, i) => {
      const tagged = (d.capabilities || []).includes('firewall');
      if (tagged !== Boolean(d.firewall_specs)) problems.push(`${label(d, i)}: firewall tag and firewall_specs disagree`);
      if (d.firewall_specs && !d.gateway_router_specs) problems.push(`${label(d, i)}: firewall_specs without gateway_router_specs`);
    });
    assert.deepEqual(problems, []);
  });

  it('006-16 firewall_specs content is valid; unknown idps is null/absent, never guessed', () => {
    const problems = [];
    forEachEntry((d, i) => {
      const f = d.firewall_specs;
      if (!f) return;
      if (!Number.isInteger(f.firewall_throughputs_mbps) || f.firewall_throughputs_mbps < 0) problems.push(`${label(d, i)}: bad firewall_throughputs_mbps`);
      for (const k of ['vpn_throughput_mbps', 'max_concurrent_sessions']) {
        if (k in f && !(Number.isInteger(f[k]) && f[k] >= 0)) problems.push(`${label(d, i)}: bad ${k}`);
      }
      if ('idps_throughput_mbps' in f && f.idps_throughput_mbps !== null && !(Number.isInteger(f.idps_throughput_mbps) && f.idps_throughput_mbps >= 0)) {
        problems.push(`${label(d, i)}: bad idps_throughput_mbps`);
      }
    });
    assert.deepEqual(problems, []);
  });

  it('006-17 plain gateways omit the key entirely (no null)', () => {
    const bad = [];
    forEachEntry((d, i) => {
      if ('firewall_specs' in d && (d.firewall_specs === null || d.firewall_specs === undefined)) bad.push(label(d, i));
    });
    assert.deepEqual(bad, []);
  });

  it('006-18 firewall_specs only on gateway entries; no standalone firewall entries', () => {
    const bad = [];
    forEachEntry((d, i) => {
      if (d.firewall_specs && d.category !== 'gateway_router') bad.push(`${label(d, i)}: firewall_specs on ${d.category}`);
      if (d.category === 'firewall') bad.push(`${label(d, i)}: standalone firewall`);
    });
    assert.deepEqual(bad, []);
  });
});

// ---------- manuscript scope ----------
describe('Manuscript scope and delimitations', () => {
  it('006-19 only gateway/router, switch and AP categories', () => {
    const cats = new Set();
    forEachEntry((d) => cats.add(d.category));
    assert.deepEqual([...cats].sort(), ['ap', 'gateway_router', 'switch']);
  });

  it('006-20 no cabling or minor installation materials in the catalog', () => {
    const re = /\b(cable|patch\s*(cord|panel)|rj-?45|transceiver|sfp\s*module|connector)\b/i;
    const bad = [];
    forEachEntry((d, i) => {
      if (re.test(d.name || '') || re.test(d.sku || '')) bad.push(label(d, i));
    });
    assert.deepEqual(bad, []);
  });
});

// ---------- validator self-check ----------
describe('Suite self-check', () => {
  const goodSwitch = {
    vendor_id: 1, sku: 'X-SW', price: 100, name: 'X Switch', is_rack_mountable: true, u_height: 1,
    lifecycle_status: 'active', category: 'switch', product_line: 'Line',
    switch_specs: { port_count: 8, layer: 2, poe_ports: 4, poe_budget_w: 60, sfp_ports: 2, sfp_form_factor: 'SFP+' },
  };

  it('006-21 accepts a good fixture', () => {
    const v = validatorFor('switchDevice');
    assert.ok(v(goodSwitch), fmtErrors(v.errors));
  });

  it('006-21 rejects broken fixtures', () => {
    const v = validatorFor('switchDevice');
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const noForm = clone(goodSwitch); delete noForm.switch_specs.sfp_form_factor;
    const noLine = clone(goodSwitch); delete noLine.product_line;
    const badLife = clone(goodSwitch); badLife.lifecycle_status = 'ACTIVE';
    const badCap = clone(goodSwitch); badCap.capabilities = ['switchh'];
    for (const [name, bad] of Object.entries({ noForm, noLine, badLife, badCap })) {
      assert.equal(v(bad), false, `${name} should have been rejected`);
    }
  });
});