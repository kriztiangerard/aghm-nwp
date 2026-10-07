'use strict';
// NWP-ENGINE-001 (skeleton) — pipeline runner.
// NWP-ENGINE-014 (stretch) extends this into the vendor x plan loop.
const { createCtx } = require('./ctx');

function run(rawAnswers) {
  const ctx = createCtx();
  // Pipeline order (see the chronological specification):
  //   1 normalize -> 2 requirements -> 3 per-vendor/plan selection -> 4 default vendor -> 5 outputs
  return { plans: [], defaultVendor: null, ledger: ctx.ledger, errors: [] };
}

module.exports = { run };
