'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { Pool } = require('pg');

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

let poolPromise;
let databaseUrlPromise;

async function getDatabaseUrl() {
  if (!databaseUrlPromise) {
    const request = (async () => {
      const secretArn = process.env.DATABASE_SECRET_ARN;
      if (!secretArn) {
        throw new Error('DATABASE_SECRET_ARN is not configured.');
      }

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

      return new Pool({
        connectionString: withoutUrlSslOptions(connectionString),
        ssl,
        max: 2,
      });
    })();
    poolPromise = creation.catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }

  return poolPromise;
}

module.exports = { getPool };
