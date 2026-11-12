import { Pool } from "pg";
import fs from "fs";
import path from "path";

const caPath = path.resolve(process.cwd(), "global-bundle.pem");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DB_SSL === "true"
      ? {
          ca: fs.readFileSync(caPath).toString(),
          rejectUnauthorized: true,
        }
      : false,
});