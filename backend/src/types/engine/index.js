'use strict';

const { createCtx } = require('./ctx');
const { normalize } = require('./normalize');
const { normalizeRequestAnswers } = require('./network-config');
const { deriveNetworkRequirements } = require('./requirements/network');
const { wirelessRequirements } = require('./requirements/wireless');
const { deriveConnectivityRequirements } = require('./requirements/connectivity');
const { deriveDeviceRequirements } = require('./requirements/devices');
const { recommendPower } = require('./devices/power');
const { runEngine } = require('./orchestration');
const { loadEngineData } = require('./catalog-repository');
const { validateRequirements } = require('./contracts');

async function run(payload, dependencies = {}) {
  const ctx = createCtx();
  const normalizedInput = normalize(normalizeRequestAnswers(payload), ctx);

  const network = deriveNetworkRequirements(normalizedInput, ctx);
  const wireless = wirelessRequirements(normalizedInput, ctx);
  const connectivity = deriveConnectivityRequirements(normalizedInput, network, ctx);
  const devices = deriveDeviceRequirements(normalizedInput, ctx);
  const requirements = {
    ...network,
    wireless,
    ...connectivity,
    ...devices,
    ...recommendPower({ input: normalizedInput }),
  };
  validateRequirements(requirements);

  const engineData = await (dependencies.loadEngineData || loadEngineData)();
  return runEngine(
    normalizedInput,
    requirements,
    engineData.catalog,
    engineData.vendors,
    undefined,
    ctx,
  );
}

module.exports = { run };
