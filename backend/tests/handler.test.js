'use strict';
// NWP-ENGINE-001: handler.test.js
//   - a valid payload returns plans, defaultVendor, ledger and errors
//   - a ValidationError returns status 400
// Plain node:test and node:assert, no dependencies. Run with: node --test

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ValidationError } = require('../src/types/engine/contracts');

// ---- Assumptions about src/engine/lambda-handler.js: change these if yours differs ----
const HANDLER_MODULE = '../src/types/engine/lambda-handler'; // exports { handler }
const PIPELINE_MODULE = '../src/types/engine/index'; // exports { run }, which the handler calls
// The event is an API Gateway proxy event: the payload is a JSON string in event.body.
const makeEvent = (payload) => ({ body: JSON.stringify(payload) });
// The response is { statusCode, body }, where body is a JSON string.
const readBody = (res) => (typeof res.body === 'string' ? JSON.parse(res.body) : res.body);

// The raw questionnaire shape is still on the Day-1 agenda, and until the normalize step
// (NWP-ENGINE-002) exists the pipeline ignores the payload's shape, so a fixture stands in.
const VALID_PAYLOAD = require(path.join(__dirname, 'fixtures', 'normalized-input', 'input1-baseline.json'));

// Loads a fresh copy of the handler with the pipeline's run() replaced by runImpl.
// This works whether the handler destructures `run` or calls `index.run(...)`, because
// the handler is loaded while the stand-in is in place and keeps that reference.
function loadHandlerWith(runImpl) {
  const indexPath = require.resolve(PIPELINE_MODULE);
  const handlerPath = require.resolve(HANDLER_MODULE);
  const savedIndex = require.cache[indexPath];
  delete require.cache[handlerPath];
  require.cache[indexPath] = { id: indexPath, filename: indexPath, loaded: true, exports: { run: runImpl } };
  try {
    return require(handlerPath).handler;
  } finally {
    delete require.cache[handlerPath];
    if (savedIndex) require.cache[indexPath] = savedIndex;
    else delete require.cache[indexPath];
  }
}

test('a valid payload returns plans, defaultVendor, ledger and errors', async () => {
  const { handler } = require(HANDLER_MODULE);
  const res = await handler(makeEvent(VALID_PAYLOAD));
  assert.equal(res.statusCode, 200);

  const body = readBody(res);
  for (const key of ['plans', 'defaultVendor', 'ledger', 'errors']) {
    assert.ok(Object.hasOwn(body, key), `the response body is missing "${key}"`);
  }
  assert.ok(Array.isArray(body.plans), 'plans should be an array');
  assert.ok(Array.isArray(body.ledger), 'ledger should be an array');
  assert.ok(Array.isArray(body.errors), 'errors should be an array');
});

// The 400 test throws from a stand-in pipeline step, not the real one. 
// Once the normalize step (002) exists, add a test that sends a bad payload through the real pipeline.

test('a ValidationError thrown by the pipeline returns status 400', async () => {
  const handler = loadHandlerWith(() => {
    throw new ValidationError('floors', 'Must be a positive integer.');
  });
  const res = await handler(makeEvent(VALID_PAYLOAD));
  assert.equal(res.statusCode, 400);
});

test('a ValidationError from an async pipeline step also returns status 400', async () => {
  const handler = loadHandlerWith(async () => {
    throw new ValidationError('floors', 'Must be a positive integer.');
  });
  const res = await handler(makeEvent(VALID_PAYLOAD));
  assert.equal(res.statusCode, 400);
});