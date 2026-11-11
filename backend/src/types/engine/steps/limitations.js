'use strict';

// NWP-ENGINE-016: limitations list for one plan.
// Pure function. The wording below is a draft for team review; the rules that decide when a line appears are the logic.
//
// STATIC_LIMITATIONS always appear (manuscript scope and delimitations).
// Conditional lines are driven by the facts of the run: input, the plan itself, and its assumptions ledger.

const STATIC_LIMITATIONS = Object.freeze([
  'Planning stage only: this output supports early network planning. It is not a site survey or a professional installation design, and final hardware selection, procurement and installation remain the responsibility of qualified network professionals and the deploying organization.',
  'The Bill of Materials covers major network equipment only (gateways/routers, switches, wireless access points, controllers, firewalls, and racks or enclosures). It excludes cabling, cable accessories and other minor installation materials, and actual quantities must be determined through a physical site survey and detailed deployment planning.',
  'The topology is a logical design only. It does not include IP addressing, rack elevations, wireless coverage analysis, cable routing or network simulation.',
  'Prices are planning estimates based on the product catalog at the time the plan was generated. Actual prices may vary due to taxes, shipping, installation fees, promotions and product availability, so confirm current pricing and availability with the distributor before purchasing.',
]);

const GREENFIELD_NOTICE =
  'Existing equipment was reported or is unknown, but this plan is a full greenfield replacement estimate. Existing functional cabling or infrastructure may be repurposed after a physical site inspection, which could reduce the final deployment cost.';

const ASSUMED_LAYOUT_NOTICE =
  'In the topology, the attachment of devices to switches is an assumed layout (a fixed fill rule), not a survey result. The real attachment depends on the site.';

const GENERIC_ENCLOSURE_NOTICE =
  'The rack or cabinet in the Bill of Materials is a generic size. Any rack or wall cabinet model with at least that capacity (in rack units) can be used.';

const UNKNOWN_OTHER_DEVICES_NOTICE =
  'The number of other devices was not provided, so they are drawn as one group without a count.';

const TOPOLOGY_LEDGER_FIELD = 'topology.attachment';

const sentence = (text) => {
  const trimmed = String(text).trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const formatValue = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

function buildLimitations(plan, input, ledger = []) {
  if (!plan || typeof plan !== 'object') throw new TypeError('plan must be an object.');
  if (!input || typeof input !== 'object') throw new TypeError('input must be an object.');
  if (!Array.isArray(ledger)) throw new TypeError('ledger must be an array.');

  const lines = [...STATIC_LIMITATIONS];
  const label = `${plan.vendor} (${plan.planType})`;

  if (input.existingEquipment === 'yes' || input.existingEquipment === 'notSure') {
    lines.push(GREENFIELD_NOTICE);
  }

  for (const unmet of Array.isArray(plan.unmet) ? plan.unmet : []) {
    lines.push(`Requirement not met by ${label}: ${unmet.category} — ${sentence(unmet.reason)}`);
  }

  if (plan.complete === false) {
    lines.push(
      `The ${label} plan is incomplete (complete: false): its Bill of Materials and cost cover only the devices that could be selected.`
    );
  }

  const bomLines = Array.isArray(plan.bom?.lines) ? plan.bom.lines : [];
  if (plan.bom?.totalIsPartial === true) {
    if (bomLines.some((line) => line.unitPrice === null)) {
      lines.push(
        'The total cost is partial: one or more items have no price on file (price on request), so the total excludes them.'
      );
    } else if (plan.complete !== false) {
      lines.push('The total cost is partial and does not cover every item in the plan.');
    }
  }

  // Every ledger entry is a default or an estimate used in sizing, except the topology layout, which has its own line.
  for (const entry of ledger) {
    if (entry.field === TOPOLOGY_LEDGER_FIELD) continue;
    lines.push(`Default or estimate used: ${entry.field} = ${formatValue(entry.valueUsed)}. ${sentence(entry.reason)}`);
  }

  if (plan.topology) {
    lines.push(ASSUMED_LAYOUT_NOTICE);
    const nodes = Array.isArray(plan.topology.nodes) ? plan.topology.nodes : [];
    if (nodes.some((node) => node.clientKind === 'other_devices' && node.count === null)) {
      lines.push(UNKNOWN_OTHER_DEVICES_NOTICE);
    }
  }

  if (bomLines.some((line) => line.category === 'enclosure' && line.isGeneric === true)) {
    lines.push(GENERIC_ENCLOSURE_NOTICE);
  }

  return [...new Set(lines)];
}

module.exports = { buildLimitations, STATIC_LIMITATIONS };