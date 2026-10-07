'use strict';
// Selection helper (price ranking and product-line step-up)
// Algorithm Step 3, selection helper
// Consumes: catalog rows (plain data)
// Produces: SelectionResult
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.
// constraints is a predicate: sku => boolean.

function select({ catalog, vendor, category, constraints, plan, cePick, ctx }) {
  throw new Error('NWP-ENGINE-007 not implemented');
}

module.exports = { select };
