'use strict';
// NWP-ENGINE-012 — Fiber uplink optics requirement.
//
// This step produces a REQUIREMENT (links, modules, form factor), not a selection.
// Per the manuscript's delimitations, SFP modules are not BOM line items: they belong on the
// Installation Materials Summary, and the ERD does not catalogue them. So nothing here picks a SKU,
// reads the catalog, or touches a price.
//
// Consumes: NormalizedInput (floors), Requirements (backbone from 005, redundancy from 003),
//           the selected access switch's specs (sfp_ports, sfp_form_factor), ctx.
// Produces: null (copper backbone) | { links, modules, formFactor }
// Rules: pure function (no I/O); assumptions go through ctx.

const { addLedger, addFlag, ValidationError } = require('../ctx.js');

// Structural, not tunable: a fiber link has two ends and each end takes one transceiver.
// Deliberately not in params.js (that file is for tunable values).
const MODULES_PER_LINK = 2;

const REDUNDANCY_VALUES = new Set(['none', 'backupWan', 'required']); // values emitted by 003
const BACKBONE_VALUES = new Set(['fiber', 'copper']);                 // values emitted by 005
const SFP_FORM_FACTORS = new Set(['SFP', 'SFP+', 'SFP28', 'QSFP+', 'QSFP28']); // ERD sfpFormFactor enum

// ---------------------------------------------------------------------------
// SUBTASK 1 — Count fiber links: floors × (redundancy === 'required' ? 2 : 1).
// One uplink per floor; a second path per floor when redundancy is 'required'.
// 'backupWan' is WAN-side only and must not add backbone links.
// Invalid floors or redundancy throw ValidationError (no silent default).
// ---------------------------------------------------------------------------
function countFiberLinks(floors, redundancy) {
  if (!Number.isInteger(floors) || floors < 1) {
    throw new ValidationError('floors', 'Must be a positive integer.');
  }
  if (!REDUNDANCY_VALUES.has(redundancy)) {
    throw new ValidationError('redundancy', 'Must be one of none, backupWan, required.');
  }
  return floors * (redundancy === 'required' ? 2 : 1);
}

// ---------------------------------------------------------------------------
// SUBTASK 2 — Compute modules as 2 per link (local constant MODULES_PER_LINK above).
// Accepts 0 so a caller can reuse it harmlessly.
// ---------------------------------------------------------------------------
function countOpticModules(links) {
  if (!Number.isInteger(links) || links < 0) {
    throw new ValidationError('links', 'Must be a non-negative integer.');
  }
  return links * MODULES_PER_LINK;
}

// ---------------------------------------------------------------------------
// SUBTASK 3 — Read the form factor from the selected switch; flag when ports or
// form factor are missing. Never guesses: returns null and raises a flag instead.
// `sw` is the selected switch's specs (ERD switch_specs: sfp_ports, sfp_form_factor).
// ---------------------------------------------------------------------------
function resolveFormFactor(sw, ctx) {
  const ports = sw ? sw.sfp_ports : undefined;
  if (!Number.isFinite(ports) || ports < 1) {
    addFlag(
      ctx,
      'OPTICS_NO_SFP_PORTS',
      'The selected switch reports no SFP ports, so the transceiver form factor could not be determined.'
    );
    return null;
  }
  if (!SFP_FORM_FACTORS.has(sw.sfp_form_factor)) {
    addFlag(
      ctx,
      'OPTICS_FORM_FACTOR_UNKNOWN',
      'The selected switch has SFP ports but no recognised sfp_form_factor; confirm the module type before purchase.'
    );
    return null;
  }
  return sw.sfp_form_factor;
}

function planOptics(input, reqs, sw, ctx) {
  // -------------------------------------------------------------------------
  // SUBTASK 4 — Return null for a copper backbone; throw on an unrecognised value
  // so an upstream typo cannot silently drop the optics.
  // -------------------------------------------------------------------------
  if (!BACKBONE_VALUES.has(reqs && reqs.backbone)) {
    throw new ValidationError('backbone', 'Must be fiber or copper.');
  }
  if (reqs.backbone === 'copper') {
    return null;
  }

  const links = countFiberLinks(input.floors, reqs.redundancy);   // SUBTASK 1
  const modules = countOpticModules(links);                       // SUBTASK 2
  const formFactor = resolveFormFactor(sw, ctx);                  // SUBTASK 3

  // -------------------------------------------------------------------------
  // SUBTASK 5 — Record assumptions. A single floor with fiber means the user
  // reported existing fiber (005); we assume one uplink to the core (two when
  // redundancy is required). The compatibility advisory is raised for every
  // fiber backbone, since modules are listed on the Installation Materials
  // Summary rather than priced in the BOM.
  // -------------------------------------------------------------------------
  if (input.floors === 1) {
    addLedger(
      ctx,
      'fiberLinks',
      links,
      'Single floor with fiber reported; assumed one fiber uplink to the core (two if redundancy is required).'
    );
  }
  addFlag(
    ctx,
    'OPTICS_COMPATIBILITY_ADVISORY',
    'Fiber backbone: SFP modules appear on the Installation Materials Summary only. Confirm module compatibility with the chosen vendor before purchase; final quantities depend on a site survey.'
  );

  // Output deliberately has no sku, price or BOM line (AC 7).
  return { links, modules, formFactor };
}

module.exports = { planOptics, countFiberLinks, countOpticModules, resolveFormFactor };