BEGIN;

ALTER TABLE vendor
    ADD COLUMN IF NOT EXISTS management_modes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN vendor.management_modes IS
    'Engine-supported management modes. Populate only modes verified for each vendor.';

CREATE TABLE IF NOT EXISTS engine_catalog_sku (
    sku TEXT PRIMARY KEY,
    device_id INT NOT NULL UNIQUE REFERENCES device(device_id) ON DELETE CASCADE,
    catalog_sku JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT engine_catalog_sku_object CHECK (jsonb_typeof(catalog_sku) = 'object'),
    CONSTRAINT engine_catalog_sku_identity CHECK (catalog_sku ->> 'sku' = sku)
);

COMMENT ON TABLE engine_catalog_sku IS
    'Canonical CatalogSku JSON consumed by the recommendation engine. Keep fields aligned with contracts.js.';
COMMENT ON COLUMN engine_catalog_sku.catalog_sku IS
    'Must include every field required by the engine contract and the selector specs for the SKU category.';
COMMENT ON COLUMN engine_catalog_sku.is_active IS
    'Disable retired catalog records without deleting their source device data.';

-- TODO before production use: populate management_modes and canonical catalog_sku rows from verified catalog data.
-- Legacy catalog tables do not currently retain all selector-required fields, so no lossy backfill is performed here.

COMMIT;
