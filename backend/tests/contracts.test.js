'use strict';
// NWP-ENGINE-001: contracts.test.js
// For each validator: a valid object, and a missing-field case that must throw a
// ValidationError naming the field. Plain node:test and node:assert, no dependencies.
// Run with: node --test

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  CONTRACT_VERSION,
  ValidationError,
  validateNormalizedInput,
  validateRequirements,
  validateSelectionResult,
  validateCatalogSku,
} = require('../src/types/engine/contracts');

// Passes only if fn throws a ValidationError for `field`, and the message names it too.
function assertRejects(fn, field) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof ValidationError, `expected a ValidationError, got ${err && err.name}: ${err && err.message}`);
    assert.equal(err.field, field);
    assert.ok(err.message.includes(field), `message should name "${field}": ${err.message}`);
    return true;
  });
}

// ---- validateNormalizedInput ---------------------------------------------------------

// A fresh object each call, so one test can never change another's input.
const validInput = () => ({
  contractVersion: CONTRACT_VERSION,
  locations: 'one',
  floors: 2,
  floorArea: [200, 150],
  roomsPerFloor: 6,
  largeRooms: [{ floor: 1, occupancy: 40 }],
  wiredPcs: 10,
  wifiDevices: 25,
  voipPhones: 0,
  cameras: 4,
  otherDevices: { hasOtherDevices: true, description: 'One network printer' },
  existingEquipment: 'no',
  existingCabling: 'cat5e_cat6',
  internetMbps: 300,
  connection: 'fiber',
  downtime: 'sameDay',
  guestWifi: true,
  sensitiveData: false,
  apps: ['videoConferencing'],
  housing: 'wall',
  monthlyBudgetBand: '15to40k',
  itSupport: 'outside',
  power: 'stable',
  growth: { expected: true, band: '11-30', newSites: 0 },
  management: 'dashboard',
});

test('validateNormalizedInput accepts a valid object', () => {
  assert.equal(validateNormalizedInput(validInput()), true);
});

test('validateNormalizedInput rejects a missing field and names it', () => {
  const input = validInput();
  delete input.floors;
  assertRejects(() => validateNormalizedInput(input), 'floors');
});

test('validateNormalizedInput names every top-level field when it is missing', () => {
  for (const key of Object.keys(validInput())) {
    const input = validInput();
    delete input[key];
    assert.throws(() => validateNormalizedInput(input), (err) => {
      assert.ok(err instanceof ValidationError, `${key}: expected a ValidationError, got ${err.name}: ${err.message}`);
      assert.equal(err.field.split(/[.[]/)[0], key, `${key}: error named "${err.field}"`);
      return true;
    });
  }
});

test('validateNormalizedInput names the path of a missing nested field', () => {
  const input = validInput();
  delete input.otherDevices.description;
  assertRejects(() => validateNormalizedInput(input), 'otherDevices.description');
});

test('validateNormalizedInput rejects a contractVersion that is not the current one', () => {
  assertRejects(() => validateNormalizedInput({ ...validInput(), contractVersion: CONTRACT_VERSION - 1 }), 'contractVersion');
});

test('every NormalizedInput fixture is valid, and there are at least four', () => {
  const dir = path.join(__dirname, 'fixtures', 'normalized-input');
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
  assert.ok(files.length >= 4, `expected at least 4 fixtures in ${dir}, found ${files.length}`);
  for (const name of files) {
    const fixture = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    assert.equal(validateNormalizedInput(fixture), true, name);
  }
});

// ---- validateRequirements ------------------------------------------------------------

// Shape-valid values only, not derived numbers: the hand-derived fixtures live in tests/fixtures/requirements.
const validRequirements = () => ({
  g: 1.3,
  securityTier: 'standard',
  vlans: ['staff', 'guest'],
  qos: 'voice',
  redundancy: 'none',
  backupAdvice: 'cellular failover',
  vpnTunnelsNeeded: { CE: 0, HP: 0 },
  requiredMbps: 300,
  throughputMetric: 'routing_throughput',
  wireless: {
    standard: 'wifi6',
    ceiling: 40,
    CE: { total: 4, perFloor: [2, 2] },
    HP: { total: 6, perFloor: [3, 3] },
  },
  backbone: '1G',
  edgePorts: 30,
  poeEdgePorts: 10,
  otherPoeLoadW: 0,
  upsRecommendation: 'A UPS is advised for the gateway and core switch.',
  upsRecommendationLevel: 'advisory',
  flags: [],
});

test('validateRequirements accepts a valid object', () => {
  assert.equal(validateRequirements(validRequirements()), true);
});

test('validateRequirements accepts routing throughput metric', () => {
  assert.equal(
    validateRequirements({
      ...validRequirements(),
      throughputMetric: 'routing_throughput',
    }),
    true
  );
});

test('validateRequirements accepts IDPS throughput metric', () => {
  assert.equal(
    validateRequirements({
      ...validRequirements(),
      throughputMetric: 'idps_throughput',
    }),
    true
  );
});

test('validateRequirements rejects unsupported throughput metric', () => {
  assertRejects(
    () => validateRequirements({
      ...validRequirements(),
      throughputMetric: 'routing',
    }),
    'throughputMetric'
  );
});

test('validateRequirements accepts a single slice, since stories 003, 004 and 005 each return one', () => {
  assert.equal(validateRequirements({ g: 1.3 }), true);
});

test('validateRequirements rejects an object with no known requirement field and names it', () => {
  assertRejects(() => validateRequirements({}), 'reqs');
  assertRejects(() => validateRequirements({ notARequirement: 1 }), 'reqs');
});

test('validateRequirements names a field with the wrong type', () => {
  assertRejects(() => validateRequirements({ ...validRequirements(), g: 'high' }), 'g');
});

test('validateRequirements names the path of a bad nested field', () => {
  const reqs = validRequirements();
  reqs.wireless.CE.total = 2.5;
  assertRejects(() => validateRequirements(reqs), 'wireless.CE.total');
});

// ---- validateSelectionResult ---------------------------------------------------------

const okResult = () => ({ ok: true, sku: { sku: 'SYN-GW-001', vendor: 'synthetic' }, qty: 2, flags: [] });
const unmetResult = () => ({ ok: false, unmet: { category: 'gateway', vendor: 'synthetic', reason: 'No gateway meets the VPN requirement.' } });

test('validateSelectionResult accepts a valid success and a valid unmet result', () => {
  assert.equal(validateSelectionResult(okResult()), true);
  assert.equal(validateSelectionResult(unmetResult()), true);
});

test('validateSelectionResult rejects a missing ok and names it', () => {
  const result = okResult();
  delete result.ok;
  assertRejects(() => validateSelectionResult(result), 'ok');
});

test('validateSelectionResult rejects a success without qty and names it', () => {
  const result = okResult();
  delete result.qty;
  assertRejects(() => validateSelectionResult(result), 'qty');
});

test('validateSelectionResult rejects an unmet result without a reason and names it', () => {
  const result = unmetResult();
  delete result.unmet.reason;
  assertRejects(() => validateSelectionResult(result), 'unmet.reason');
});

// ---- validateCatalogSku --------------------------------------------------------------

const validGateway = () => ({
  sku: 'SYN-GW-001',
  vendor: 'synthetic',
  category: 'gateway',
  line: 'Synthetic Gateway Entry',
  line_rank: 1,
  status: 'ACTIVE',
  price: 12500,
  currency: 'PHP',
  routing_throughput_mbps: 850,
  idps_throughput_mbps: null,
  max_vpn_tunnels: null,
  site_to_site_vpn: true,
});

test('validateCatalogSku accepts a valid SKU, with the nullable fields null or absent', () => {
  assert.equal(validateCatalogSku(validGateway()), true);
  const absent = validGateway();
  delete absent.idps_throughput_mbps;
  delete absent.max_vpn_tunnels;
  assert.equal(validateCatalogSku(absent), true);
});

test('validateCatalogSku accepts a null price and a price of 0', () => {
  assert.equal(validateCatalogSku({ ...validGateway(), price: null }), true);
  assert.equal(validateCatalogSku({ ...validGateway(), price: 0 }), true);
});

test('validateCatalogSku rejects a gateway without line_rank and names it', () => {
  const sku = validGateway();
  delete sku.line_rank;
  assertRejects(() => validateCatalogSku(sku), 'line_rank');
});

test('validateCatalogSku rejects a SKU without status and names it', () => {
  const sku = validGateway();
  delete sku.status;
  assertRejects(() => validateCatalogSku(sku), 'status');
});

test('validateCatalogSku does not require a product line for an optic', () => {
  const optic = { sku: 'OPT-1', vendor: 'synthetic', category: 'optic', status: 'ACTIVE', price: 900, currency: 'PHP' };
  assert.equal(validateCatalogSku(optic), true);
});