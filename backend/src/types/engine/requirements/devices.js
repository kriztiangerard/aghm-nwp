'use strict';

const params = require('../params.js');
const { addFlag } = require('../ctx.js');

// Wired & Infrastructure Requirement Calculation
// Algorithm Step 2.7-2.9
// Consumes: NormalizedInput
// Produces: Requirements: backbone, edgePorts, poeEdgePorts, otherPoeLoadW, flags
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

function deriveDeviceRequirements(input, ctx) {
  const backbone =
    input.floors > 1 || input.existingCabling === 'fiber'
      ? 'fiber'
      : 'copper';

  const horizontalCablingOptions = ['Cat5e', 'Cat6', 'Cat6a'];

  const poeEdgePorts =
    input.voipPhones +
    input.cameras;

  const otherPoeLoadW =
    poeEdgePorts * params.POE_CLASS_W.af;

  if (input.existingEquipment === 'yes') {
    addFlag(
      ctx,
      'existing-equipment-advisory',
      'Existing equipment reported; BOM remains greenfield and existing equipment should be inspected for possible reuse.',
    );
  }

  if (input.otherDevices.hasOtherDevices) {
    addFlag(
      ctx,
      'other-devices-not-sized',
      'Other devices reported but not sized.',
    );
  }

  return {
    backbone,
    horizontalCablingOptions,
    cat5eFlag: false,
    edgePorts:
      input.wiredPcs +
      input.voipPhones +
      input.cameras,
    poeEdgePorts,
    otherPoeLoadW,
    flags: ctx.flags,
  };
}

module.exports = { deriveDeviceRequirements };