import type { Pool } from 'pg';
import type { DistributorSource } from './register';

export async function getActiveDistributorSources(
  pool: Pool,
): Promise<DistributorSource[]> {
  const result = await pool.query<DistributorSource>(
    `SELECT
       ps.source_id,
       ps.vendor_id,
       ps.distributor_id,
       ps.source_url,
       ps.is_active,
       ps.last_updated,
       d.name AS distributor_name,
       v.name AS vendor_name
     FROM pricing_source ps
     JOIN distributor d
       ON d.distributor_id = ps.distributor_id
     JOIN vendor v
       ON v.vendor_id = ps.vendor_id
     WHERE ps.is_active = TRUE
     ORDER BY ps.source_id`,
  );

  return result.rows;
}