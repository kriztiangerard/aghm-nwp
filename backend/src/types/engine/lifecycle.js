'use strict';
// NWP-ENGINE-006: lifecycle normalization. Pure: no I/O and no clock. `now` is always passed in by the caller.
// The rules themselves live in lifecycle-rules.js.

const DEFAULT_RULES = require('./lifecycle-rules.js');

const RANK = Object.freeze({ ACTIVE: 0, SUNSETTING: 1, DISCONTINUED: 2 });
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isStatus = (value) => hasOwn(RANK, value);

// 'YYYY-MM-DD' for a Date or an ISO-like string; null when it is neither. Dates are compared as UTC calendar days.
function toDay(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return match ? match[1] : null;
  }
  return null;
}

function ruleFor(vendor, rules) {
  if (typeof vendor !== 'string') return null;
  if (hasOwn(rules, vendor)) return rules[vendor];
  const lower = vendor.trim().toLowerCase();
  const key = Object.keys(rules).find((candidate) => candidate.toLowerCase() === lower);
  return key ? rules[key] : null;
}

// Maps the stored value to ACTIVE | SUNSETTING | DISCONTINUED, or null when it is missing or unrecognized.
function readStoredStatus(value, rule) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const key = value.trim().toLowerCase();
  if (rule && rule.labels && hasOwn(rule.labels, key)) return rule.labels[key];
  const upper = key.toUpperCase();
  return isStatus(upper) ? upper : null;
}

// device: { vendor, lifecycle_status, eos_date, eol_date } (database-named fields).
// Returns { ok: true, status, pending } or { ok: false, field: 'status', reason }.
//   pending = true when the vendor has no researched rule: the stored status is kept (upper-cased) and the caller reports it.
function normalizeStatus(device, now, rules = DEFAULT_RULES) {
  const today = toDay(now);
  if (!today) {
    throw new TypeError('normalizeStatus: `now` must be a Date or an ISO date string supplied by the caller.');
  }

  const rule = ruleFor(device.vendor, rules);
  const researched = Boolean(rule) && rule.researched === true;
  const stored = readStoredStatus(device.lifecycle_status, researched ? rule : null);

  if (stored === null) {
    const raw = device.lifecycle_status;
    const reason = raw === undefined || raw === null || String(raw).trim() === ''
      ? 'lifecycle_status is missing'
      : `lifecycle_status '${raw}' is not ACTIVE, SUNSETTING or DISCONTINUED and no rule maps it`;
    return { ok: false, field: 'status', reason };
  }
  if (!researched) return { ok: true, status: stored, pending: true };

  let status = stored;
  if (rule.useDates) {
    const eos = toDay(device.eos_date);
    const eol = toDay(device.eol_date);
    let derived = 'ACTIVE';
    if (eol && eol <= today) derived = 'DISCONTINUED';
    else if (eos && eos <= today) derived = 'SUNSETTING';
    if (RANK[derived] > RANK[status]) status = derived;
  }
  return { ok: true, status, pending: false };
}

// Vendors with no researched rule, as [{ vendor, status: 'lifecycle rules pending' }], sorted by name.
function pendingVendors(vendorNames, rules = DEFAULT_RULES) {
  const names = Array.from(new Set(vendorNames.filter((name) => typeof name === 'string'))).sort();
  return names
    .filter((name) => {
      const rule = ruleFor(name, rules);
      return !rule || rule.researched !== true;
    })
    .map((vendor) => ({ vendor, status: 'lifecycle rules pending' }));
}

// The standard unsuccessful selection result when no SKU survives for a required category (a SelectionResult).
function noCurrentModelUnmet(category, vendor) {
  return {
    ok: false,
    unmet: {
      category,
      vendor,
      reason: `No current model found in ${vendor}'s catalog for this requirement`,
    },
  };
}

module.exports = { normalizeStatus, pendingVendors, noCurrentModelUnmet, toDay, RANK };