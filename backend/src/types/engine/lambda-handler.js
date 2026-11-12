'use strict';

const { run } = require('./index');
const { finalizeEngineResult } = require('./steps/assemble');
const { validateEngineResult } = require('./contracts');

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

  let assembled;
  try {
    assembled = await run(payload);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return json(400, { errors: [{ field: err.field, message: err.message }] });
    }
    console.error(err);
    return json(500, { errors: [{ message: 'Internal error.' }] });
  }

  try {
    const result = finalizeEngineResult(assembled, new Date().toISOString());
    validateEngineResult(result);
    return json(200, result);
  } catch (err) {
    console.error(err);
    return json(500, { errors: [{ message: 'Internal error.' }] });
  }
};