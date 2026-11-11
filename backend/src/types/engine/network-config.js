'use strict';

const { ValidationError } = require('./contracts');

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function section(value, name) {
  if (!isRecord(value)) {
    throw new ValidationError(name, 'Must be an object.');
  }
  return value;
}

function booleanValue(value, field) {
  if (typeof value !== 'boolean') {
    throw new ValidationError(field, 'Must be a boolean.');
  }
  return value;
}

function toRawAnswers(configuration) {
  const project = section(configuration.project, 'project');
  const physicalSpace = section(configuration.physicalSpace, 'physicalSpace');
  const existingNetwork = section(configuration.existingNetwork, 'existingNetwork');
  const internet = section(configuration.internet, 'internet');
  const devices = section(configuration.devices, 'devices');
  const voip = section(devices.voip, 'devices.voip');
  const cameras = section(devices.ipCameras, 'devices.ipCameras');
  const otherDevices = section(devices.otherNetworkDevices, 'devices.otherNetworkDevices');
  const preferences = section(configuration.preferences, 'preferences');
  const applications = section(preferences.applications, 'preferences.applications');
  const business = section(configuration.businessContext, 'businessContext');
  const growth = business.growth === undefined
    ? {}
    : section(business.growth, 'businessContext.growth');
  const largeGroupRooms = section(
    physicalSpace.largeGroupRooms,
    'physicalSpace.largeGroupRooms',
  );
  if (!Number.isInteger(project.numberOfSites) || project.numberOfSites < 1) {
    throw new ValidationError('project.numberOfSites', 'Must be a positive integer.');
  }

  const hasLargeGroupRooms = booleanValue(
    largeGroupRooms.hasLargeGroupRooms,
    'physicalSpace.largeGroupRooms.hasLargeGroupRooms',
  );
  const voipEnabled = booleanValue(voip.enabled, 'devices.voip.enabled');
  const camerasEnabled = booleanValue(cameras.enabled, 'devices.ipCameras.enabled');
  const otherDevicesEnabled = booleanValue(
    otherDevices.enabled,
    'devices.otherNetworkDevices.enabled',
  );
  const guestWifi = booleanValue(preferences.guestWifi, 'preferences.guestWifi');
  const expectedGrowth = booleanValue(business.expectedGrowth, 'businessContext.expectedGrowth');
  if (largeGroupRooms.rooms !== undefined && !Array.isArray(largeGroupRooms.rooms)) {
    throw new ValidationError('physicalSpace.largeGroupRooms.rooms', 'Must be an array.');
  }
  if (otherDevicesEnabled &&
      (typeof otherDevices.description !== 'string' || !otherDevices.description.trim())) {
    throw new ValidationError(
      'devices.otherNetworkDevices.description',
      'Must be a non-empty string when other devices are enabled.',
    );
  }

  const applicationChoices = [
    ['videoConferencing', 'videoConferencing'],
    ['voipCalls', 'VoIP'],
    ['posPayment', 'Live POS'],
    ['cloudStorage', 'Cloud storage'],
    ['businessSoftware', 'Business software'],
    ['videoStreaming', 'streaming'],
    ['securityCameraViewing', 'Security camera viewing'],
    ['basicBrowsingEmail', 'Basic browsing/email'],
  ];
  applicationChoices.forEach(([key]) => {
    booleanValue(applications[key], `preferences.applications.${key}`);
  });
  const apps = applicationChoices
    .filter(([key]) => applications[key])
    .map(([, value]) => value);

  if (applications.other !== undefined && typeof applications.other !== 'string') {
    throw new ValidationError('preferences.applications.other', 'Must be a string when present.');
  }
  if (typeof applications.other === 'string' && applications.other.trim()) {
    apps.push(applications.other.trim());
  }
  if (apps.length === 0) apps.push('None of the above');

  const newSiteCount = {
    none: 0,
    one: 1,
    two_or_more: 2,
  }[growth.newSites];

  return {
    Q2: project.numberOfSites >= 2 ? 'two or more sites' : 'one',
    Q3: project.totalUsers,
    Q4: physicalSpace.numberOfFloors,
    Q5: physicalSpace.floorAreaPerFloor,
    Q6: physicalSpace.roomsPerFloor,
    Q7: hasLargeGroupRooms ? 'Yes' : 'No',
    Q8: largeGroupRooms.rooms?.map(({ floor, capacity }) => ({
      floor,
      occupancy: capacity,
    })) ?? [],
    Q9: {
      none: 'no',
      yes: 'yes',
      not_sure: 'not sure',
    }[existingNetwork.equipmentStatus],
    Q10b: {
      none_or_not_sure: 'unknownType',
      cat5e_or_cat6: 'cat5e_cat6',
      fiber: 'fiber',
    }[existingNetwork.existingCabling],
    Q10: internet.currentSpeedMbps,
    Q11: {
      fiber: 'fiber',
      dsl_or_cellular: 'dslCellular',
      not_checked: 'notChecked',
    }[internet.connectionType],
    Q12: {
      can_wait: 'waitItOut',
      same_day_matters: 'sameDay',
      every_minute_matters: 'everyMinute',
    }[internet.downtimeImpact],
    Q13: devices.wiredComputers,
    Q14: devices.wifiDevices,
    Q15: voipEnabled ? voip.phoneCount : 'No',
    Q16: camerasEnabled ? cameras.cameraCount : 'No',
    Q17: otherDevicesEnabled ? otherDevices.description : 'No',
    Q18: guestWifi ? 'Yes' : 'No',
    Q19: preferences.sensitiveData === 'not_sure'
      ? 'not sure'
      : preferences.sensitiveData,
    Q20: apps,
    Q21: {
      full_size_rack: 'closet',
      wall_cabinet: 'wall',
      not_sure: 'notSure',
    }[preferences.equipmentLocation],
    Q22: {
      under_15000: 'under15k',
      '15000_40000': '15to40k',
      over_40000: 'over40k',
    }[business.monthlyITBudget],
    Q23: {
      none: 'none',
      external: 'outside',
      in_house: 'inHouse',
    }[business.ITSupport],
    Q24: business.electricityReliability === 'frequent_outages'
      ? 'frequent'
      : business.electricityReliability,
    Q25: expectedGrowth ? 'Yes' : 'No',
    Q25a: expectedGrowth ? growth.headcountGrowth : undefined,
    Q25b: expectedGrowth ? newSiteCount : undefined,
    Q26: preferences.managementPreference === 'command_line'
      ? 'cli'
      : preferences.managementPreference,
  };
}

function normalizeRequestAnswers(payload) {
  if (!isRecord(payload)) {
    throw new ValidationError('payload', 'Must be an object.');
  }

  if ('Q2' in payload || 'Q3' in payload) return payload;
  if (isRecord(payload.rawAnswers)) return payload.rawAnswers;
  return toRawAnswers(payload);
}

module.exports = { toRawAnswers, normalizeRequestAnswers };
