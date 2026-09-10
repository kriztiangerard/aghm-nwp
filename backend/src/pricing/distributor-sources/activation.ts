import type { Pool } from 'pg';
import type { DistributorSource } from './register';

/**
 * Flips a distributor source's is_active flag. Returns the updated row,
 * or null if no source exists with that id.
 */
export async function setDistributorSourceActive(
  pool: Pool,
  sourceId: number,
  isActive: boolean,
): Promise<DistributorSource | null> {
  const result = await pool.query(
    `UPDATE pricing_source
     SET is_active = $1, last_updated = NOW()
     WHERE source_id = $2
     RETURNING source_id, vendor_id, distributor_id, source_url, is_active, last_updated`,
    [isActive, sourceId],
  );
  return result.rowCount === 0 ? null : result.rows[0];
}

export const activateDistributorSource = (pool: Pool, sourceId: number) =>
  setDistributorSourceActive(pool, sourceId, true);

export const deactivateDistributorSource = (pool: Pool, sourceId: number) =>
  setDistributorSourceActive(pool, sourceId, false);
