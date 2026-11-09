'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
 wirelessRequirements
} = require('../../src/types/engine/requirements/wireless.js');

const { createCtx } = require('../../src/types/engine/ctx.js');
const {
 validateRequirements
} = require('../../src/types/engine/contracts.js');

function makeInput(overrides = {}) {
 return {
   contractVersion: 2,
   locations: 'one',
   floors: 1,
   floorArea: [420],
   roomsPerFloor: 8,
   largeRooms: [],
   wiredPcs: 0,
   wifiDevices: 60,
   voipPhones: 0,
   cameras: 0,
   otherDevices: {
     hasOtherDevices: false,
     description: ''
   },
   existingEquipment: 'no',
   existingCabling: 'none',
   internetMbps: 200,
   connection: 'fiber',
   downtime: 'sameDay',
   guestWifi: false,
   sensitiveData: false,
   apps: [],
   housing: 'wall',
   monthlyBudgetBand: 'under15k',
   itSupport: 'outside',
   power: 'stable',
   growth: {
     expected: false,
     band: null,
     newSites: 0
   },
   management: 'dashboard',
   ...overrides
 };
}

test('meets the 420 m² and 60-device Wi-Fi 6 acceptance example', () => {
 const result = wirelessRequirements(makeInput(), createCtx());

 assert.equal(result.standard, '6');
 assert.equal(result.ceiling, 40);

 // Coverage: ceil(420 / 140) = 3 APs.
 assert.equal(result.CE.total, 3);
 assert.deepEqual(result.CE.perFloor, [3]);

 // Capacity: ceil(60 / 40) = 2, so coverage remains the limiting factor.
 assert.equal(result.HP.total, 3);
 assert.deepEqual(result.HP.perFloor, [3]);
});


test('selects Wi-Fi 6E when video conferencing is required', () => {
 const result = wirelessRequirements(
   makeInput({ apps: ['videoConferencing'] }),
   createCtx()
 );
 assert.equal(result.standard, '6E');
 assert.equal(result.ceiling, 55);
});


test('defaults to Wi-Fi 6 when no application requires Wi-Fi 6E', () => {
 const result = wirelessRequirements(
   makeInput({ apps: [] }),
   createCtx()
 );

 assert.equal(result.standard, '6');
 assert.equal(result.ceiling, 40);
});


test('selects Wi-Fi 6E when streaming is required', () => {
 const result = wirelessRequirements(
   makeInput({ apps: ['streaming'] }),
   createCtx()
 );
 assert.equal(result.standard, '6E');
 assert.equal(result.ceiling, 55);
});


test('recalculates exact AP totals when Wi-Fi 6 is explicitly requested', () => {
 const result = wirelessRequirements(
   makeInput({
     floorArea: [420],
     wifiDevices: 120,
     apps: ['videoConferencing'],
     growth: {
       expected: true,
       band: '11-30',
       newSites: 0
     }
   }),
   createCtx(),
   '6'
 );

 assert.equal(result.standard, '6');
 assert.equal(result.ceiling, 40);

 // CE: ceil(120 / 40) = 3; coverage = 3.
 assert.equal(result.CE.total, 3);
 assert.deepEqual(result.CE.perFloor, [3]);

 // HP: ceil(120 * 1.30 / (40 * 0.65)) = 6.
 assert.equal(result.HP.total, 6);
 assert.deepEqual(result.HP.perFloor, [6]);
});

test('recomputes the full result when switching from Wi-Fi 6E to Wi-Fi 6', () => {
 const input = makeInput({
   floorArea: [420],
   wifiDevices: 120,
   apps: ['videoConferencing'],
   growth: {
     expected: true,
     band: '11-30',
     newSites: 0
   }
 });

 const first = wirelessRequirements(input, createCtx());
 const second = wirelessRequirements(input, createCtx(), '6');

 // First call selects Wi-Fi 6E.
 assert.equal(first.standard, '6E');
 assert.equal(first.ceiling, 55);

 // Second call explicitly recalculates using Wi-Fi 6.
 assert.equal(second.standard, '6');
 assert.equal(second.ceiling, 40);
 assert.equal(second.CE.total, 3);
 assert.deepEqual(second.CE.perFloor, [3]);
 assert.equal(second.HP.total, 6);
 assert.deepEqual(second.HP.perFloor, [6]);

 // Confirm the second result has the expected complete structure.
 assert.doesNotThrow(() =>
   validateRequirements({ wireless: second })
 );
});

test('per-floor counts add up to each plan total', () => {
 const result = wirelessRequirements(
   makeInput({
     floors: 2,
     locations: 'twoOrMore',
     floorArea: [280, 280],
     wifiDevices: 120,
     growth: {
       expected: true,
       band: '11-30',
       newSites: 0
     }
   }),
   createCtx()
 );

 assert.equal(
   result.CE.perFloor.reduce((sum, count) => sum + count, 0),
   result.CE.total
 );
 assert.equal(
   result.HP.perFloor.reduce((sum, count) => sum + count, 0),
   result.HP.total

 );
   assert.equal(result.CE.total, 4);
   assert.deepEqual(result.CE.perFloor, [2, 2]);

   assert.equal(result.HP.total, 6);
   assert.deepEqual(result.HP.perFloor, [3, 3]);
});


test('assigns large-room APs to the correct floor and distributes extra APs', () => {
 const result = wirelessRequirements(
   makeInput({
     floors: 2,
     locations: 'twoOrMore',
     floorArea: [140, 140],
     wifiDevices: 120,
     largeRooms: [{ floor: 2, occupancy: 60 }],
     growth: {
       expected: true,
       band: '11-30',
       newSites: 0
     }
   }),
   createCtx()
 );

 // Wi-Fi 6: ceiling = 40.
 // Coverage requires 1 AP per floor.
 // The room is on floor 2 and needs ceil(60 / 40) = 2 dedicated CE APs.
 assert.equal(result.CE.total, 4);
 assert.deepEqual(result.CE.perFloor, [1, 3]);

 // HP room APs: ceil(60 * 1.30 / (40 * 0.65)) = 3.
 // General users: 120 - 60 = 60.
 // HP general capacity: ceil(60 * 1.30 / (40 * 0.65)) = 3.
 // HP base = max(2 coverage APs, 3 capacity APs) = 3.
 // Total HP = 3 base APs + 3 dedicated room APs = 6.
 // One extra AP is distributed to floor 1 by the current algorithm.
 assert.equal(result.HP.total, 6);
 assert.deepEqual(result.HP.perFloor, [2, 4]);

 // Confirm floor counts sum to each plan's total.
 assert.equal(
   result.CE.perFloor.reduce((sum, count) => sum + count, 0),
   result.CE.total
 );
 assert.equal(
   result.HP.perFloor.reduce((sum, count) => sum + count, 0),
   result.HP.total
 );
});


test('returns a valid wireless requirements structure', () => {
 const result = wirelessRequirements(makeInput(), createCtx());

 assert.equal(typeof result.standard, 'string');
 assert.equal(typeof result.ceiling, 'number');

 for (const plan of ['CE', 'HP']) {
   assert.ok(Number.isInteger(result[plan].total));
   assert.ok(result[plan].total >= 0);
   assert.ok(Array.isArray(result[plan].perFloor));
   assert.equal(result[plan].perFloor.length, 1);
 }

 assert.doesNotThrow(() =>
   validateRequirements({ wireless: result })
 );
});


test('matches the large-room example without double-counting room occupants', () => {
 const result = wirelessRequirements(
   makeInput({
     floorArea: [420],
     wifiDevices: 120,
     largeRooms: [{ floor: 1, occupancy: 100 }],
     growth: {
       expected: true,
       band: '11-30',
       newSites: 0
     }
   }),
   createCtx()
 );

 assert.equal(result.standard, '6');
 assert.equal(result.ceiling, 40);

 // Large room: ceil(100 / 40) = 3 CE APs.
 // Remaining general users: 120 - 100 = 20.
 // Coverage/general capacity base: max(3, ceil(20 / 40)) = 3.
 assert.equal(result.CE.total, 6);
 assert.deepEqual(result.CE.perFloor, [6]);

 // Large room HP: ceil(100 * 1.30 / (40 * 0.65)) = 5 APs.
 // General users HP: ceil(20 * 1.30 / (40 * 0.65)) = 1 AP.
 // Coverage/general base remains 3, so total = 3 + 5 = 8.
 assert.equal(result.HP.total, 8);
 assert.deepEqual(result.HP.perFloor, [8]);
});

test('distributes extra capacity APs across floors without changing the total', () => {
 const result = wirelessRequirements(
   makeInput({
     floors: 2,
     locations: 'twoOrMore',
     floorArea: [140, 140],
     wifiDevices: 200,
     growth: {
       expected: false,
       band: null,
       newSites: 0
     }
   }),
   createCtx()
 );

 assert.equal(result.CE.total, 5);
 assert.equal(result.CE.perFloor.reduce((sum, count) => sum + count, 0), 5);
 assert.deepEqual(result.CE.perFloor, [3, 2]);
});

test('uses integer ceiling calculations for High-Performance capacity', () => {
 const result = wirelessRequirements(
   makeInput({
     floorArea: [140],
     wifiDevices: 26,
     growth: {
       expected: true,
       band: '11-30',
       newSites: 0
     }
   }),
   createCtx()
 );

 assert.equal(result.HP.total, 2);
});

test('rounds decimal floor areas up when calculating coverage APs', () => {
 const result = wirelessRequirements(
   makeInput({
     floorArea: [140.5],
     wifiDevices: 0
   }),
   createCtx()
 );

 assert.equal(result.CE.total, 2);
 assert.equal(result.HP.total, 2);
 assert.deepEqual(result.CE.perFloor, [2]);
 assert.deepEqual(result.HP.perFloor, [2]);
});


test('applies the large-room threshold below, at, and above the boundary', () => {
 const calculate = (occupancy) =>
   wirelessRequirements(
     makeInput({
       floorArea: [140],
       wifiDevices: occupancy,
       largeRooms: [{ floor: 1, occupancy }],
     }),
     createCtx()
   );

 const below = calculate(19);
 const at = calculate(20);
 const above = calculate(21);

 assert.equal(below.CE.total, 1);
 assert.equal(at.CE.total, 1);
 assert.equal(above.CE.total, 2);

 assert.equal(below.HP.total, 1);
 assert.equal(at.HP.total, 1);
 assert.equal(above.HP.total, 2);
});


test('applies each growth band to High-Performance capacity', () => {
 const calculate = (growth) =>
   wirelessRequirements(
     makeInput({
       floorArea: [140],
       wifiDevices: 70,
       growth,
     }),
     createCtx()
   );

 const noGrowth = calculate({
   expected: false,
   band: null,
   newSites: 0,
 });

 const lowGrowth = calculate({
   expected: true,
   band: '0-10',
   newSites: 0,
 });

 const mediumGrowth = calculate({
   expected: true,
   band: '11-30',
   newSites: 0,
 });

 const highGrowth = calculate({
   expected: true,
   band: '31+',
   newSites: 0,
 });

 assert.equal(noGrowth.HP.total, 3);
 assert.equal(lowGrowth.HP.total, 4);
 assert.equal(mediumGrowth.HP.total, 4);
 assert.equal(highGrowth.HP.total, 5);
});

test('rounds HP capacity correctly at the 65% utilization boundary', () => {
 const calculate = (wifiDevices) =>
   wirelessRequirements(
     makeInput({
       floorArea: [140],
       wifiDevices,
       growth: {
         expected: false,
         band: null,
         newSites: 0,
       },
     }),
     createCtx()
   );

 assert.equal(calculate(26).HP.total, 1);
 assert.equal(calculate(27).HP.total, 2);
});


test('distributes APs correctly across three floors', () => {
 const result = wirelessRequirements(
   makeInput({
     floors: 3,
     locations: 'twoOrMore',
     floorArea: [140, 140, 140],
     wifiDevices: 200,
     growth: {
       expected: false,
       band: null,
       newSites: 0,
     },
   }),
   createCtx()
 );

 assert.equal(result.CE.total, 5);
 assert.deepEqual(result.CE.perFloor, [2, 2, 1]);

 assert.equal(result.HP.total, 8);
 assert.deepEqual(result.HP.perFloor, [3, 3, 2]);

 assert.equal(
   result.CE.perFloor.reduce((sum, count) => sum + count, 0),
   result.CE.total
 );

 assert.equal(
   result.HP.perFloor.reduce((sum, count) => sum + count, 0),
   result.HP.total
 );
});


test('does not add an extra AP when capacity divides exactly', () => {
 const result = wirelessRequirements(
   makeInput({
     floorArea: [140],
     wifiDevices: 80,
     growth: {
       expected: false,
       band: null,
       newSites: 0,
     },
   }),
   createCtx()
 );

 assert.equal(result.CE.total, 2);
 assert.equal(result.HP.total, 4);
});


test('does not add an extra HP AP when capacity divides to exactly 5.0', () => {
 const result = wirelessRequirements(
   makeInput({
     floorArea: [140],
     wifiDevices: 100,
     growth: {
       expected: true,
       band: '11-30',
       newSites: 0
     }
   }),
   createCtx()
 );

 // 100 * 1.30 / (40 * 0.65) = 5 exactly.
 assert.equal(result.HP.total, 5);
 assert.deepEqual(result.HP.perFloor, [5]);
});


// ===========================================================================
// ADDITIONAL TESTS (NWP-ENGINE-002)
// Cover the test case steps that the tests above do not check.
// Each test name starts with the test case ID and step it executes.
// ===========================================================================

const fs = require('node:fs');
const path = require('node:path');

const runWireless = (overrides = {}, standardOverride) =>
 wirelessRequirements(makeInput(overrides), createCtx(), standardOverride);

const sumOf = (counts) => counts.reduce((total, count) => total + count, 0);
const clone = (value) => JSON.parse(JSON.stringify(value));

const NO_GROWTH = { expected: false, band: null, newSites: 0 };
const GROWTH_11_30 = { expected: true, band: '11-30', newSites: 0 };


// ---------------------------------------------------------------------------
// TC-001 step 6
// ---------------------------------------------------------------------------
test('[TC-001 step 6] capacity binds when Q14 is raised to 200', () => {
 const result = runWireless({
   floorArea: [420],
   wifiDevices: 200,
   growth: NO_GROWTH
 });

 // Coverage = 3; capacity = ceil(200 / 40) = 5, so capacity is the larger value.
 assert.equal(result.CE.total, 5);
 assert.deepEqual(result.CE.perFloor, [5]);
});


// ---------------------------------------------------------------------------
// TC-004 step 5
// ---------------------------------------------------------------------------
test('[TC-004 step 5] growth band never changes the Cost-Efficient total', () => {
 const growthOptions = [
   NO_GROWTH,
   { expected: true, band: '0-10', newSites: 0 },
   { expected: true, band: '11-30', newSites: 0 },
   { expected: true, band: '31+', newSites: 0 }
 ];

 for (const growth of growthOptions) {
   const result = runWireless({
     floorArea: [140],
     wifiDevices: 70,
     growth
   });

   // Coverage = 1; capacity = ceil(70 / 40) = 2.
   assert.equal(result.CE.total, 2, `CE total with growth band ${growth.band}`);
 }
});


// ---------------------------------------------------------------------------
// TC-005 steps 4 to 6
// ---------------------------------------------------------------------------
test('[TC-005 step 4] selects Wi-Fi 6E when video conferencing is combined with another app', () => {
 // 'webBrowsing' is a placeholder: replace it with a real Q20 value from the questionnaire.
 const result = runWireless({ apps: ['videoConferencing', 'webBrowsing'] });

 assert.equal(result.standard, '6E');
 assert.equal(result.ceiling, 55);
});

test('[TC-005 step 5] defaults to Wi-Fi 6 when Q20 is answered "not sure"', () => {
 // 'notSure' is a placeholder: replace it with the value the questionnaire stores.
 const result = runWireless({ apps: ['notSure'] });

 assert.equal(result.standard, '6');
 assert.equal(result.ceiling, 40);
 assert.doesNotThrow(() => validateRequirements({ wireless: result }));
});

test('[TC-005 step 6] uses the 6E ceiling (55) in the capacity calculation', () => {
 const input = { floorArea: [140], wifiDevices: 150, growth: NO_GROWTH };

 const sixE = runWireless({ ...input, apps: ['videoConferencing'] });
 const six = runWireless({ ...input, apps: [] });

 // Coverage = 1. 6E: ceil(150 / 55) = 3. Wi-Fi 6: ceil(150 / 40) = 4.
 assert.equal(sixE.CE.total, 3);
 assert.equal(six.CE.total, 4);
});


// ---------------------------------------------------------------------------
// TC-006 steps 1, 6, and 7
// ---------------------------------------------------------------------------
test('[TC-006 step 1] the first (6E) call returns the expected totals', () => {
 const first = runWireless({
   floorArea: [420],
   wifiDevices: 120,
   apps: ['videoConferencing'],
   growth: GROWTH_11_30
 });

 assert.equal(first.standard, '6E');
 assert.equal(first.ceiling, 55);

 // CE: ceil(120 / 55) = 3; coverage = 3.
 assert.equal(first.CE.total, 3);
 assert.deepEqual(first.CE.perFloor, [3]);

 // HP: ceil(120 * 1.30 / (55 * 0.65)) = ceil(4.36) = 5.
 assert.equal(first.HP.total, 5);
 assert.deepEqual(first.HP.perFloor, [5]);
});

test('[TC-006 step 6] the override call changes neither the first result nor the input', () => {
 const input = makeInput({
   floorArea: [420],
   wifiDevices: 120,
   apps: ['videoConferencing'],
   growth: GROWTH_11_30
 });
 const inputBefore = clone(input);

 const first = wirelessRequirements(input, createCtx());
 const firstBefore = clone(first);

 const second = wirelessRequirements(input, createCtx(), '6');

 assert.notEqual(first, second);
 assert.deepEqual(first, firstBefore);
 assert.deepEqual(input, inputBefore);

 // Running again without the override gives the first result again.
 const third = wirelessRequirements(input, createCtx());
 assert.deepEqual(third, firstBefore);
});

test('[TC-006 step 7] the override also changes the Cost-Efficient total', () => {
 const input = {
   floorArea: [420],
   wifiDevices: 150,
   apps: ['videoConferencing'],
   growth: GROWTH_11_30
 };

 const first = runWireless(input);
 const second = runWireless(input, '6');

 // 6E (ceiling 55): CE = max(3, ceil(150 / 55) = 3) = 3; HP = ceil(195 / 35.75) = 6.
 assert.equal(first.standard, '6E');
 assert.equal(first.CE.total, 3);
 assert.equal(first.HP.total, 6);

 // Wi-Fi 6 (ceiling 40): CE = max(3, ceil(150 / 40) = 4) = 4; HP = ceil(195 / 26) = 8.
 assert.equal(second.standard, '6');
 assert.equal(second.CE.total, 4);
 assert.deepEqual(second.CE.perFloor, [4]);
 assert.equal(second.HP.total, 8);
 assert.deepEqual(second.HP.perFloor, [8]);
});


// ---------------------------------------------------------------------------
// TC-009 step 5
// ---------------------------------------------------------------------------
test('[TC-009 step 5] does not add an extra HP AP when the general count divides exactly to 3.0', () => {
 const result = runWireless({
   floorArea: [140],
   wifiDevices: 60,
   growth: GROWTH_11_30
 });

 // 60 * 1.30 / (40 * 0.65) = 3 exactly.
 assert.equal(result.HP.total, 3);
 assert.deepEqual(result.HP.perFloor, [3]);
});


// ---------------------------------------------------------------------------
// TC-010 steps 1, 2, 3, and 5
// ---------------------------------------------------------------------------
test('[TC-010 step 1] a very small floor still gets the minimum of 1 AP', () => {
 const result = runWireless({ floorArea: [50], wifiDevices: 0 });

 assert.equal(result.CE.total, 1);
 assert.equal(result.HP.total, 1);
 assert.deepEqual(result.CE.perFloor, [1]);
 assert.deepEqual(result.HP.perFloor, [1]);
});

test('[TC-010 step 2] a floor of exactly 140 m² needs 1 coverage AP', () => {
 const result = runWireless({ floorArea: [140], wifiDevices: 0 });

 assert.equal(result.CE.total, 1);
 assert.equal(result.HP.total, 1);
});

test('[TC-010 step 3] decimal areas around 420 m² round up correctly', () => {
 const below = runWireless({ floorArea: [419.9], wifiDevices: 0 });
 const above = runWireless({ floorArea: [420.1], wifiDevices: 0 });

 assert.equal(below.CE.total, 3);
 assert.equal(above.CE.total, 4);
});

test('[TC-010 step 5] a very small floor next to a larger floor keeps the minimum of 1 AP', () => {
 const result = runWireless({
   floors: 2,
   locations: 'twoOrMore',
   floorArea: [50, 420],
   wifiDevices: 0
 });

 assert.equal(result.CE.total, 4);
 assert.deepEqual(result.CE.perFloor, [1, 3]);
 assert.equal(sumOf(result.HP.perFloor), result.HP.total);
});


// ---------------------------------------------------------------------------
// TC-011 steps 2 to 4
// ---------------------------------------------------------------------------
test('[TC-011 step 2] large rooms of 40 and 41 people get 1 and 2 dedicated APs', () => {
 const calculate = (occupancy) =>
   runWireless({
     floorArea: [140],
     wifiDevices: occupancy,
     largeRooms: [{ floor: 1, occupancy }],
     growth: NO_GROWTH
   });

 // Coverage = 1; the general count is 0 because all occupants are in the room.
 assert.equal(calculate(40).CE.total, 2); // 1 coverage + ceil(40 / 40) = 1 room AP
 assert.equal(calculate(41).CE.total, 3); // 1 coverage + ceil(41 / 40) = 2 room APs
});

test('[TC-011 steps 3-4] two large rooms each get dedicated APs and leave the general count', () => {
 const result = runWireless({
   floorArea: [420],
   wifiDevices: 200,
   largeRooms: [
     { floor: 1, occupancy: 100 },
     { floor: 1, occupancy: 60 }
   ],
   growth: NO_GROWTH
 });

 // Room APs: ceil(100 / 40) + ceil(60 / 40) = 3 + 2 = 5.
 // General count: 200 - 160 = 40, so capacity = ceil(40 / 40) = 1.
 // CE = max(3, 1) + 5 = 8.
 assert.equal(result.CE.total, 8);
 assert.deepEqual(result.CE.perFloor, [8]);
});


// ---------------------------------------------------------------------------
// TC-012 steps 1 to 3
// ---------------------------------------------------------------------------
test('[TC-012 steps 1-2] all Q14 occupants in the large room leaves a general count of 0', () => {
 const result = runWireless({
   floorArea: [420],
   wifiDevices: 100,
   largeRooms: [{ floor: 1, occupancy: 100 }],
   growth: GROWTH_11_30
 });

 // Coverage = 3; general capacity = 0; room APs = 3 (CE) and 5 (HP).
 assert.equal(result.CE.total, 6);
 assert.equal(result.HP.total, 8);
});

test('[TC-012 step 3] room occupants above Q14 never give a negative count, NaN, or an unhandled crash', (t) => {
 let result;

 try {
   result = runWireless({
     floorArea: [420],
     wifiDevices: 80,
     largeRooms: [{ floor: 1, occupancy: 100 }],
     growth: GROWTH_11_30
   });
 } catch (error) {
   // Rejecting the input is acceptable, but it must be a ValidationError.
   assert.equal(error.name, 'ValidationError');
   if (t.diagnostic) t.diagnostic('Rejected the input with a ValidationError.');
   return;
 }

 for (const plan of ['CE', 'HP']) {
   assert.ok(Number.isInteger(result[plan].total));
   assert.ok(result[plan].total >= 0);
   for (const count of result[plan].perFloor) {
     assert.ok(Number.isInteger(count));
     assert.ok(count >= 0);
   }
   assert.equal(sumOf(result[plan].perFloor), result[plan].total);
 }
 if (t.diagnostic) {
   t.diagnostic(`Accepted the input: CE = ${result.CE.total}, HP = ${result.HP.total}.`);
 }
});


// ---------------------------------------------------------------------------
// TC-013 steps 3 and 4 (fixtures)
// Adjust these three values if your fixture folder or file names are different.
// ---------------------------------------------------------------------------
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const NORMALIZED_DIR = path.join(FIXTURES_DIR, 'normalized-input');
const REQUIREMENTS_DIR = path.join(FIXTURES_DIR, 'requirements');

const listFixtures = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir)
        .filter((file) => file.endsWith('.json'))
        .sort()
    : [];

const readFixture = (dir, file) =>
  JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));

test('[TC-013 step 3] every NormalizedInput fixture runs through the wireless function and passes validateRequirements', (t) => {
 const files = listFixtures(NORMALIZED_DIR);

 if (files.length === 0) {
   t.skip(`No NormalizedInput fixtures found in ${FIXTURES_DIR}`);
   return;
 }

 assert.equal(files.length, 4, 'expected four NormalizedInput fixtures');

 for (const file of files) {
   const result = wirelessRequirements(readFixture(NORMALIZED_DIR, file), createCtx());

   assert.doesNotThrow(
     () => validateRequirements({ wireless: result }),
     `validateRequirements failed for ${file}`
   );
   assert.equal(sumOf(result.CE.perFloor), result.CE.total, `CE perFloor sum for ${file}`);
   assert.equal(sumOf(result.HP.perFloor), result.HP.total, `HP perFloor sum for ${file}`);
 }
});

test('[TC-013 step 4] wireless totals match the hand-derived Requirements fixtures', (t) => {
  const files = listFixtures(NORMALIZED_DIR);
  let compared = 0;

  for (const file of files) {
    const match = file.match(/^input(\d+)-/);
    if (!match) continue;

    const requirementsFile = `input${match[1]}-requirements.json`;
    const requirementsPath = path.join(REQUIREMENTS_DIR, requirementsFile);

    if (!fs.existsSync(requirementsPath)) continue;

    const stored = readFixture(REQUIREMENTS_DIR, requirementsFile);
    const expected = stored.wireless || stored;

    if (
      !expected.CE ||
      !expected.HP ||
      !Number.isInteger(expected.CE.total) ||
      !Number.isInteger(expected.HP.total)
    ) {
      continue;
    }

    const actual = wirelessRequirements(
      readFixture(NORMALIZED_DIR, file),
      createCtx()
    );

    assert.equal(actual.CE.total, expected.CE.total, `CE total for ${file}`);
    assert.equal(actual.HP.total, expected.HP.total, `HP total for ${file}`);

    if (expected.CE.perFloor?.length) {
      assert.deepEqual(actual.CE.perFloor, expected.CE.perFloor);
    }

    if (expected.HP.perFloor?.length) {
      assert.deepEqual(actual.HP.perFloor, expected.HP.perFloor);
    }

    compared += 1;
  }

  assert.equal(
    compared,
    4,
    'Expected four complete, hand-derived Requirements fixtures'
  );
});