'use strict';
// NWP-ENGINE-006: per-vendor lifecycle rules. DATA ONLY. Adding or changing a vendor's rule edits this file and nothing else.
// Read by lifecycle.js. Keyed by Vendor.name exactly as stored in the Vendor table (lookup also ignores case).
//
// Entry fields
//   researched  true  = the rule below is applied.
//               false = placeholder: every SKU keeps the status stored in the database, and the vendor is reported
//                       as "lifecycle rules pending" so the gap stays visible.
//   useDates    true  = derive a status from Device.eos_date and Device.eol_date against `now` (passed in by the caller):
//                       eol_date reached -> DISCONTINUED, else eos_date reached -> SUNSETTING, else ACTIVE.
//                       A date counts as reached on the day itself. The derived status can only make a SKU
//                       worse than its stored status, never better.
//   labels      vendor-native lifecycle labels (lower case) -> ACTIVE | SUNSETTING | DISCONTINUED. These apply when
//                       Device.lifecycle_status holds the vendor's own word. The three normalized values always pass through.
//   confidence  'vendor'    = the rule rests on the vendor's own published policy page.
//               'secondary' = the rule rests on reseller or aggregator summaries; verify against the vendor before relying on it.
//   terminology how this vendor's milestones map onto the two Device date columns.
//   sources, note  for the write-up and for whoever fills the dates in later.
//
// What the date columns hold (the seed must follow this):
//   eos_date = the vendor's End-of-Sale date.
//   eol_date = the end of support / maintenance (Cisco LDOS, TP-Link EOM, Aruba EOSL, Ruijie EOL). Never compute it from
//              a typical window; copy it from the per-product notice, because the windows differ per product.

const RULES = {
  'Cisco Business': {
    researched: true,
    confidence: 'vendor',
    useDates: true,
    labels: {},
    terminology: { eos_date: 'End-of-Sale Date', eol_date: 'Last Date of Support (LDOS)' },
    sources: ['https://www.cisco.com/c/en/us/products/eos-eol-policy.html'],
    note: 'Past End-of-Sale but before Last Date of Support = SUNSETTING (kept). Past Last Date of Support = DISCONTINUED (decided with G). Cisco\'s standard window from EOS to LDOS is about five years, but each EOL bulletin states its own dates.',
  },

  'Ubiquiti UniFi': {
    researched: true,
    confidence: 'vendor',
    useDates: false,
    labels: {
      legacy: 'DISCONTINUED',   //
      vintage: 'SUNSETTING',    // 
      obsolete: 'DISCONTINUED', // older Ubiquiti wording for what is now "Legacy"; defensive alias
    },
    terminology: { eos_date: 'not published by Ubiquiti', eol_date: 'not published by Ubiquiti' },
    sources: ['https://help.ui.com/hc/en-us/articles/1500001268521-Ubiquiti-s-Vintage-and-Legacy-Products'],
    note: 'Ubiquiti publishes no EOS or EOL dates, only the labels Vintage and Legacy. The label has to be what Device.lifecycle_status holds (or the seed must already have normalized it).',
  },

  'TP-Link Omada': {
    researched: true,
    confidence: 'vendor',
    useDates: true,
    labels: {},
    terminology: { eos_date: 'End of Sales (EOS)', eol_date: 'End of Maintenance (EOM)' },
    sources: ['https://www.tp-link.com/support/faq/3648'],
    note: 'After EOS TP-Link takes no new orders but maintains the product; EOM is usually three years after EOS. Past EOS = SUNSETTING, past EOM = DISCONTINUED. Warranty is unaffected by EOM.',
  },

  'HPE Aruba Instant On': {
    researched: true,
    confidence: 'secondary',
    useDates: true,
    labels: {},
    terminology: { eos_date: 'End of Sale (EOS)', eol_date: 'End of Service Life (EOSL)' },
    sources: [
      'https://eol.network/aruba/lifecycle-policy',
      'https://www.layer23-switch.com/eol-eosl-tool/r2x05a',
      'https://community.instant-on.hpe.com/discussion/end-of-life-dates-for-security-patching',
    ],
    note: 'The EOS-to-EOSL window varies by product (an Instant On AP shows three years, the 1930 switches a five-year limited lifetime warranty, an older FAQ says twelve months), so the dates must be copied per SKU from HPE Aruba notices. The sources found are secondary; confirm against HPE Aruba\'s own EOL pages.',
  },

  'Ruijie': {
    researched: true,
    confidence: 'vendor',
    useDates: true,
    labels: {},
    terminology: { eos_date: 'End-of-sale date', eol_date: 'End-of-life date (end of service)' },
    sources: ['https://id.ruijienetworks.com/support/xw/57192'],
    note: 'Hardware service ends five years after the end-of-sale date; bundled software maintenance ends two years after. eol_date holds the five-year hardware date. Past EOS = SUNSETTING, past EOL = DISCONTINUED.',
  },

  // Placeholder: no published EOS/EOL policy found (see the write-up). SKUs keep their stored status.
  'Grandstream GWN Cloud': {
    researched: false,
    confidence: 'secondary',
    useDates: false,
    labels: {},
    terminology: {},
    sources: ['https://www.grandstream.com/support/firmware'],
    note: 'Grandstream only says EOL products receive no firmware updates or support. No dated milestones or standard window found. Track EOL products manually, then set researched to true.',
  },

  // Generic racks and enclosures have no vendor lifecycle.
  Generic: {
    researched: true,
    confidence: 'vendor',
    useDates: false,
    labels: {},
    terminology: {},
    sources: [],
    note: 'Generic parts: the stored status is kept.',
  },
};

module.exports = Object.freeze(RULES);