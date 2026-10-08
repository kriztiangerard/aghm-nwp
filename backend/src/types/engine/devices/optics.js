'use strict';
// Optics (SFP/SFP+)
// Algorithm Step 3.6
// Consumes: switch selection
// Produces: SelectionResult (optics)
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

function selectOptics({ catalog, vendor, requirements, switches, plan, ctx }) {
  throw new Error('NWP-ENGINE-013 not implemented');
}

module.exports = { selectOptics };
