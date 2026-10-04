import "dotenv/config";
import { pool } from "../src/config/database";

async function main() {
  console.log("Starting device seeding...");

  const result = await pool.query("SELECT NOW()");

  console.log("Database connection successful.");
  console.log("Database time:", result.rows[0].now);
}

main()
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });