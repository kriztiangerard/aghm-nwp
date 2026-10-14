#!/usr/bin/env node
'use strict';
// NWP-ENGINE-001: runs the engine steps in order against the fixtures, so the whole
// chain can be exercised before every story exists.  `npm run chain`
//
//   node scripts/run-chain.js [--fixture <name>]
//
// - A step is SKIPPED when its module file does not exist yet, when it throws the
//   "<id> not implemented" error from contracts.js, or when its input is missing.
//   Skipped steps never fail the run.
// - A step FAILS when it throws any other error, returns data the contract
//   validators reject (the ValidationError names the field), or its module does not
//   export the expected function. A failed step makes the script exit 1.
// - The script exits 0 when nothing failed, even if every step was skipped.
// - Plain Node, no dependencies. Never run in CI as a gate for unfinished stories.

const fs = require('node:fs');
const path = require('node:path');
const { validateNormalizedInput, validateRequirements } = require('../src/engine/contracts');
const { createCtx } = require('../src/engine/ctx');

const ROOT = path.join(__dirname, '..');
const ENGINE_DIR = path.join(ROOT, 'src', 'engine');
const FIXTURES_DIR = path.join(ROOT, 'tests', 'fixtures');

// ---- Steps: align file and fn with the scaffold stubs (one-time edit) ----------------
//
// Each step is called as  fn(input, ctx, requirementsSoFar)  and may be sync or async.
//   ctx is the real createCtx() object from ctx.js: { ledger, flags, unmet }
//   needs 'raw'        -> input is the raw questionnaire payload, read from
//                         tests/fixtures/questionnaire/<scenario>.json (skipped if absent)
//   needs 'normalized' -> input is the NormalizedInput (a fixture, or step 002's output)
//   gives 'normalized' -> the result replaces the NormalizedInput for later steps
//   gives 'slice'      -> the result is merged into Requirements; requirementsSoFar holds
//                         the slices produced by earlier steps (for example 005 can read 004's AP count)

const STEPS = [
  { id: 'NWP-ENGINE-002', label: 'normalize questionnaire', file: 'normalize.js', fn: 'normalize', needs: 'raw', gives: 'normalized' },
  { id: 'NWP-ENGINE-003', label: 'core requirements', file: 'requirements-core.js', fn: 'deriveCore', needs: 'normalized', gives: 'slice' },
  { id: 'NWP-ENGINE-004', label: 'wireless sizing', file: 'wireless.js', fn: 'deriveWireless', needs: 'normalized', gives: 'slice' },
  { id: 'NWP-ENGINE-005', label: 'wired and PoE sizing', file: 'wired.js', fn: 'deriveWired', needs: 'normalized', gives: 'slice' },
  // Add the next steps here as their stories land (selection, assembly, ...).
];

// ---- Helpers --------------------------------------------------------------------------

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isNotImplemented(err) {
  return Boolean(err) && (err.code === 'NOT_IMPLEMENTED' || /not implemented/i.test(String(err.message)));
}

function describeError(err) {
  return err && err.name === 'ValidationError' ? `ValidationError: ${err.message}` : String(err && err.message ? err.message : err);
}

function loadScenarios(only) {
  const dir = path.join(FIXTURES_DIR, 'normalized-input');
  if (!fs.existsSync(dir)) return [{ name: '(no fixtures found)', normalized: null, raw: null }];

  const names = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
  const wanted = only ? names.filter((n) => n === only) : names;
  if (only && wanted.length === 0) throw new Error(`No fixture named "${only}" in ${dir}`);

  return wanted.map((name) => ({
    name,
    normalized: readJsonIfExists(path.join(dir, `${name}.json`)),
    raw: readJsonIfExists(path.join(FIXTURES_DIR, 'questionnaire', `${name}.json`)),
  }));
}

// ---- Running one step -----------------------------------------------------------------

async function runStep(step, state, ctx) {
  const input = step.needs === 'raw' ? state.raw : state.normalized;
  if (input === null || input === undefined) {
    const what = step.needs === 'raw' ? 'no raw payload fixture' : 'no NormalizedInput available';
    return { status: 'SKIPPED', note: what };
  }

  const modulePath = path.join(ENGINE_DIR, step.file);
  if (!fs.existsSync(modulePath)) {
    return { status: 'SKIPPED', note: `${path.relative(ROOT, modulePath)} not found` };
  }

  let mod;
  try {
    mod = require(modulePath);
  } catch (err) {
    return { status: 'FAILED', note: `could not load ${step.file}: ${describeError(err)}` };
  }
  if (typeof mod[step.fn] !== 'function') {
    return { status: 'FAILED', note: `${step.file} does not export "${step.fn}" (exports: ${Object.keys(mod).join(', ') || 'nothing'})` };
  }

  let result;
  try {
    result = await mod[step.fn](input, ctx, state.requirements);
  } catch (err) {
    return isNotImplemented(err)
      ? { status: 'SKIPPED', note: 'not implemented' }
      : { status: 'FAILED', note: describeError(err) };
  }

  try {
    if (step.gives === 'normalized') {
      validateNormalizedInput(result);
      state.normalized = result;
    } else {
      if (result === null || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error('a requirements step must return an object slice');
      }
      Object.assign(state.requirements, result);
      validateRequirements(state.requirements);
    }
  } catch (err) {
    return { status: 'FAILED', note: describeError(err) };
  }
  return { status: 'RAN', note: '' };
}

// ---- Main -----------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  let only = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--fixture') only = argv[++i];
    else {
      console.error(`Unknown argument: ${argv[i]}`);
      process.exit(1);
    }
  }

  let scenarios;
  try {
    scenarios = loadScenarios(only);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const totals = { RAN: 0, SKIPPED: 0, FAILED: 0 };
  for (const scenario of scenarios) {
    console.log(`== ${scenario.name} ==`);
    const ctx = createCtx();
    const state = { raw: scenario.raw, normalized: scenario.normalized, requirements: {} };

    for (const step of STEPS) {
      const { status, note } = await runStep(step, state, ctx);
      totals[status] += 1;
      console.log(`  ${step.id}  ${step.label.padEnd(26)} ${status.padEnd(8)} ${note}`.trimEnd());
    }
    console.log(`  ctx: ${ctx.ledger.length} ledger, ${ctx.flags.length} flags, ${ctx.unmet.length} unmet`);
  }

  console.log(`\n${totals.RAN} ran, ${totals.SKIPPED} skipped, ${totals.FAILED} failed`);
  process.exit(totals.FAILED > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});