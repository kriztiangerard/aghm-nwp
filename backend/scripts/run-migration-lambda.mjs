// REQUIRES BUNDLING WITH ESBUILD BEFORE DEPLOYMENT TO LAMBDA
// NOT INCLUDED IN CDK STACK, DEPLOY MANUALLY VIA CONSOLE
import pg from 'pg';
// esbuild can import the .sql file directly as a raw string
import migrationSql from '../migrations/001_initial_schema.sql';

const { Client } = pg;

export const handler = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();

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