'use strict';
// Engine Fallbacks, consistency checks, and assumptions
// Algorithm Step 1
// Consumes: raw questionnaire answers
// Produces: NormalizedInput + ledger lines
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.
// Includes validation and conditional nulling (Step 1.1-1.2).

function normalize(rawAnswers, ctx) {
  throw new Error('NWP-ENGINE-002 not implemented');
}

module.exports = { normalize };
