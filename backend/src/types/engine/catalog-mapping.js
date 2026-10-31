'use strict';
// Catalog export mapping (NWP prerequisite, subtask 6): turns ERD-named catalog rows into contract v3 CatalogSku rows.
// Pure functions: no I/O, no clock. Anything the ERD cannot supply is left absent, never guessed (the engine flags it).
//
// Two input shapes:
//   flat rows   - the Omada snapshot shape: core fields plus ERD spec columns on one level (lan_ports, max_power_draw_w, ...).
//   seed records - the Device-plus-specs shape used by synthetic-edge-cases.json (gateway_router_specs, switch_specs, ...).
// A seed record is first flattened (seedRecordToFlat), then both go through flatRowToCatalogSku.

const CATEGORY_MAP = Object.freeze({
    gateway_router: 'gateway',
    gateway: 'gateway',
    ap: 'access_point',
    access_point: 'access_point',
    switch: 'switch',
    controller: 'controller',
    rack: 'enclosure',
    enclosure: 'enclosure'
});

const SPEC_BLOCKS = ['gateway_router_specs', 'switch_specs', 'ap_specs', 'firewall_specs', 'controller_specs', 'rack_specs'];

// ERD column name -> contract field name. The old key is removed after the rename.
const RENAMES = Object.freeze({
    max_power_draw_w: 'max_draw_w',
    max_throughput_mbps: 'routing_throughput_mbps',
    vpn_supported: 'site_to_site_vpn',
    wifi_standard: 'wifi_gen'
});

const hasValue = (value) => value !== undefined && value !== null;

// rack_units for a device: u_height when rack-mountable, 0 when not, absent when unknown.
// A rack-mountable device with no usable height is unknown, not 0U.
function deriveRackUnits(row) {
    if (row.is_rack_mountable === false) return 0;
    if (row.is_rack_mountable === true && Number.isInteger(row.u_height) && row.u_height >= 1) return row.u_height;
    return undefined;
}

function flatRowToCatalogSku(row) {
    const out = {};
    const notes = [];
    const mapped = CATEGORY_MAP[row.category];
    if (!mapped) throw new Error(`Unknown category '${row.category}' on ${row.sku}`);

    Object.keys(row).forEach((key) => {
        if (key === 'category' || key === 'is_rack_mountable' || key === 'u_height') return;
        if (key === 'lan_ports' || key === 'wan_ports' || key === 'port_count') return; // handled below
        out[RENAMES[key] || key] = row[key];
    });
    out.category = mapped;

    // Enclosures carry capacity in rack_units and their type in form_factor (set by the seed flattening).
    if (mapped === 'enclosure') {
        if (hasValue(row.u_capacity)) { out.rack_units = row.u_capacity; delete out.u_capacity; }
    } else {
        const rackUnits = deriveRackUnits(row);
        if (rackUnits !== undefined) out.rack_units = rackUnits;
        else if (hasValue(row.is_rack_mountable) || hasValue(row.u_height)) {
            notes.push(`${row.sku}: rack_units left absent (is_rack_mountable=${row.is_rack_mountable}, u_height=${row.u_height}).`);
        }
    }

    // Copper port count. A switch block states port_count including SFP ports; a gateway states lan_ports.
    const sfp = hasValue(row.sfp_ports) ? row.sfp_ports : 0;
    if (hasValue(row.port_count)) {
        out.copper_ports = Math.max(row.port_count - sfp, 0);
        out.port_count = row.port_count;                       // kept as an extra for the topology step
    } else if (hasValue(row.lan_ports)) {
        out.copper_ports = row.lan_ports;
    }
        if (hasValue(row.wan_ports)) {
        out.wan_ports = row.wan_ports;                         // kept as an extra
        out.dual_wan = row.wan_ports >= 2;
    }
    // IDPS throughput lives in the nested firewall_specs block on flat rows; hoist it to the contract field.
    // A top-level value (seed path) wins; null or missing stays absent (unknown).
    if (out.idps_throughput_mbps === undefined && row.firewall_specs && hasValue(row.firewall_specs.idps_throughput_mbps)) {
        out.idps_throughput_mbps = row.firewall_specs.idps_throughput_mbps;
    }

    return { sku: out, notes };
}

// Flattens one Device-plus-specs seed record. lookups: { vendorsById, linesByVendorAndName, currency, defaultStatus }.
function seedRecordToFlat(record, lookups) {
    const notes = [];
    const vendor = lookups.vendorsById[record.vendor_id];
    if (!vendor) throw new Error(`${record.sku}: no vendor name for vendor_id ${record.vendor_id}`);

    const flat = {
        sku: record.sku,
        vendor,
        category: record.category,
        status: undefined,
        price: hasValue(record.price) ? record.price : null,
        currency: lookups.currency,
        name: record.name,
        description: record.description
    };
    if (hasValue(record.lifecycle_status)) {
        flat.status = String(record.lifecycle_status).toUpperCase();
    } else {
        flat.status = lookups.defaultStatus;
        notes.push(`${record.sku}: no lifecycle_status; status defaulted to ${lookups.defaultStatus}.`);
    }
    ['capabilities', 'is_rack_mountable', 'u_height', 'eos_date', 'eol_date'].forEach((key) => {
        if (hasValue(record[key])) flat[key] = record[key];
    });

    if (record.product_line) {
        const line = lookups.linesByVendorAndName[`${record.vendor_id}|${record.product_line}`];
        if (!line) throw new Error(`${record.sku}: product line '${record.product_line}' not found`);
        flat.line = line.name;
        flat.line_rank = line.line_rank;
    }

    SPEC_BLOCKS.forEach((block) => {
        if (!record[block]) return;
        Object.keys(record[block]).forEach((key) => {
            if (key in flat && flat[key] !== record[block][key]) {
                throw new Error(`${record.sku}: '${key}' appears in more than one block with different values`);
            }
            flat[key] = record[block][key];
        });
    });
    if (record.rack_specs) {
        flat.form_factor = record.rack_specs.form_factor;
    }
    Object.keys(flat).forEach((key) => { if (flat[key] === undefined) delete flat[key]; });
    return { flat, notes };
}

function seedRecordToCatalogSku(record, lookups) {
    const { flat, notes } = seedRecordToFlat(record, lookups);
    const result = flatRowToCatalogSku(flat);
    return { sku: result.sku, notes: notes.concat(result.notes) };
}

module.exports = { flatRowToCatalogSku, seedRecordToFlat, seedRecordToCatalogSku, deriveRackUnits, CATEGORY_MAP, RENAMES };