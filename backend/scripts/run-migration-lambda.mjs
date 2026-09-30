import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

export const handler = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();

    // Resolves to /var/task/migrations/001_initial_schema.sql in the Lambda environment
    const sqlFilePath = path.join(process.cwd(), 'migrations', '001_initial_schema.sql');
    const migrationSql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Running 001_initial_schema.sql...');
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('COMMIT');

    console.log('Migration executed successfully!');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Migration completed successfully.' }),
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};