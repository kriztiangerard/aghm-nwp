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
  try {
    const payload = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || event);
    return json(200, run(payload));
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    return json(status, { errors: [{ message: err.message }] });
  }
};
