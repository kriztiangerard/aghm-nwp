'use strict';
// NWP-ENGINE-001 — thin Lambda handler. Keep it thin: parse, call run(), return JSON.
// Handler string for CDK: "lambda-handler.handler" (asset root = backend/src/engine).
const { run } = require('./index');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  let payload;
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || event);
  } catch (err) {
    return json(400, { errors: [{ message: 'Request body is not valid JSON.' }] });
  }

  try {
    return json(200, await run(payload));
  } catch (err) {
    if (err.name === 'ValidationError') {
      return json(400, { errors: [{ field: err.field, message: err.message }] });
    }
    console.error(err);
    return json(500, { errors: [{ message: 'Internal error.' }] });
  }
};