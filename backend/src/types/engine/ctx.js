'use strict';
// Carried through every function so each one can record assumptions and gaps.
//   ledger: assumptions and defaults shown to the user   {field, valueUsed, reason}
//   flags:  advisories and notes                         {code, message}
//   unmet:  requirements a vendor could not satisfy      {category, vendor, reason}

function createCtx() {
  return { ledger: [], flags: [], unmet: [] };
}
const addLedger = (ctx, field, valueUsed, reason) => ctx.ledger.push({ field, valueUsed, reason });
const addFlag = (ctx, code, message) => ctx.flags.push({ code, message });
const addUnmet = (ctx, category, vendor, reason) => ctx.unmet.push({ category, vendor, reason });

class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

module.exports = { createCtx, addLedger, addFlag, addUnmet, ValidationError };
