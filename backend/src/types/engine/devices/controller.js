'use strict';
// backend/src/.../engine/devices/controller.js
// STUB for NWP-ENGINE-018 (controller selection). Replace with the real module when 018 merges.
// Same exports and signatures as the 018 interface, so NWP-ENGINE-015 does not change at the swap.

const { addFlag } = require('../ctx.js');
const { unmetResult } = require('../select.js');

/** counts = { aps, switches, gateways }: sum of qty per category in plan.items. */
function countManagedDevices(items) {
    const counts = { aps: 0, switches: 0, gateways: 0 };
    (items || []).forEach((item) => {
        if (item.category === 'access_point') counts.aps += item.qty;
        else if (item.category === 'switch') counts.switches += item.qty;
        else if (item.category === 'gateway') counts.gateways += item.qty;
    });
    return counts;
}

/** True when the selected gateway row contains the controller (AC1 of 018). Raises the capacity flag. */
function integratedControllerCheck(gatewayRow, ctx) {
    const integrated = !!gatewayRow && (
        (Array.isArray(gatewayRow.capabilities) && gatewayRow.capabilities.includes('controller')) ||
        gatewayRow.controller_type === 'integrated'
    );
    if (integrated) {
        addFlag(ctx, 'CONTROLLER_CAPACITY_NOT_VERIFIED',
            `${gatewayRow.sku} has an integrated controller; its managed-device limits were not checked.`);
    }
    return integrated;
}

/** Stub: always unmet, never ok:true. Records the unmet on ctx and returns the SelectionResult. */
function selectController(vendor, planType, counts, catalog, ctx) {
    return unmetResult(ctx, 'controller', vendor, 'controller selection not implemented yet');
}

module.exports = { countManagedDevices, integratedControllerCheck, selectController };