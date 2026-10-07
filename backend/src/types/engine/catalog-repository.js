'use strict';
// Catalog repository and EOL/EOS status filter
// Algorithm Step 3.1
// Consumes: database
// Produces: CatalogSku[] with normalized status
// Rules: pure function (no I/O), constants from params.js, assumptions via ctx.
// The only file in the engine allowed to touch the database.

function loadCatalog(vendor) {
  throw new Error('NWP-ENGINE-016 not implemented');
}

module.exports = { loadCatalog };
