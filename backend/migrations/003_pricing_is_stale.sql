-- NWP-ENGINE-006: staleness marker for Pricing rows (decision: an explicit column, option A).
-- The Price updater owns this column:
--   * set is_stale = true on a device's Pricing rows when every configured distributor fails in a sync cycle
--     (the last verified price is kept, per the manuscript);
--   * set is_stale = false whenever a row is refreshed by a successful sync or updated manually by an administrator.
-- Pricing.source_id IS NULL marks a manually entered price; a non-null source_id marks a synchronized one.
-- The catalog repository reads both. Table name inferred from the ERD; adjust if the real name differs.

ALTER TABLE pricing ADD COLUMN IF NOT EXISTS is_stale boolean NOT NULL DEFAULT false;