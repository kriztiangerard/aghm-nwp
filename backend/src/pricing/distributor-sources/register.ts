import type { Pool } from 'pg';
import { validateDistributorSourceInput, RegisterDistributorSourceInput } from './validate';

export interface DistributorSource {
  source_id: number;
  vendor_id: number;
  distributor_id: number;
  source_url: string;
  is_active: boolean;
  last_updated: string;
}

export interface RegisterResult {
  success: boolean;
  source?: DistributorSource;
  errors?: string[];
}

/**
 * Registers an approved distributor source (Pricing_source row).
 * Vendor and Distributor are expected to already exist (predefined
 * catalog) — this does not create them.
 */
export async function registerDistributorSource(
  pool: Pool,
  input: RegisterDistributorSourceInput,
): Promise<RegisterResult> {
  const validation = validateDistributorSourceInput(input);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const vendor = await pool.query(
    'SELECT vendor_id FROM vendor WHERE name = $1',
    [input.vendorName],
  );
  if (vendor.rowCount === 0) {
    return { success: false, errors: [`Unknown vendor "${input.vendorName}"`] };
  }

  const distributor = await pool.query(
    'SELECT distributor_id FROM distributor WHERE name = $1',
    [input.distributorName],
  );
  if (distributor.rowCount === 0) {
    return { success: false, errors: [`Unknown distributor "${input.distributorName}"`] };
  }

  const inserted = await pool.query(
    `INSERT INTO pricing_source (vendor_id, distributor_id, source_url, is_active)
     VALUES ($1, $2, $3, TRUE)
     RETURNING source_id, vendor_id, distributor_id, source_url, is_active, last_updated`,
    [vendor.rows[0].vendor_id, distributor.rows[0].distributor_id, input.sourceUrl],
  );

  return { success: true, source: inserted.rows[0] };
}
