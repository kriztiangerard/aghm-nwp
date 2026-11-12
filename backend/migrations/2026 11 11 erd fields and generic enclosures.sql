-- NWP: add the missing ERD fields and seed the Generic vendor's racks and enclosures.
-- Safe to run more than once. Runs in one transaction: if anything fails, nothing is applied.
--
-- Part 1: missing fields (from erd-dictionary-todo.md, checked against the current database ERD)
--   vendor.management_modes          text[]  values 'dashboard' / 'cli'
--   switch_specifications.poe_standard  text  'af' | 'at' | 'bt3'  (highest standard the PoE ports supply)
--   ap_specifications.poe_standard      text  'af' | 'at' | 'bt3'  (minimum standard the AP needs)
-- Already in the database, so not touched here: pricing.is_stale, device.warranty_months, gateway_router_specifications.ha_capability,
-- firewall_specifications.idps_throughput_mbps. (migrations/pricing-is-stale.sql is therefore not needed.)
--
-- Part 2: the Generic vendor (name must equal GENERIC_VENDOR_NAME in params.js) and its wall cabinets and racks,
-- each with a manual market-average price in PHP. Pricing.distributor_id is NOT NULL, so the manual prices point at a placeholder
-- distributor ('Manual (market estimate)'); source_id stays NULL, which is what marks a price as manual.
--
-- Price basis (Philippine retail listings seen November 2026; round figures, ESTIMATE until the team confirms):
--   Wall 4U   3,000   Shopee 2,200 / 2,680 (OmniSupply) / 4,500 (Lazada, FYCLOUD)
--   Wall 6U   3,500   Shopee 3,400 (OmniSupply) / 3,990 / 1,859 (open frame)
--   Wall 9U   5,200   Lazada 5,199 / 6,099 (PRORACK); Shopee 4,700 / 4,810 / 5,000
--   Rack 12U  3,600   Lazada 3,599 (12U with door); Shopee 2,384. Low confidence: few 12U listings.
--   Rack 22U 21,900   Titinda 18,990; Lazada 24,800 (FYCLOUD)
--   Rack 36U 26,000   Titinda 25,990 (single source)
--   Rack 42U 40,000   Titinda 29,990; Benson 39,990; XBS Asia 40,000 / 50,390
-- Prices are for the cabinet only (no PDU, shelves or fans). Check them again before the demo; marketplace prices move.

BEGIN;

-- ---------------------------------------------------------------------------------------------------------------
-- Part 1: missing fields
-- ---------------------------------------------------------------------------------------------------------------

ALTER TABLE vendor ADD COLUMN IF NOT EXISTS management_modes text[];

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_management_modes_check') THEN
    ALTER TABLE vendor
      ADD CONSTRAINT vendor_management_modes_check
      CHECK (management_modes <@ ARRAY['dashboard', 'cli']::text[]);
  END IF;
END $$;

ALTER TABLE switch_specifications ADD COLUMN IF NOT EXISTS poe_standard text;
ALTER TABLE ap_specifications     ADD COLUMN IF NOT EXISTS poe_standard text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'switch_specifications_poe_standard_check') THEN
    ALTER TABLE switch_specifications
      ADD CONSTRAINT switch_specifications_poe_standard_check CHECK (poe_standard IN ('af', 'at', 'bt3'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ap_specifications_poe_standard_check') THEN
    ALTER TABLE ap_specifications
      ADD CONSTRAINT ap_specifications_poe_standard_check CHECK (poe_standard IN ('af', 'at', 'bt3'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Part 2: Generic vendor, wall cabinets and racks
-- ---------------------------------------------------------------------------------------------------------------

DO $$
DECLARE
  generic_name constant text := 'Generic';      -- must equal GENERIC_VENDOR_NAME in params.js
  manual_distributor constant text := 'Manual (market estimate)';
  v_vendor_id  integer;
  v_distributor_id integer;
  v_source_nullable text;
  v_device_id  integer;
  v_now        timestamp := LOCALTIMESTAMP;
  item         record;
BEGIN
  -- Manual means Pricing.source_id IS NULL. Stop early with a clear message if the column does not allow that.
  SELECT is_nullable INTO v_source_nullable FROM information_schema.columns
   WHERE table_schema = current_schema() AND table_name = 'pricing' AND column_name = 'source_id';
  IF v_source_nullable = 'NO' THEN
    RAISE EXCEPTION 'pricing.source_id is NOT NULL, so manual prices (source_id NULL) cannot be stored. Make it nullable or change the manual-price rule.';
  END IF;

  SELECT distributor_id INTO v_distributor_id FROM distributor WHERE name = manual_distributor;
  IF v_distributor_id IS NULL THEN
    INSERT INTO distributor (name) VALUES (manual_distributor) RETURNING distributor_id INTO v_distributor_id;
  END IF;

  SELECT vendor_id INTO v_vendor_id FROM vendor WHERE name = generic_name;
  IF v_vendor_id IS NULL THEN
    INSERT INTO vendor (name, need_controller, management_modes)
    VALUES (generic_name, false, ARRAY[]::text[])
    RETURNING vendor_id INTO v_vendor_id;
  END IF;

  FOR item IN
    SELECT * FROM (VALUES
      -- sku,           name,                                  form_factor, u,  price (PHP)
      ('GEN-WALL-4U',  'Generic 4U wall-mount network cabinet',  'wall',  4,  3000.00),
      ('GEN-WALL-6U',  'Generic 6U wall-mount network cabinet',  'wall',  6,  3500.00),
      ('GEN-WALL-9U',  'Generic 9U wall-mount network cabinet',  'wall',  9,  5200.00),
      ('GEN-RACK-12U', 'Generic 12U 19-inch rack cabinet',       'rack', 12,  3600.00),
      ('GEN-RACK-22U', 'Generic 22U 19-inch rack cabinet',       'rack', 22, 21900.00),
      ('GEN-RACK-36U', 'Generic 36U 19-inch rack cabinet',       'rack', 36, 26000.00),
      ('GEN-RACK-42U', 'Generic 42U 19-inch rack cabinet',       'rack', 42, 40000.00)
    ) AS t(sku, name, form_factor, u_capacity, price)
  LOOP
    IF EXISTS (SELECT 1 FROM device WHERE sku = item.sku) THEN
      CONTINUE;   -- already seeded
    END IF;

    INSERT INTO device (
      vendor_id, sku, price, price_updated_at, name, description,
      is_rack_mountable, u_height, lifecycle_status
    )
    VALUES (
      v_vendor_id, item.sku, item.price, v_now, item.name,
      'Generic placeholder cabinet priced at an approximate Philippine market average (PHP). Cabinet only.',
      false, 0, 'ACTIVE'
    )
    RETURNING device_id INTO v_device_id;

    -- load_capacity_kg, mount_type and has_ventilation stay NULL: no sourced values (unknown, not defaulted).
    INSERT INTO rack_specifications (device_id, form_factor, u_capacity)
    VALUES (v_device_id, item.form_factor, item.u_capacity);

    -- Manual price: source_id NULL, so the catalog export reports price_source = 'manual'. The distributor is the placeholder above.
    -- pricing_id is a plain integer in this database (no IDENTITY / serial in the ERD), so the next id is supplied here.
    INSERT INTO pricing (
      pricing_id, device_id, distributor_id, source_id, price, last_updated,
      is_stale, consecutive_failure_count, needs_manual_review
    )
    VALUES (
      (SELECT COALESCE(MAX(pricing_id), 0) + 1 FROM pricing),
      v_device_id, v_distributor_id, NULL, item.price, v_now, false, 0, false
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Vendor management modes: the six plan vendors still need values (VendorDescriptor.managementModes).
-- loadVendors() throws VENDOR_DATA_INCOMPLETE while any plan vendor has NULL, by design (no default is applied).
-- Fill them in from the vendors' real capabilities, then run this script again; it will then make the column NOT NULL.
-- Template (vendor_ids from the current table; the values are placeholders for the team to confirm):
--
--   UPDATE vendor SET management_modes = ARRAY['dashboard']        WHERE vendor_id = 1;  -- HPE Aruba Instant On
--   UPDATE vendor SET management_modes = ARRAY['dashboard','cli']  WHERE vendor_id = 2;  -- TP-Link Omada
--   UPDATE vendor SET management_modes = ARRAY['dashboard','cli']  WHERE vendor_id = 3;  -- Ubiquiti UniFi
--   UPDATE vendor SET management_modes = ARRAY['dashboard']        WHERE vendor_id = 4;  -- Ruijie
--   UPDATE vendor SET management_modes = ARRAY['dashboard']        WHERE vendor_id = 5;  -- Grandstream GWN Cloud
--   UPDATE vendor SET management_modes = ARRAY['dashboard','cli']  WHERE vendor_id = 6;  -- Cisco Business
-- ---------------------------------------------------------------------------------------------------------------

UPDATE vendor SET management_modes = ARRAY[]::text[] WHERE name = 'Generic' AND management_modes IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vendor WHERE management_modes IS NULL) THEN
    RAISE NOTICE 'vendor.management_modes is still NULL for: %. Fill them in (see the template above) and rerun to make the column NOT NULL.',
      (SELECT string_agg(name, ', ' ORDER BY vendor_id) FROM vendor WHERE management_modes IS NULL);
  ELSE
    ALTER TABLE vendor ALTER COLUMN management_modes SET NOT NULL;
  END IF;
END $$;

COMMIT;