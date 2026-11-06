'use strict';

// NWP-ENGINE-001 — pipeline runner.
// NWP-ENGINE-014 (stretch) extends this into the vendor x plan loop.

const { createCtx } = require('./ctx');
const { normalize } = require('./normalize');

function run(rawAnswers) {
  const ctx = createCtx();

  try {
    const normalizedInput = normalize(rawAnswers, ctx);

    return {
      normalizedInput,
      plans: [],
      defaultVendor: null,
      ledger: ctx.ledger,
      errors: [],
    };
  } catch (error) {
    return {
      normalizedInput: null,
      plans: [],
      defaultVendor: null,
      ledger: ctx.ledger,
      errors: [
        {
          message: error.message,
          name: error.name,
        },
      ],
    };
  }
}

module.exports = { run };
