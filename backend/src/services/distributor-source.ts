import { pool } from "../db/client";

export interface DistributorSourceInput {
  vendorName: string;
  distributorName: string;
  sourceUrl: string;
  isActive?: boolean;
}

export interface DistributorSource {
  sourceId: number;
  vendorName: string;
  distributorName: string;
  sourceUrl: string;
  isActive: boolean;
}

function validateDistributorSource(input: DistributorSourceInput): void {
  if (!input.vendorName?.trim()) {
    throw new Error("Vendor name is required.");
  }

  if (!input.distributorName?.trim()) {
    throw new Error("Distributor name is required.");
  }

  if (!input.sourceUrl?.trim()) {
    throw new Error("Source URL is required.");
  }

  try {
    new URL(input.sourceUrl);
  } catch {
    throw new Error("Source URL must be a valid URL.");
  }
}

export async function registerDistributorSource(
  input: DistributorSourceInput
): Promise<DistributorSource> {
  validateDistributorSource(input);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const vendorResult = await client.query(
      `
      INSERT INTO vendor (vendor_id, name, need_controller)
      VALUES (
        (SELECT COALESCE(MAX(vendor_id), 0) + 1 FROM vendor),
        $1,
        FALSE
      )
      ON CONFLICT (name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING vendor_id, name
      `,
      [input.vendorName.trim()]
    );

    const vendor = vendorResult.rows[0];

    const distributorResult = await client.query(
      `
      INSERT INTO distributor (distributor_id, name)
      VALUES (
        (SELECT COALESCE(MAX(distributor_id), 0) + 1 FROM distributor),
        $1
      )
      ON CONFLICT DO NOTHING
      RETURNING distributor_id, name
      `,
      [input.distributorName.trim()]
    );

    let distributor = distributorResult.rows[0];

    if (!distributor) {
      const existingDistributor = await client.query(
        `
        SELECT distributor_id, name
        FROM distributor
        WHERE name = $1
        `,
        [input.distributorName.trim()]
      );

      distributor = existingDistributor.rows[0];
    }

    const sourceResult = await client.query(
      `
      INSERT INTO pricing_source (
        source_id,
        vendor_id,
        distributor_id,
        source_url,
        is_active
      )
      VALUES (
        (SELECT COALESCE(MAX(source_id), 0) + 1 FROM pricing_source),
        $1,
        $2,
        $3,
        $4
      )
      RETURNING source_id, source_url, is_active
      `,
      [
        vendor.vendor_id,
        distributor.distributor_id,
        input.sourceUrl.trim(),
        input.isActive ?? true,
      ]
    );

    await client.query("COMMIT");

    return {
      sourceId: sourceResult.rows[0].source_id,
      vendorName: vendor.name,
      distributorName: distributor.name,
      sourceUrl: sourceResult.rows[0].source_url,
      isActive: sourceResult.rows[0].is_active,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setDistributorSourceActive(
  sourceId: number,
  isActive: boolean
): Promise<void> {
  await pool.query(
    `
    UPDATE pricing_source
    SET is_active = $1,
        last_updated = NOW()
    WHERE source_id = $2
    `,
    [isActive, sourceId]
  );
}

export async function getActiveDistributorSources(): Promise<
  DistributorSource[]
> {
  const result = await pool.query(
    `
    SELECT
      ps.source_id,
      v.name AS vendor_name,
      d.name AS distributor_name,
      ps.source_url,
      ps.is_active
    FROM pricing_source ps
    JOIN vendor v
      ON v.vendor_id = ps.vendor_id
    JOIN distributor d
      ON d.distributor_id = ps.distributor_id
    WHERE ps.is_active = TRUE
    ORDER BY ps.source_id
    `
  );

  return result.rows.map((row) => ({
    sourceId: row.source_id,
    vendorName: row.vendor_name,
    distributorName: row.distributor_name,
    sourceUrl: row.source_url,
    isActive: row.is_active,
  }));
}