
'use strict';

const PARAMS = require('../params.js');
const { addLedger, addFlag } = require('../ctx.js');

function ceilDiv(numerator, denominator) {
  if (denominator <= 0) {
    throw new Error('Denominator must be greater than zero.');
  }

  return Math.ceil(numerator / denominator);
}

function distributeEvenly(total, floorCount) {
  const result = Array(floorCount).fill(0);
  if (floorCount === 0) return result;

  const base = Math.floor(total / floorCount);
  const remainder = total % floorCount;

  for (let i = 0; i < floorCount; i++) {
    result[i] = base + (i < remainder ? 1 : 0);
  }

  return result;
}

function wirelessRequirements(input, ctx, standardOverride) {
  if (!input || !Array.isArray(input.floorArea) || input.floorArea.length === 0) {
    throw new Error('floorArea must contain at least one floor.');
  }

  const floorCount = input.floorArea.length;

  if (input.floors !== floorCount) {
    throw new Error('floors must match floorArea.length.');
  }

  const apps = Array.isArray(input.apps) ? input.apps : [];
  const standard = standardOverride || (
    apps.some(app => ['videoConferencing', 'streaming'].includes(app))
      ? '6E'
      : '6'
  );

  if (!Object.prototype.hasOwnProperty.call(PARAMS.CEILING, standard)) {
    throw new Error(`Unsupported Wi-Fi standard: ${standard}`);
  }

  const ceiling = PARAMS.CEILING[standard];

  const coveragePerFloor = input.floorArea.map(area => {
    if (!Number.isFinite(area) || area < 0) {
      throw new Error('Each floor area must be a non-negative number.');
    }
    return Math.max(1, ceilDiv(area, PARAMS.M2_PER_AP));
  });

  const coverageTotal = coveragePerFloor.reduce((sum, count) => sum + count, 0);
  const ceRoomPerFloor = Array(floorCount).fill(0);
  const hpRoomPerFloor = Array(floorCount).fill(0);
  let largeRoomOccupants = 0;

  const growthBand = input.growth?.expected ? input.growth.band : null;

  if (growthBand && !Object.prototype.hasOwnProperty.call(PARAMS.G_BY_BAND, growthBand)) {
    throw new Error(`Unsupported growth band: ${growthBand}`);
  }

  // Convert percentages to integer ratios to avoid floating-point rounding issues.
  const growthNumerator = Math.round(
    (1 + (growthBand ? PARAMS.G_BY_BAND[growthBand] : 0)) * 100
  );
  const utilizationNumerator = Math.round(PARAMS.U_HP * 100);

  const largeRooms = Array.isArray(input.largeRooms) ? input.largeRooms : [];

  for (const room of largeRooms) {
    if (
      !room ||
      !Number.isInteger(room.floor) ||
      room.floor < 1 ||
      room.floor > floorCount ||
      !Number.isFinite(room.occupancy) ||
      room.occupancy < 0
    ) {
      throw new Error('Each large room must have a valid floor and occupancy.');
    }

    if (room.occupancy > ceiling * PARAMS.RT_LARGE) {
      largeRoomOccupants += room.occupancy;

      ceRoomPerFloor[room.floor - 1] += ceilDiv(room.occupancy, ceiling);

      hpRoomPerFloor[room.floor - 1] += ceilDiv(
        room.occupancy * growthNumerator,
        ceiling * utilizationNumerator
      );
    }
  }

  const totalUsers = Number.isFinite(input.wifiDevices) && input.wifiDevices >= 0
    ? input.wifiDevices
    : 0;

  const generalUsers = Math.max(0, totalUsers - largeRoomOccupants);

  const ceCapacity = ceilDiv(generalUsers, ceiling);
  const ceBase = Math.max(coverageTotal, ceCapacity);

  const hpCapacity = ceilDiv(
    generalUsers * growthNumerator,
    ceiling * utilizationNumerator
  );
  const hpBase = Math.max(coverageTotal, hpCapacity);

  const ceRoomTotal = ceRoomPerFloor.reduce((sum, count) => sum + count, 0);
  const hpRoomTotal = hpRoomPerFloor.reduce((sum, count) => sum + count, 0);

  const ceTotal = ceBase + ceRoomTotal;
  const hpTotal = hpBase + hpRoomTotal;

  function makePlan(total, roomCounts) {
    const floorBase = coveragePerFloor.map(
      (coverage, index) => coverage + roomCounts[index]
    );
    const baseTotal = floorBase.reduce((sum, count) => sum + count, 0);
    const extras = distributeEvenly(Math.max(0, total - baseTotal), floorCount);

    return {
      total,
      perFloor: floorBase.map((count, index) => count + extras[index])
    };
  }

  const result = {
    standard,
    ceiling,
    CE: makePlan(ceTotal, ceRoomPerFloor),
    HP: makePlan(hpTotal, hpRoomPerFloor)
  };

  if (ctx) {
    addLedger(ctx, 'wireless.standard', standard,
      'Selected from required applications or explicit override.');
    addLedger(ctx, 'wireless.coveragePerFloor', coveragePerFloor,
      'Each floor receives at least one coverage AP.');
    addLedger(ctx, 'wireless.largeRoomOccupants', largeRoomOccupants,
      'Qualifying large-room occupants are excluded from general capacity.');
    addLedger(ctx, 'wireless.growth', growthNumerator / 100 - 1,
      'Growth factor from the selected growth band.');

    if (largeRoomOccupants > totalUsers) {
      addFlag(ctx, 'LARGE_ROOM_OCCUPANCY_EXCEEDS_WIFI_DEVICES',
        'Large-room occupancy exceeds the supplied Wi-Fi device count.');
    }
  }

  return result;
}

module.exports = { wirelessRequirements };
