'use strict';
// Access point selection with generation fallback
// Algorithm Step 3.3
// Consumes: Requirements.wireless + select()
// Produces: SelectionResult (access points) + AP max draw
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

function selectAccessPoints({ catalog, vendor, requirements, plan, cePick, ctx }) {
  throw new Error('NWP-ENGINE-010 not implemented');
}

module.exports = { selectAccessPoints };
