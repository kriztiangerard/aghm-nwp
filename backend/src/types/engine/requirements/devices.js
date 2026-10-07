'use strict';

const params = require('../params.js');

// Wired & Infrastructure Requirement Calculation
// Algorithm Step 2.7-2.9
// Consumes: NormalizedInput
// Produces: Requirements: backbone, cat5eFlag, edgePorts, poeEdgePorts, otherPoeLoadW, flags
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

function deriveDeviceRequirements(input, ctx) {
  const backbone =
    input.floors > 1 || input.existingCabling === 'fiber'
      ? 'fiber'
      : 'copper';

  const poeEdgePorts =
  input.voipPhones +
  input.cameras +
  input.otherDevices
    .filter((device) => device.poe === true)
    .reduce((total, device) => total + device.count, 0);

const otherPoeLoadW =
  poeEdgePorts * params.POE_CLASS_W.af;

  return {
    backbone,
    cat5eFlag: false,
    edgePorts:
  input.wiredPcs +
  input.voipPhones +
  input.cameras +
  input.otherDevices.reduce(
    (total, device) => total + device.count,
    0,
  ),
    poeEdgePorts,
    otherPoeLoadW,
    flags: [],
  };
}

module.exports = { deriveDeviceRequirements };