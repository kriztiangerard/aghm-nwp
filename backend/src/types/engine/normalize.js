
'use strict';

// NWP-ENGINE-002 — Normalize raw questionnaire answers into NormalizedInput v2.

const params = require('./params');
const { addLedger, addFlag } = require('./ctx');
const {
  CONTRACT_VERSION,
  ValidationError,
  validateNormalizedInput,
} = require('./contracts');

const QKEY = Object.freeze({
  locations: 'Q2',
  headcount: 'Q3',
  floors: 'Q4',
  floorArea: 'Q5',
  roomsPerFloor: 'Q6',
  hasLargeRooms: 'Q7',
  largeRooms: 'Q8',
  existingEquipment: 'Q9',
  existingCabling: 'Q10b',
  internetMbps: 'Q10',
  connection: 'Q11',
  downtime: 'Q12',
  wiredPcs: 'Q13',
  wifiDevices: 'Q14',
  voipPhones: 'Q15',
  cameras: 'Q16',
  otherDevices: 'Q17',
  guestWifi: 'Q18',
  sensitiveData: 'Q19',
  apps: 'Q20',
  housing: 'Q21',
  budget: 'Q22',
  itSupport: 'Q23',
  power: 'Q24',
  growthExpected: 'Q25',
  growthBand: 'Q25a',
  newSites: 'Q25b',
  management: 'Q26',
});

const APP_NONE = 'None of the above';
const APP_VOIP = 'VoIP';
const APP_CAMERAS = 'Security camera viewing';
const APP_POS = 'Live POS';

const isBlank = (value) =>
  value === undefined || value === null || value === '';

const normalizedText = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';


const isNo = (value) => normalizedText(value) === 'no';
const isYes = (value) => normalizedText(value) === 'yes';

function requireYesNo(raw, key) {
  const value = raw[key];

  if (!isYes(value) && !isNo(value)) {
    fail(key, 'Must answer Yes or No.');
  }

  return isYes(value);
}
const isNotSure = (value) =>
  ['not sure', 'notsure', 'not_sure'].includes(normalizedText(value));

function fail(field, message) {
  throw new ValidationError(field, message);
}

function ledger(ctx, field, valueUsed, reason) {
  addLedger(ctx, field, valueUsed, reason);
}

function requireInt(raw, key, { min = 0, max, label = key } = {}) {
  const value = raw[key];

  if (isBlank(value) || !Number.isInteger(Number(value))) {
    fail(key, `${label} must be a whole number.`);
  }

  const number = Number(value);

  if (number < min) {
    fail(key, `${label} must be at least ${min}.`);
  }

  if (max !== undefined && number > max) {
    fail(key, 'outside SME scope');
  }

  return number;
}

function countOrNo(value, key) {
  if (isBlank(value) || isNo(value)) return 0;

  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    fail(key, 'Must be a non-negative whole number or "No".');
  }

  return number;
}

function mapLocations(value) {
  const text = normalizedText(value);

  if (['one', 'one site'].includes(text)) return 'one';

  if (
    ['twoormore', 'two_or_more', 'two or more sites', 'twoormoresites'].includes(text)
  ) {
    return 'twoOrMore';
  }

  if (isBlank(value)) return null;

  fail(QKEY.locations, 'Must identify one site or two or more sites.');
}

function mapEnum(value, key, aliases, allowed) {
  const text = normalizedText(value);
  const mapped = aliases[text] ?? value;

  if (!allowed.includes(mapped)) {
    fail(key, `Invalid value '${value}'.`);
  }

  return mapped;
}

function normalize(rawAnswers, ctx) {
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
    fail('rawAnswers', 'Must be an object of raw questionnaire answers.');
  }

  const raw = { ...rawAnswers };

  // Step 1: Validate required numeric inputs and SME scope.
  const headcount = requireInt(raw, QKEY.headcount, {
    min: 1,
    max: 200,
    label: 'Headcount',
  });

  const floors = requireInt(raw, QKEY.floors, {
    min: 1,
    label: 'Floors',
  });

  const roomsPerFloor = requireInt(raw, QKEY.roomsPerFloor, {
    min: 1,
    label: 'Rooms per floor',
  });

  // Step 2: Conditional nulling for questions that no longer apply.
  if (isNo(raw[QKEY.growthExpected])) {
    raw[QKEY.growthBand] = null;
    raw[QKEY.newSites] = null;
  }

  const voipPhones = countOrNo(raw[QKEY.voipPhones], QKEY.voipPhones);
  const cameras = countOrNo(raw[QKEY.cameras], QKEY.cameras);

  const otherDescription =
    isBlank(raw[QKEY.otherDevices]) || isNo(raw[QKEY.otherDevices])
      ? ''
      : String(raw[QKEY.otherDevices]).trim();

  const otherDevices = {
    hasOtherDevices: otherDescription.length > 0,
    description: otherDescription,
  };

  // Step 3: Validate Q20's mutually exclusive "None of the above" choice.
  const apps = Array.isArray(raw[QKEY.apps]) ? [...raw[QKEY.apps]] : [];

  if (!apps.every((app) => typeof app === 'string')) {
    fail(QKEY.apps, 'Every selected application must be a string.');
  }

  const selectedNone = apps.some(
    (app) => normalizedText(app) === normalizedText(APP_NONE),
  );

  if (selectedNone && apps.length > 1) {
    fail(
      QKEY.apps,
      '"None of the above" cannot be combined with other options.',
    );
  }

  const appList = apps.filter(
    (app) => normalizedText(app) !== normalizedText(APP_NONE),
  );

  // Step 4: Apply documented fallbacks.
  let locations = mapLocations(raw[QKEY.locations]);

  if (locations === null) {
    locations = 'one';
    ledger(
      ctx,
      'locations',
      'one',
      'Number of sites not answered; assumed one site',
    );
  }

  let areaPerFloor = isBlank(raw[QKEY.floorArea])
    ? NaN
    : Number(raw[QKEY.floorArea]);

  if (!Number.isFinite(areaPerFloor) || areaPerFloor <= 0) {
    areaPerFloor = roomsPerFloor * params.M2_PER_ROOM_FALLBACK;

    ledger(
      ctx,
      'floorArea',
      areaPerFloor,
      'Floor area estimated from room count',
    );
  }

  const floorArea = Array.from({ length: floors }, () => areaPerFloor);

  // "Not sure" is conservatively treated as sensitive data being present.
  let sensitiveData;

  if (isNotSure(raw[QKEY.sensitiveData])) {
    sensitiveData = true;

    ledger(
      ctx,
      'sensitiveData',
      true,
      'Sensitive data answered "Not sure"; treated as Yes',
    );
  } else {
    sensitiveData = isYes(raw[QKEY.sensitiveData]);
  }

  // Q10 is intentionally not assigned an invented fallback speed.
  let internetMbps = null;

  if (!isBlank(raw[QKEY.internetMbps])) {
    internetMbps = Number(raw[QKEY.internetMbps]);

    if (!Number.isFinite(internetMbps) || internetMbps <= 0) {
      fail(QKEY.internetMbps, 'Must be a positive number or blank.');
    }
  } else if (params.Q10_FALLBACK_BANDS === null) {
    addFlag(
      ctx,
      'Q10_FALLBACK_UNDEFINED',
      'Internet speed is unknown and no fallback bands are defined.',
    );
  }
  // Step 5: Normalize large-room entries and enforce hard constraints.
  let largeRooms;

  if (raw[QKEY.largeRooms] == null || raw[QKEY.largeRooms] === '') {
    largeRooms = [];

    ledger(
      ctx,
      'largeRooms',
      [],
      'Large-room details not provided; assumed no large rooms',
    );
  } else if (Array.isArray(raw[QKEY.largeRooms])) {
    largeRooms = raw[QKEY.largeRooms].map((room, index) => {
      if (!room || typeof room !== 'object' || Array.isArray(room)) {
        fail(QKEY.largeRooms, `Large room ${index + 1} must be an object.`);
      }

      const floor = Number(room.floor);
      const occupancy = Number(room.occupancy ?? room.capacity);

      if (!Number.isInteger(floor) || floor < 1 || floor > floors) {
        fail(QKEY.largeRooms, `Large room ${index + 1} has an invalid floor number.`);
      }

      if (!Number.isFinite(occupancy) || occupancy <= 0) {
        fail(QKEY.largeRooms, `Large room ${index + 1} must have a positive occupancy.`);
      }

      return { floor, occupancy };
    });
  } else {
    fail(QKEY.largeRooms, 'Must be an array of large-room details.');
  }


  // Q7 and Q8 must agree about whether large rooms exist.
const hasLargeRooms = requireYesNo(raw, QKEY.hasLargeRooms);
  if (hasLargeRooms && largeRooms.length === 0) {
    fail(
      QKEY.largeRooms,
      'Q7 is Yes, so Q8 must contain at least one large-room entry.',
    );
  }

  if (!hasLargeRooms && largeRooms.length > 0) {
    fail(
      QKEY.largeRooms,
      'Q7 is No, so Q8 must not contain any large-room entries.',
    );
  }


  const roomsByFloor = {};

  for (const room of largeRooms) {
    roomsByFloor[room.floor] = (roomsByFloor[room.floor] || 0) + 1;

    if (roomsByFloor[room.floor] > roomsPerFloor) {
      fail(
        QKEY.largeRooms,
        `Floor ${room.floor} lists ${roomsByFloor[room.floor]} large rooms but there are only ${roomsPerFloor} rooms per floor.`,
      );
    }
  }

  // Step 6: Resolve known consistency conflicts and record assumptions.
  const hasVoipApp = appList.some(
    (app) => normalizedText(app) === normalizedText(APP_VOIP),
  );

  if (voipPhones > 0 && !hasVoipApp) {
    appList.push(APP_VOIP);

    ledger(
      ctx,
      'apps',
      APP_VOIP,
      'VoIP phones entered but VoIP not ticked; VoIP treated as ticked',
    );
  }

  const hasCameraApp = appList.some((app) =>
    [
      'security camera viewing',
      'camera viewing',
      'security cameras',
    ].includes(normalizedText(app)),
  );

  if (cameras > 0 && !hasCameraApp) {
    appList.push(APP_CAMERAS);

    ledger(
      ctx,
      'apps',
      APP_CAMERAS,
      'Cameras entered but camera viewing not ticked; treated as ticked',
    );
  }

  const hasPosApp = appList.some((app) =>
    ['live pos', 'pos payment', 'pos/payments'].includes(normalizedText(app)),
  );

  if (hasPosApp && !sensitiveData) {
    sensitiveData = true;

    ledger(
      ctx,
      'sensitiveData',
      true,
      'Live POS ticked but sensitive data was No; treated as Yes',
    );
  }

  // Q9: If existing equipment status is unanswered, do not assume
  // equipment exists or does not exist. Use "notSure".
  if (isBlank(raw[QKEY.existingEquipment])) {
    raw[QKEY.existingEquipment] = 'notSure';

    ledger(
      ctx,
      'existingEquipment',
      'notSure',
      'Existing network equipment status not answered; treated as Not sure',
    );
  }

  // Q11: If connection type is unanswered, do not assume a provider
  // or technology. Use "notChecked".
  if (isBlank(raw[QKEY.connection])) {
    raw[QKEY.connection] = 'notChecked';

    ledger(
      ctx,
      'connection',
      'notChecked',
      'Internet connection type not answered; treated as Not checked',
    );
  }

// current questionnaire source. Q26-vs-Q23 is checked after enum mapping.

  // Step 7: Map raw values to the contract's exact enums.
  const existingEquipment = mapEnum(
    raw[QKEY.existingEquipment],
    QKEY.existingEquipment,
    {
      not_sure: 'notSure',
      'not sure': 'notSure',
      yes: 'yes',
      no: 'no',
    },
    ['yes', 'no', 'notSure'],
  );

  const existingCabling = mapEnum(
    raw[QKEY.existingCabling],
    QKEY.existingCabling,
    {},
    ['none', 'cat5e_cat6', 'fiber', 'unknownType'],
  );

  const connection = mapEnum(
    raw[QKEY.connection],
    QKEY.connection,
    {
      notchecked: 'notChecked',
      not_checked: 'notChecked',
      dsl_or_cellular: 'dslCellular',
      dslcellular: 'dslCellular',
      'dsl or cellular': 'dslCellular',
    },
    ['fiber', 'dslCellular', 'notChecked'],
  );

  const downtime = mapEnum(
    raw[QKEY.downtime],
    QKEY.downtime,
    {
      waititout: 'waitItOut',
      'wait it out': 'waitItOut',
      sameday: 'sameDay',
      'same day matters': 'sameDay',
      everyminute: 'everyMinute',
      'every minute matters': 'everyMinute',
    },
    ['waitItOut', 'sameDay', 'everyMinute'],
  );

  const housing = mapEnum(
    raw[QKEY.housing],
    QKEY.housing,
    {
      not_sure: 'notSure',
      notsure: 'notSure',
      'not sure': 'notSure',
    },
    ['closet', 'wall', 'notSure'],
  );

  const monthlyBudgetBand = mapEnum(
    raw[QKEY.budget],
    QKEY.budget,
    {
      under_15000: 'under15k',
      'under 15000': 'under15k',
      '15000_40000': '15to40k',
      '15000-40000': '15to40k',
      over_40000: 'over40k',
      'over 40000': 'over40k',
    },
    ['under15k', '15to40k', 'over40k'],
  );

  const itSupport = mapEnum(
    raw[QKEY.itSupport],
    QKEY.itSupport,
    {
      external: 'outside',
      in_house: 'inHouse',
      inhouse: 'inHouse',
    },
    ['none', 'outside', 'inHouse'],
  );

  const power = mapEnum(
    raw[QKEY.power],
    QKEY.power,
    {
      frequent_outages: 'frequent',
      frequent: 'frequent',
    },
    ['stable', 'frequent'],
  );

  const management = mapEnum(
    raw[QKEY.management],
    QKEY.management,
    {
      command_line: 'cli',
      commandline: 'cli',
      not_sure: 'notSure',
      notsure: 'notSure',
      'not sure': 'notSure',
    },
    ['dashboard', 'cli', 'notSure'],
  );
  // Q26 vs Q23: CLI management may be difficult without IT support.
  // Preserve both answers and record a soft-check warning in the ledger.
  if (management === 'cli' && itSupport === 'none') {
    ledger(
      ctx,
      'management',
      management,
      'CLI management selected without IT support; confirm someone can administer the network',
    );
  }
  const growthExpected = isYes(raw[QKEY.growthExpected]);

  const growthBandAliases = {
    '0_10': '0-10',
    '11_30': '11-30',
    '31_plus': '31+',
  };

  let growthBand = null;
  let newSites = 0;

  if (growthExpected) {
    growthBand = growthBandAliases[raw[QKEY.growthBand]] ?? raw[QKEY.growthBand];

    if (
      !['0-10', '11-30', '31+'].includes(growthBand)
    ) {
      fail(QKEY.growthBand, 'Invalid growth band.');
    }

    const siteAliases = {
      none: 0,
      one: 1,
      two_or_more: 2,
      twoOrMore: 2,
    };

    const rawNewSites = raw[QKEY.newSites];
    newSites = siteAliases[rawNewSites] ?? Number(rawNewSites);

    if (![0, 1, 2].includes(newSites)) {
      fail(QKEY.newSites, 'New site count must be 0, 1, or 2.');
    }
  }

  const out = {
    contractVersion: CONTRACT_VERSION,
    locations,
    floors,
    floorArea,
    roomsPerFloor,
    largeRooms,
    wiredPcs: countOrNo(raw[QKEY.wiredPcs], QKEY.wiredPcs),
    wifiDevices: countOrNo(raw[QKEY.wifiDevices], QKEY.wifiDevices),
    voipPhones,
    cameras,
    otherDevices,
    existingEquipment,
    existingCabling,
    internetMbps,
    connection,
    downtime,
    guestWifi: isYes(raw[QKEY.guestWifi]),
    sensitiveData,
    apps: appList,
    housing,
    monthlyBudgetBand,
    itSupport,
    power,
    growth: {
      expected: growthExpected,
      band: growthExpected ? growthBand : null,
      newSites: growthExpected ? newSites : 0,
    },
    management,
  };

  // Q3 is validated for SME scope but is not part of NormalizedInput v2.
  void headcount;

  validateNormalizedInput(out);
  return out;
}

module.exports = { normalize, QKEY };
