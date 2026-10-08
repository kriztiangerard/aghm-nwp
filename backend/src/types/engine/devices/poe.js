'use strict';
// PoE budget per vendor and plan
// Algorithm Step 3.4
// Consumes: Requirements + chosen AP
// Produces: { perFloor: [{loadW, budgetW}], apDrawW }
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.

function computePoeBudget({ requirements, apSelection, plan, ctx }) {
  throw new Error('NWP-ENGINE-011 not implemented');
}

module.exports = { computePoeBudget };
