'use strict';

// NWP-ENGINE-016: output assembly.
// Adds to each plan the topology, the configuration plan and the limitations, merges the ledger and the flags,
// and builds the EngineResult. Pure: the engine has no clock, so the handler supplies `generatedAt` to
// finalizeEngineResult, which then validates the result.
//
// Consumes: the plans from NWP-ENGINE-015 (each already carrying its BOM, and installationMaterials when NWP-BOM-002
//           has run), the shared ctx, requirements, NormalizedInput, the catalog snapshot, defaultVendor.
// Produces: EngineResult (without generatedAt) from assembleEngineResult; the full result from finalizeEngineResult.

const { createCtx } = require('../ctx.js');
const { CONTRACT_VERSION, ValidationError, validateEngineResult } = require('../contracts.js');
const { buildTopology } = require('./topology.js');
const { buildConfigurationPlan } = require('./configplan.js');
const { buildLimitations } = require('./limitations.js');

// Key order does not matter, so two entries with the same content always produce the same key.
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const body = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',');
    return `{${body}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function uniqueBy(list, keyOf) {
  const seen = new Set();
  const result = [];
  for (const entry of list) {
    const key = keyOf(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function checkLedgerEntry(entry, path) {
  if (!entry || typeof entry !== 'object' || typeof entry.field !== 'string' || typeof entry.reason !== 'string' || !('valueUsed' in entry)) {
    throw new ValidationError(path, 'Ledger entries must be {field, valueUsed, reason}.');
  }
}

function checkFlag(flag, path) {
  if (!flag || typeof flag !== 'object' || typeof flag.code !== 'string' || typeof flag.message !== 'string') {
    throw new ValidationError(path, 'Flags must be {code, message}.');
  }
}

// AC6: shared assumptions first, then each plan's in plan order; exact duplicates removed.
function assembleLedger(sharedLedger = [], plans = []) {
  const all = [];
  sharedLedger.forEach((entry, index) => {
    checkLedgerEntry(entry, `ledger[${index}]`);
    all.push(entry);
  });
  plans.forEach((plan, planIndex) => {
    (plan.ledger ?? []).forEach((entry, index) => {
      checkLedgerEntry(entry, `plans[${planIndex}].ledger[${index}]`);
      all.push(entry);
    });
  });
  return uniqueBy(all, stableStringify).map((entry) => ({ ...entry }));
}

// AC7: shared flags first, then each plan's flags grouped by plan, in plan order.
// Plan flags carry a `plan` scope so the grouping survives in the flat list. A plan flag identical to a shared flag
// is dropped, so a shared flag that a plan also holds does not appear twice.
function assembleFlags(sharedFlags = [], plans = []) {
  sharedFlags.forEach((flag, index) => checkFlag(flag, `flags[${index}]`));
  const shared = uniqueBy(sharedFlags, stableStringify).map((flag) => ({ ...flag }));
  const sharedKeys = new Set(shared.map(stableStringify));

  const planFlags = [];
  plans.forEach((plan, planIndex) => {
    (plan.flags ?? []).forEach((flag, index) => {
      checkFlag(flag, `plans[${planIndex}].flags[${index}]`);
      if (sharedKeys.has(stableStringify({ code: flag.code, message: flag.message }))) return;
      planFlags.push({ ...flag, plan: { vendor: plan.vendor, planType: plan.planType } });
    });
  });

  return [...shared, ...uniqueBy(planFlags, stableStringify)];
}

// Adds topology, configurationPlan and limitations to one plan and returns a new plan (the input is not mutated).
// installationMaterials (NWP-BOM-002) is carried through untouched when the plan already has it.
function assemblePlan(plan, { reqs, input, catalog, sharedLedger = [] }) {
  const local = createCtx();
  const topology = buildTopology(plan, reqs, input, local, catalog);

  const next = {
    ...plan,
    ledger: uniqueBy([...(plan.ledger ?? []), ...local.ledger], stableStringify),
    flags: uniqueBy([...(plan.flags ?? []), ...local.flags], stableStringify),
  };

  if (topology) {
    next.topology = topology;
  } else {
    delete next.topology;
  }

  next.configurationPlan = buildConfigurationPlan(next, reqs);
  next.limitations = buildLimitations(next, input, assembleLedger(sharedLedger, [next]));
  return next;
}

// defaultVendor (NWP-ENGINE-017) is attached as given.
function assembleEngineResult({ requirements, sharedCtx, plans, defaultVendor, input, catalog }) {
  if (!sharedCtx || !Array.isArray(sharedCtx.ledger) || !Array.isArray(sharedCtx.flags)) {
    throw new ValidationError('sharedCtx', 'Shared ctx from createCtx() is required.');
  }
  if (!Array.isArray(plans)) {
    throw new ValidationError('plans', 'Must be an array of plans.');
  }

  const assembledPlans = plans.map((plan) =>
    assemblePlan(plan, { reqs: requirements, input, catalog, sharedLedger: sharedCtx.ledger })
  );

  return {
    contractVersion: CONTRACT_VERSION,
    requirements,
    ledger: assembleLedger(sharedCtx.ledger, assembledPlans),
    flags: assembleFlags(sharedCtx.flags, assembledPlans),
    plans: assembledPlans,
    defaultVendor,
  };
}

// Throws unless the value survives JSON unchanged: no functions, symbols, bigint, non-finite numbers, class
// instances (Date, Map, Set) or cycles. An undefined object property is allowed (JSON drops it); in an array it is not.
function assertJsonSafe(value, path = 'result', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ValidationError(path, 'Numbers must be finite to be JSON-safe.');
    return;
  }
  if (typeof value !== 'object') {
    throw new ValidationError(path, `A value of type ${typeof value} is not JSON-safe.`);
  }
  if (ancestors.has(value)) throw new ValidationError(path, 'Cyclic structures are not JSON-safe.');

  ancestors.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (item === undefined) throw new ValidationError(`${path}[${index}]`, 'undefined in an array is not JSON-safe.');
      assertJsonSafe(item, `${path}[${index}]`, ancestors);
    });
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ValidationError(path, 'Only plain objects are JSON-safe.');
    }
    for (const key of Object.keys(value)) {
      if (value[key] !== undefined) assertJsonSafe(value[key], `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}

// AC10: stamps the result (the handler passes the timestamp), checks it is JSON-safe, then validates it.
function finalizeEngineResult(result, generatedAt) {
  if (typeof generatedAt !== 'string' || generatedAt.trim().length === 0) {
    throw new ValidationError('generatedAt', 'Must be a non-empty string supplied by the handler.');
  }
  const finalResult = { ...result, generatedAt };
  assertJsonSafe(finalResult);
  validateEngineResult(finalResult);
  return finalResult;
}

module.exports = {
  assembleLedger,
  assembleFlags,
  assemblePlan,
  assembleEngineResult,
  finalizeEngineResult,
  assertJsonSafe,
};