import type { Pool } from 'pg';
import type { DistributorSource } from './register';

export interface ActiveDistributorSource extends DistributorSource {
  vendor_name: string;
  distributor_name: string;
}

export async function getActiveDistributorSources(
  pool: Pool,
): Promise<ActiveDistributorSource[]> {
  const result = await pool.query<ActiveDistributorSource>(
    `SELECT
       ps.source_id,
       ps.vendor_id,
       ps.distributor_id,
       ps.source_url,
       ps.is_active,
       ps.last_updated,
       v.name AS vendor_name,
       d.name AS distributor_name
     FROM pricing_source ps
     INNER JOIN vendor v
       ON v.vendor_id = ps.vendor_id
     INNER JOIN distributor d
       ON d.distributor_id = ps.distributor_id
     WHERE ps.is_active = TRUE
       AND ps.source_url IS NOT NULL
       AND ps.source_url <> ''
     ORDER BY ps.source_id`,
  );

  return result.rows;
}