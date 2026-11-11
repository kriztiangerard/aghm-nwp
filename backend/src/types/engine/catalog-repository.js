'use strict';

const { GENERIC_VENDOR_NAME } = require('./params');
const { validateCatalogSku, validateVendorDescriptors } = require('./contracts');

async function loadEngineData(pool) {
  const database = pool || await require('./database').getPool();
  const [vendorResult, catalogResult] = await Promise.all([
    database.query(
      `SELECT name, need_controller AS "needController",
              management_modes AS "managementModes"
         FROM vendor
        WHERE name <> $1
        ORDER BY vendor_id`,
      [GENERIC_VENDOR_NAME],
    ),
    database.query(
      `SELECT catalog_sku AS sku
         FROM engine_catalog_sku
        WHERE is_active = TRUE
        ORDER BY sku`,
    ),
  ]);

  if (vendorResult.rows.length === 0) {
    throw new Error('No plan vendors are configured in the database.');
  }
  if (catalogResult.rows.length === 0) {
    throw new Error('No active engine catalog SKUs are configured in the database.');
  }

  const vendors = vendorResult.rows;
  const catalog = catalogResult.rows.map(({ sku }) =>
    typeof sku === 'string' ? JSON.parse(sku) : sku,
  );

  try {
    validateVendorDescriptors(vendors);
    catalog.forEach((sku, index) => {
      try {
        validateCatalogSku(sku);
      } catch (error) {
        error.message = `engine_catalog_sku[${index}]: ${error.message}`;
        throw error;
      }
    });
  } catch (error) {
    throw new Error(`Engine database data is invalid: ${error.message}`, {
      cause: error,
    });
  }

  return {
    vendors,
    catalog,
  };
}

module.exports = { loadEngineData };
