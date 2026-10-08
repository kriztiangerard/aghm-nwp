'use strict';
// Gateway selection
// Algorithm Step 3.2
// Consumes: Requirements + select()
// Produces: SelectionResult (gateway)
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

function selectGateway({ catalog, vendor, requirements, plan, cePick, ctx }) {
  throw new Error('NWP-ENGINE-008 not implemented');
}

module.exports = { selectGateway };
