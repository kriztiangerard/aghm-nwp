'use strict';

// The engine's only connection module: the only file that imports `pg`, and catalog-repository.js is its only caller.
// Credentials: DATABASE_URL when set (local runs), otherwise the Secrets Manager secret named by DATABASE_SECRET_ARN (Lambda).
// SSL: set DB_SSL=true to verify RDS against global-bundle.pem (sslmode / sslrootcert in the URL are ignored).

const fs = require('node:fs');
const path = require('node:path');
const { Pool, types } = require('pg');

function readCaBundle() {
  try {
    return require('../../../../global-bundle.pem');
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return fs.readFileSync(
      path.resolve(__dirname, '../../../../global-bundle.pem'),
      'utf8',
    );
  }
}

// DECIMAL columns come back as strings by default; DATE columns as local-time Date objects. The contract wants numbers
// and 'YYYY-MM-DD' strings.
const typeParsers = {
  getTypeParser(oid, format) {
    if (oid === 1700) return (value) => Number(value);   // numeric
    if (oid === 1082) return (value) => value;           // date, kept as 'YYYY-MM-DD'
    return types.getTypeParser(oid, format);
  },
};

let poolPromise;
let databaseUrlPromise;

async function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  if (!databaseUrlPromise) {
    const request = (async () => {
      const secretArn = process.env.DATABASE_SECRET_ARN;
      if (!secretArn) {
        throw new Error('Database is not configured: set DATABASE_URL (local) or DATABASE_SECRET_ARN (Lambda).');
      }

      // Loaded only when needed, so local runs and tests do not need the AWS SDK.
      const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
      const secretsManager = new SecretsManagerClient({});
      const response = await secretsManager.send(
        new GetSecretValueCommand({ SecretId: secretArn }),
      );
      if (typeof response.SecretString !== 'string' || response.SecretString.length === 0) {
        throw new Error('The database secret must contain a non-empty URL string.');
      }
      return response.SecretString;
    })();
    databaseUrlPromise = request.catch((error) => {
      databaseUrlPromise = undefined;
      throw error;
    });
  }

  return databaseUrlPromise;
}

function withoutUrlSslOptions(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');
  return url.toString();
}

async function getPool() {
  if (!poolPromise) {
    const creation = (async () => {
      const connectionString = await getDatabaseUrl();
      const ssl = process.env.DB_SSL === 'true'
        ? {
            ca: readCaBundle(),
            rejectUnauthorized: true,
          }
        : false;

      const pool = new Pool({
        connectionString: withoutUrlSslOptions(connectionString),
        ssl,
        max: 2,
        connectionTimeoutMillis: 5000, // fail fast instead of hanging inside the VPC
        types: typeParsers,
      });
      // An idle client can be dropped by the network while Lambda is frozen; log it instead of crashing the process.
      pool.on('error', (error) => console.error('database: idle connection error', error.message));
      return pool;
    })();
    poolPromise = creation.catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }

  return poolPromise;
}

// For scripts and local runs. Not needed in the Lambda handler.
async function closePool() {
  if (!poolPromise) return;
  const closing = poolPromise;
  poolPromise = undefined;
  try { await (await closing).end(); } catch (error) { /* pool creation had failed; nothing to close */ }
}

module.exports = { getPool, closePool };