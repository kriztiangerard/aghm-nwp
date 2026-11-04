
import "dotenv/config";
import { Client } from "pg";
import productLines from "../db/catalog/ubiquiti/unifi-productlines.json";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (productLines.length !== 21) {
    throw new Error(
      `Expected 21 product lines, found ${productLines.length}`
    );
  }

  for (const line of productLines) {
    if (
      line.vendor_id !== 3 ||
      !line.category ||
      !line.name ||
      !Number.isInteger(line.line_rank) ||
      !line.source_note
    ) {
      throw new Error(`Invalid product line record: ${line.name}`);
    }
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  let inserted = 0;
  let skipped = 0;
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    for (const line of productLines) {
      const result = await client.query(
        `INSERT INTO product_line
          (vendor_id, category, name, line_rank, source_note)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (vendor_id, category, name) DO NOTHING
         RETURNING product_line_id`,
        [
          line.vendor_id,
          line.category,
          line.name,
          line.line_rank,
          line.source_note,
        ]
      );

      if (result.rowCount && result.rowCount > 0) {
        inserted++;
        console.log(`INSERTED: ${line.name}`);
      } else {
        skipped++;
        console.log(`SKIPPED: ${line.name} (already exists)`);
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;

    console.log("\n========== INSERTION SUMMARY ==========");
    console.log(`Total records: ${productLines.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped: ${skipped}`);
    console.log("=======================================");

    const verification = await client.query(
      `SELECT product_line_id, vendor_id, category, name, line_rank
       FROM product_line
       WHERE vendor_id = 3
       ORDER BY category, line_rank`
    );

    console.log("\n========== DATABASE VERIFICATION ==========");
    console.table(verification.rows);
    console.log(`Total UniFi product lines in DB: ${verification.rowCount}`);
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    "Product line insertion failed:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
