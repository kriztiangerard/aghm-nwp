'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const rawAnswers = require('../fixtures/raw-answers/input1-baseline.json');
const catalogSnapshot = require('../fixtures/catalogs/omada.snapshot.json');
const { flatRowToCatalogSku } = require('../../src/types/engine/catalog-mapping');
const { run } = require('../../src/types/engine');
const { validateEngineResult } = require('../../src/types/engine/contracts');
const { finalizeEngineResult } = require('../../src/types/engine/steps/assemble');

const engineData = {
  catalog: catalogSnapshot.skus.map((row) => flatRowToCatalogSku(row).sku),
  vendors: [{
    name: 'TP-Link Omada',
    needController: false,
    managementModes: ['dashboard'],
  }],
};

test('run normalizes questionnaire answers, derives requirements, and invokes orchestration', async () => {
  const now = new Date('2026-11-12T00:00:00.000Z');
  let loadOptions;
  const result = await run(rawAnswers, {
    now,
    loadEngineData: async (options) => {
      loadOptions = options;
      return engineData;
    },
  });

  assert.equal(loadOptions.now, now);
  assert.equal(result.requirements.wireless.CE.total > 0, true);
  assert.equal(result.requirements.vpnTunnelsNeeded.CE, 0);
  assert.equal(result.requirements.vpnTunnelsNeeded.HP, 2);
  assert.equal(result.plans.length, 2);
  assert.deepEqual(result.plans.map(({ planType }) => planType), ['CE', 'HP']);
  assert.equal(validateEngineResult(finalizeEngineResult(result, new Date().toISOString())), true);
});

test('run supplies a lifecycle date to the catalog loader by default', async () => {
  let loadOptions;
  await run(rawAnswers, {
    loadEngineData: async (options) => {
      loadOptions = options;
      return engineData;
    },
  });

  assert.ok(loadOptions.now instanceof Date);
});

test('run accepts the frontend NetworkConfiguration request shape', async () => {
  const configuration = {
    project: { name: 'Sample', numberOfSites: 1, totalUsers: 25 },
    physicalSpace: {
      numberOfFloors: 1,
      floorAreaPerFloor: 180,
      roomsPerFloor: 8,
      largeGroupRooms: { hasLargeGroupRooms: false },
    },
    existingNetwork: {
      equipmentStatus: 'none',
      existingCabling: 'none_or_not_sure',
    },
    internet: {
      currentSpeedMbps: 200,
      connectionType: 'fiber',
      downtimeImpact: 'same_day_matters',
    },
    devices: {
      wiredComputers: 12,
      wifiDevices: 30,
      voip: { enabled: false },
      ipCameras: { enabled: false },
      otherNetworkDevices: { enabled: false },
    },
    preferences: {
      guestWifi: true,
      sensitiveData: 'no',
      applications: {
        videoConferencing: true,
        voipCalls: false,
        posPayment: false,
        cloudStorage: false,
        businessSoftware: false,
        videoStreaming: false,
        securityCameraViewing: false,
        basicBrowsingEmail: false,
      },
      equipmentLocation: 'wall_cabinet',
      managementPreference: 'dashboard',
    },
    businessContext: {
      monthlyITBudget: 'under_15000',
      ITSupport: 'external',
      electricityReliability: 'stable',
      expectedGrowth: false,
    },
  };

  const result = await run(configuration, {
    loadEngineData: async () => engineData,
  });

  assert.equal(result.requirements.wireless.standard, '6E');
  assert.equal(result.requirements.edgePorts, 12);
  assert.equal(result.plans.length, 2);
});
