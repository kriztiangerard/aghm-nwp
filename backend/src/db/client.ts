import { Pool } from 'pg';

// Reused across calls so we don't open a new connection every time.
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // SSL connection for Aurora PostgreSQL
    });
  }
  return pool;
}
