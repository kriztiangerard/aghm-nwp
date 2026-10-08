'use strict';

const params = require('../params.js');
const { addFlag } = require('../ctx.js');

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
    .filter((device) => {
      if (params.Q17_POE_DEFAULTS[device.cls] !== undefined) {
        return params.Q17_POE_DEFAULTS[device.cls];
      }

      return device.poe === true || device.poe === 'not_sure';
    })
    .reduce((total, device) => total + device.count, 0);

  const otherPoeLoadW =
    poeEdgePorts * params.POE_CLASS_W.af;

  if (input.existingEquipment === 'yes') {
    addFlag(
      ctx,
      'existing-equipment-advisory',
      'Existing equipment reported; BOM remains greenfield and existing equipment should be inspected for possible reuse.',
    );
  }

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
    flags: ctx.flags,
  };
}

module.exports = { deriveDeviceRequirements };