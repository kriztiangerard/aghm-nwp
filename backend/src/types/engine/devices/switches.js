'use strict';
// Switch selection per floor
// Algorithm Step 3.5
// Consumes: Requirements + PoE budget + select()
// Produces: SelectionResult[] (access switches, core switch)
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

function selectSwitches({ catalog, vendor, requirements, poeBudget, plan, cePick, ctx }) {
  throw new Error('NWP-ENGINE-012 not implemented');
}

module.exports = { selectSwitches };
