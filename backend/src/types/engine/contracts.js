'use strict';
// NWP-ENGINE-001 — hand-off shapes between steps. Frozen at the end of Day 1.
// A change needs a pull request approved by the producer and consumer owners; bump CONTRACT_VERSION if incompatible.
const CONTRACT_VERSION = 3; // 3: CatalogSku gains required name, optional price provenance (price_source, is_stale, price_updated_at), enclosure form_factor, the controller category and managed-device limits, sfp_form_factor and capabilities. Requirements types backbone ('fiber'|'copper') and adds horizontalCablingOptions. Adds the VendorDescriptor, Bom, BomLine, Plan and EngineResult shapes with validators. 2: Corrections to the requirements and selection result shapes, plus new fields in normalized input. CatalogSku now lists the Appendix A fields and validateCatalogSku was added.

/**
 * @typedef {Object} NormalizedInput   // output of NWP-ENGINE-002
 * @property {number} contractVersion
 * @property {'one'|'twoOrMore'} locations
 * @property {number} floors
 * @property {number[]} floorArea           // per floor, after fallback
 * @property {number} roomsPerFloor
 * @property {{floor:number, occupancy:number}[]} largeRooms
 * @property {number} wiredPcs @property {number} wifiDevices @property {number} voipPhones @property {number} cameras
 * @property {{hasOtherDevices:boolean, description:string}} otherDevices
 * @property {'yes'|'no'|'notSure'} existingEquipment
 * @property {'none'|'cat5e_cat6'|'fiber'|'unknownType'} existingCabling
 * @property {number|null} internetMbps
 * @property {'fiber'|'dslCellular'|'notChecked'} connection
 * @property {'waitItOut'|'sameDay'|'everyMinute'} downtime
 * @property {boolean} guestWifi @property {boolean} sensitiveData        // "not sure" already converted to true
 * @property {string[]} apps
 * @property {'closet'|'wall'|'notSure'} housing
 * @property {'under15k'|'15to40k'|'over40k'} monthlyBudgetBand
 * @property {'none'|'outside'|'inHouse'} itSupport
 * @property {'stable'|'frequent'} power
 * @property {{expected:boolean, band:'0-10'|'11-30'|'31+'|null, newSites:0|1|2}} growth
 * @property {'dashboard'|'cli'|'notSure'} management
 */

/**
 * @typedef {Object} Requirements      // output of NWP-ENGINE-003/004/005, one slice each
 * // 003: g, securityTier, vlans, qos, redundancy, backupAdvice, vpnTunnelsNeeded {CE,HP}, requiredMbps, throughputMetric
 * // 004: wireless { standard, ceiling, CE:{total, perFloor[]}, HP:{total, perFloor[]} }
 * // 005: backbone, horizontalCablingOptions, edgePorts, poeEdgePorts, otherPoeLoadW, upsRecommendation, upsRecommendationLevel, flags
 * @property {'fiber'|'copper'} [backbone]                 // 005; NWP-ENGINE-012 throws on any other value
 * @property {string[]} [horizontalCablingOptions]         // 005; drives the cabling rows of the Installation Materials Summary
 * @property {string} upsRecommendation
 * @property {'prominent'|'advisory'} upsRecommendationLevel
 */

/**
 * @typedef {Object} CatalogSku        // one catalog row, from omada.snapshot.json or synthetic-edge-cases.json (Appendix A)
 * // Core (always present)
 * @property {string} sku @property {string} vendor
 * @property {string} name                 // Device.name; shown on BOM lines
 * @property {'gateway'|'access_point'|'switch'|'optic'|'enclosure'|'controller'} category   // optic is never selected or billed: optics are a requirement only (NWP-ENGINE-012)
 * @property {string} line                 // product line name; required for gateway, access_point, switch
 * @property {number} line_rank            // 1 = entry tier, ordered within one vendor and one category; required for gateway, access_point, switch
 * @property {'ACTIVE'|'SUNSETTING'|'DISCONTINUED'} status
 * @property {number|null} price @property {string} currency
 * // Price provenance, optional; derived by the catalog export from the Pricing table and passed through to BOM lines
 * @property {'synchronized'|'manual'} [price_source]
 * @property {boolean} [is_stale]          // true when every Pricing row for the device is stale
 * @property {string} [price_updated_at]   // Device.price_updated_at; the last verified date
 * // Appendix A fields, present where they apply to the category
 * @property {number|string} [wifi_gen]
 * @property {number} [max_draw_w]
 * @property {number} [poe_ports] @property {number} [poe_budget_w]
 * @property {number} [copper_ports] @property {number} [sfp_ports] @property {string} [sfp_speed]
 * @property {'SFP'|'SFP+'|'SFP28'|'QSFP+'|'QSFP28'} [sfp_form_factor]   // read with sfp_ports by NWP-ENGINE-012
 * @property {number} [routing_throughput_mbps]
 * @property {number|null} [idps_throughput_mbps]   // nullable: absent or null = unknown, the engine raises a flag and never guesses
 * @property {boolean} [dual_wan] @property {boolean} [site_to_site_vpn]
 * @property {number|null} [max_vpn_tunnels]        // nullable: same rule as idps_throughput_mbps
 * // rack_units: for devices, the U height (0 = not rack-mounted, absent = unknown); for enclosures, the U capacity (required, 1 or more)
 * @property {number} [rack_units]
 * // Enclosures
 * @property {'rack'|'wall'} [form_factor]          // required for enclosure, not allowed otherwise: type discriminator for sizing
 * // Controllers; allowed on any category so a gateway with an integrated controller can carry them
 * @property {string[]} [capabilities]              // from DeviceCapability; a non-controller row whose capabilities include 'controller' has an integrated controller (the ER7212PC)
 * @property {'hardware'|'software'|'cloud'|'integrated'} [controller_type]   // required for category 'controller'
 * @property {number} [max_managed_aps] @property {number} [max_managed_switches] @property {number} [max_managed_gateways]   // required for category 'controller'
 * @property {number} [max_managed_aps_and_switches]   // optional combined cap shared by access points and switches
 */

/**
 * @typedef {{ok:true, sku:CatalogSku, qty:number, flags:Object[]} | {ok:false, unmet:{category:string, vendor:string, reason:string}}} SelectionResult
 */

/**
 * @typedef {Object} VendorDescriptor   // passed to the engine with the catalog snapshot, in plan order (NWP-ENGINE-015)
 * @property {string} name
 * @property {boolean} needController   // Vendor.need_controller
 * @property {('dashboard'|'cli')[]} managementModes
 */

/**
 * @typedef {Object} BomLine            // NWP-BOM-001
 * @property {'gateway'|'controller'|'switch'|'access_point'|'enclosure'} category   // no optic: SFP modules are never BOM lines
 * @property {string} sku
 * @property {string} name
 * @property {string} vendor
 * @property {number} qty                       // positive integer
 * @property {number|null} unitPrice            // null = price on request
 * @property {number|null} lineTotal            // null whenever unitPrice is null
 * @property {'ACTIVE'|'SUNSETTING'} status
 * @property {boolean} isGeneric                // true for the generic enclosure
 * @property {'synchronized'|'manual'} [priceSource]
 * @property {boolean} [isStale]
 * @property {string} [priceUpdatedAt]
 *
 * @typedef {Object} Bom
 * @property {string} currency
 * @property {BomLine[]} lines
 * @property {number|null} total                // null when nothing is priced
 * @property {boolean} totalIsPartial           // true when any line is unpriced or the plan is incomplete
 *
 * @typedef {Object} Plan                       // one vendor x plan type (NWP-ENGINE-015)
 * @property {string} vendor
 * @property {'CE'|'HP'} planType
 * @property {boolean} complete
 * @property {{category: string, sku: string, qty: number}[]} items
 * @property {Bom} bom
 * @property {Object[]} unmet
 * @property {Object[]} flags
 * @property {Object[]} ledger
 * @property {null|{links: number, modules: number, formFactor: (string|null)}} [optics]   // NWP-ENGINE-012 requirement; null = copper backbone; never a BOM line
 * @property {Object} [powerProtection]         // NWP-ENGINE-014
 * @property {Object} [topology]                // NWP-ENGINE-016
 * @property {Object} [configurationPlan]       // NWP-ENGINE-016
 * @property {Object} [installationMaterials]   // NWP-BOM-002
 * @property {string[]} [limitations]           // NWP-ENGINE-016
 *
 * @typedef {Object} EngineResult
 * @property {number} contractVersion
 * @property {string} generatedAt               // added by the handler; the engine has no clock
 * @property {Object} requirements
 * @property {Object[]} ledger
 * @property {Object[]} flags
 * @property {Plan[]} plans                     // vendors-list order, CE before HP
 * @property {{CE: (string|null), HP: (string|null)}} defaultVendor   // NWP-ENGINE-017
 */

const notImplemented = (id) => { throw new Error(`${id} not implemented`); };

// Hand-written, dependency-free validators. Filled in by NWP-ENGINE-001.

class ValidationError extends Error {
    constructor(field, message) {
        super(`Validation error on field '${field}': ${message}`);
        this.name = 'ValidationError';
        this.field = field;
    }
}

const VALID_LOCATIONS = new Set(['one', 'twoOrMore']);
const VALID_EXISTING_EQUIPMENT = new Set(['yes', 'no', 'notSure']);
const VALID_EXISTING_CABLING = new Set(['none', 'cat5e_cat6', 'fiber', 'unknownType']);
const VALID_CONNECTION = new Set(['fiber', 'dslCellular', 'notChecked']);
const VALID_DOWNTIME = new Set(['waitItOut', 'sameDay', 'everyMinute']);
const VALID_HOUSING = new Set(['closet', 'wall', 'notSure']);
const VALID_BUDGET = new Set(['under15k', '15to40k', 'over40k']);
const VALID_IT_SUPPORT = new Set(['none', 'outside', 'inHouse']);
const VALID_POWER = new Set(['stable', 'frequent']);
const VALID_GROWTH_BANDS = new Set(['0-10', '11-30', '31+']);
const VALID_MANAGEMENT = new Set(['dashboard', 'cli', 'notSure']);
const VALID_BACKBONE = new Set(['fiber', 'copper']);
const REQUIREMENT_FIELDS = new Set([
    'g',
    'securityTier',
    'vlans',
    'qos',
    'redundancy',
    'backupAdvice',
    'vpnTunnelsNeeded',
    'requiredMbps',
    'throughputMetric',
    'wireless',
    'backbone',
    'horizontalCablingOptions',
    'edgePorts',
    'poeEdgePorts',
    'otherPoeLoadW',
    'upsRecommendation',
    'upsRecommendationLevel',
    'flags'
]);

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateNormalizedInput(input) {
    if (!isPlainObject(input)) {
        throw new ValidationError('input', 'Payload cannot be null or undefined and must be an object.');
    }

    if (input.contractVersion !== CONTRACT_VERSION) {
        throw new ValidationError('contractVersion', `Must be the number ${CONTRACT_VERSION}.`);
    }

    if (!VALID_LOCATIONS.has(input.locations)) {
        throw new ValidationError('locations', 'Must be one of: one, twoOrMore.');
    }

    if (!Number.isInteger(input.floors) || input.floors < 1) {
        throw new ValidationError('floors', 'Must be a positive integer.');
    }
    if (!Array.isArray(input.floorArea)) {
        throw new ValidationError('floorArea', 'Must be an array of per-floor square meter values.');
    }
    if (input.floorArea.length !== input.floors) {
        throw new ValidationError('floorArea', 'Array length must match floors count.');
    }
    input.floorArea.forEach((area, index) => {
        if (!Number.isFinite(area) || area <= 0) {
            throw new ValidationError(`floorArea[${index}]`, 'Each floor area must be a positive number.');
        }
    });

    if (!Number.isInteger(input.roomsPerFloor) || input.roomsPerFloor < 1) {
        throw new ValidationError('roomsPerFloor', 'Must be a positive integer.');
    }

    if (!Array.isArray(input.largeRooms)) {
        throw new ValidationError('largeRooms', 'Must be an array.');
    }
    input.largeRooms.forEach((room, index) => {
        if (!isPlainObject(room)) {
            throw new ValidationError(`largeRooms[${index}]`, 'Each large room record must be an object.');
        }
        if (!Number.isInteger(room.floor) || room.floor < 1 || room.floor > input.floors) {
            throw new ValidationError(`largeRooms[${index}].floor`, 'Floor index must be between 1 and floors.');
        }
        if (!Number.isFinite(room.occupancy) || room.occupancy <= 0) {
            throw new ValidationError(`largeRooms[${index}].occupancy`, 'Occupancy must be a positive number.');
        }
    });

    ['wiredPcs', 'wifiDevices', 'voipPhones', 'cameras'].forEach((key) => {
        if (!Number.isInteger(input[key]) || input[key] < 0) {
            throw new ValidationError(key, 'Must be a non-negative integer.');
        }
    });

    if (!isPlainObject(input.otherDevices)) {
        throw new ValidationError('otherDevices', 'Must be an object with a boolean hasOtherDevices flag and a free-text description.');
    }
    if (typeof input.otherDevices.hasOtherDevices !== 'boolean') {
        throw new ValidationError('otherDevices.hasOtherDevices', 'Must be a boolean.');
    }
    if (typeof input.otherDevices.description !== 'string') {
        throw new ValidationError('otherDevices.description', 'Description must be a free-text string.');
    }

    if (!VALID_EXISTING_EQUIPMENT.has(input.existingEquipment)) {
        throw new ValidationError('existingEquipment', 'Must be yes, no, or notSure.');
    }
    if (!VALID_EXISTING_CABLING.has(input.existingCabling)) {
        throw new ValidationError('existingCabling', 'Must be one of none, cat5e_cat6, fiber, unknownType.');
    }

    if (input.internetMbps !== null && (!Number.isFinite(input.internetMbps) || input.internetMbps <= 0)) {
        throw new ValidationError('internetMbps', 'Must be a positive number or null.');
    }
    if (!VALID_CONNECTION.has(input.connection)) {
        throw new ValidationError('connection', 'Must be one of fiber, dslCellular, notChecked.');
    }
    if (!VALID_DOWNTIME.has(input.downtime)) {
        throw new ValidationError('downtime', 'Must be one of waitItOut, sameDay, everyMinute.');
    }

    if (typeof input.guestWifi !== 'boolean') {
        throw new ValidationError('guestWifi', 'Must be a boolean.');
    }
    if (typeof input.sensitiveData !== 'boolean') {
        throw new ValidationError('sensitiveData', 'Must be a boolean.');
    }

    if (!Array.isArray(input.apps) || !input.apps.every((app) => typeof app === 'string' && app.trim().length > 0)) {
        throw new ValidationError('apps', 'Must be an array of non-empty strings.');
    }
    if (!VALID_HOUSING.has(input.housing)) {
        throw new ValidationError('housing', 'Must be one of closet, wall, notSure.');
    }
    if (!VALID_BUDGET.has(input.monthlyBudgetBand)) {
        throw new ValidationError('monthlyBudgetBand', 'Must be one of under15k, 15to40k, over40k.');
    }
    if (!VALID_IT_SUPPORT.has(input.itSupport)) {
        throw new ValidationError('itSupport', 'Must be one of none, outside, inHouse.');
    }
    if (!VALID_POWER.has(input.power)) {
        throw new ValidationError('power', 'Must be either stable or frequent.');
    }

    if (!isPlainObject(input.growth)) {
        throw new ValidationError('growth', 'Growth block must be an object.');
    }
    if (typeof input.growth.expected !== 'boolean') {
        throw new ValidationError('growth.expected', 'Expected growth flag must be a boolean.');
    }
    if (input.growth.band !== null && !VALID_GROWTH_BANDS.has(input.growth.band)) {
        throw new ValidationError('growth.band', 'Growth band must be one of 0-10, 11-30, 31+, or null.');
    }
    if (![0, 1, 2].includes(input.growth.newSites)) {
        throw new ValidationError('growth.newSites', 'New site count must be 0, 1, or 2.');
    }

    if (!VALID_MANAGEMENT.has(input.management)) {
        throw new ValidationError('management', 'Must be one of dashboard, cli, notSure.');
    }

    return true;
}

function validateRequirements(reqs) {
    if (!isPlainObject(reqs)) {
        throw new ValidationError('reqs', 'Requirements object cannot be null and must be an object.');
    }

    const presentFields = Object.keys(reqs).filter((key) => REQUIREMENT_FIELDS.has(key));
    if (presentFields.length === 0) {
        throw new ValidationError('reqs', 'Requirements object is missing any known requirement fields.');
    }

    if (reqs.g !== undefined && !Number.isFinite(reqs.g)) {
        throw new ValidationError('g', 'Must be a finite number when present.');
    }
    if (reqs.securityTier !== undefined && typeof reqs.securityTier !== 'string') {
        throw new ValidationError('securityTier', 'Must be a string when present.');
    }
    if (reqs.vlans !== undefined && !Array.isArray(reqs.vlans)) {
        throw new ValidationError('vlans', 'Must be an array when present.');
    }
    if (reqs.requiredMbps !== undefined && (!Number.isFinite(reqs.requiredMbps) || reqs.requiredMbps < 0)) {
        throw new ValidationError('requiredMbps', 'Must be a non-negative number when present.');
    }
    if (reqs.throughputMetric !== undefined && typeof reqs.throughputMetric !== 'string') {
        throw new ValidationError('throughputMetric', 'Must be a string when present.');
    }
    if (reqs.backbone !== undefined && !VALID_BACKBONE.has(reqs.backbone)) {
        throw new ValidationError('backbone', 'Must be fiber or copper when present.');
    }
    if (reqs.horizontalCablingOptions !== undefined
        && (!Array.isArray(reqs.horizontalCablingOptions)
            || !reqs.horizontalCablingOptions.every((option) => typeof option === 'string' && option.trim().length > 0))) {
        throw new ValidationError('horizontalCablingOptions', 'Must be an array of non-empty strings when present.');
    }
    ['edgePorts', 'poeEdgePorts', 'otherPoeLoadW'].forEach((key) => {
        if (reqs[key] !== undefined && (!Number.isFinite(reqs[key]) || reqs[key] < 0)) {
            throw new ValidationError(key, 'Must be a non-negative number when present.');
        }
    });
    if (reqs.upsRecommendation !== undefined && typeof reqs.upsRecommendation !== 'string') {
        throw new ValidationError('upsRecommendation', 'Must be a string when present.');
    }
    if (reqs.upsRecommendationLevel !== undefined && !['prominent', 'advisory'].includes(reqs.upsRecommendationLevel)) {
        throw new ValidationError('upsRecommendationLevel', 'Must be prominent or advisory when present.');
    }

    if (reqs.wireless !== undefined) {
        if (!isPlainObject(reqs.wireless)) {
            throw new ValidationError('wireless', 'Must be an object when present.');
        }
        if (reqs.wireless.standard !== undefined && typeof reqs.wireless.standard !== 'string') {
            throw new ValidationError('wireless.standard', 'Must be a string when present.');
        }
        if (reqs.wireless.ceiling !== undefined && !Number.isFinite(reqs.wireless.ceiling)) {
            throw new ValidationError('wireless.ceiling', 'Must be a finite number when present.');
        }
        ['CE', 'HP'].forEach((key) => {
            if (reqs.wireless[key] !== undefined) {
                const section = reqs.wireless[key];
                if (!isPlainObject(section)) {
                    throw new ValidationError(`wireless.${key}`, 'Must be an object when present.');
                }
                if (section.total !== undefined && (!Number.isInteger(section.total) || section.total < 0)) {
                    throw new ValidationError(`wireless.${key}.total`, 'Must be a non-negative integer when present.');
                }
                if (section.perFloor !== undefined && (!Array.isArray(section.perFloor) || !section.perFloor.every((value) => Number.isFinite(value)))) {
                    throw new ValidationError(`wireless.${key}.perFloor`, 'Must be an array of finite numbers when present.');
                }
            }
        });
    }

    if (reqs.vpnTunnelsNeeded !== undefined) {
        if (!isPlainObject(reqs.vpnTunnelsNeeded)) {
            throw new ValidationError('vpnTunnelsNeeded', 'Must be an object when present.');
        }
        ['CE', 'HP'].forEach((key) => {
            if (reqs.vpnTunnelsNeeded[key] !== undefined && (!Number.isFinite(reqs.vpnTunnelsNeeded[key]) || reqs.vpnTunnelsNeeded[key] < 0)) {
                throw new ValidationError(`vpnTunnelsNeeded.${key}`, 'Must be a non-negative number when present.');
            }
        });
    }

    if (reqs.flags !== undefined && !['object', 'boolean', 'string', 'number', 'undefined'].includes(typeof reqs.flags)) {
        throw new ValidationError('flags', 'Has an invalid type.');
    }

    return true;
}

function validateSelectionResult(result) {
    if (!isPlainObject(result)) {
        throw new ValidationError('result', 'Selection result cannot be null and must be an object.');
    }
    if (typeof result.ok !== 'boolean') {
        throw new ValidationError('ok', 'Selection result must include an ok boolean flag.');
    }

    if (result.ok === true) {
        if (!isPlainObject(result.sku)) {
            throw new ValidationError('sku', 'SKU payload must be an object.');
        }
        if (!Number.isFinite(result.qty) || result.qty < 0) {
            throw new ValidationError('qty', 'Quantity must be a non-negative number.');
        }
        if (!Array.isArray(result.flags)) {
            throw new ValidationError('flags', 'Flags must be an array.');
        }
        return true;
    }

    if (!isPlainObject(result.unmet)) {
        throw new ValidationError('unmet', 'Unmet requirements block must be an object for unsuccessful selections.');
    }
    if (typeof result.unmet.category !== 'string' || result.unmet.category.trim().length === 0) {
        throw new ValidationError('unmet.category', 'Must be a non-empty string.');
    }
    if (typeof result.unmet.vendor !== 'string' || result.unmet.vendor.trim().length === 0) {
        throw new ValidationError('unmet.vendor', 'Must be a non-empty string.');
    }
    if (typeof result.unmet.reason !== 'string' || result.unmet.reason.trim().length === 0) {
        throw new ValidationError('unmet.reason', 'Must be a non-empty string.');
    }

    return true;
}

const CATALOG_CATEGORIES = new Set(['gateway', 'access_point', 'switch', 'optic', 'enclosure', 'controller']);
const CATALOG_STATUSES = new Set(['ACTIVE', 'SUNSETTING', 'DISCONTINUED']);
const LINE_REQUIRED_CATEGORIES = new Set(['gateway', 'access_point', 'switch']);
const CATALOG_NUMBER_FIELDS = [
    'max_draw_w', 'poe_ports', 'poe_budget_w', 'copper_ports', 'sfp_ports', 'routing_throughput_mbps', 'rack_units',
    'max_managed_aps', 'max_managed_switches', 'max_managed_gateways', 'max_managed_aps_and_switches'
];
const CATALOG_NULLABLE_NUMBER_FIELDS = ['idps_throughput_mbps', 'max_vpn_tunnels'];
const CATALOG_BOOLEAN_FIELDS = ['dual_wan', 'site_to_site_vpn', 'is_stale'];
const CATALOG_STRING_FIELDS = ['sfp_speed', 'price_updated_at'];
const VALID_FORM_FACTORS = new Set(['rack', 'wall']);
const VALID_CONTROLLER_TYPES = new Set(['hardware', 'software', 'cloud', 'integrated']);
const VALID_SFP_FORM_FACTORS = new Set(['SFP', 'SFP+', 'SFP28', 'QSFP+', 'QSFP28']);
const VALID_PRICE_SOURCES = new Set(['synchronized', 'manual']);
const CONTROLLER_REQUIRED_LIMITS = ['max_managed_aps', 'max_managed_switches', 'max_managed_gateways'];

// Checks the core fields and the type of every Appendix A field that is present.
// Which Appendix A fields each category must carry is not enforced here yet, except for enclosures and controllers.
function validateCatalogSku(sku) {
    if (!isPlainObject(sku)) {
        throw new ValidationError('sku', 'CatalogSku must be an object.');
    }
    ['sku', 'vendor', 'name', 'currency'].forEach((key) => {
        if (typeof sku[key] !== 'string' || sku[key].trim().length === 0) {
            throw new ValidationError(key, 'Must be a non-empty string.');
        }
    });
    if (!CATALOG_CATEGORIES.has(sku.category)) {
        throw new ValidationError('category', 'Must be one of gateway, access_point, switch, optic, enclosure, controller.');
    }
    if (!CATALOG_STATUSES.has(sku.status)) {
        throw new ValidationError('status', 'Must be one of ACTIVE, SUNSETTING, DISCONTINUED.');
    }
    if (sku.price !== null && (!Number.isFinite(sku.price) || sku.price < 0)) {
        throw new ValidationError('price', 'Must be a non-negative number or null.');
    }
    if (LINE_REQUIRED_CATEGORIES.has(sku.category)) {
        if (typeof sku.line !== 'string' || sku.line.trim().length === 0) {
            throw new ValidationError('line', 'Must be a non-empty string for gateway, access_point and switch.');
        }
        if (!Number.isInteger(sku.line_rank) || sku.line_rank < 1) {
            throw new ValidationError('line_rank', 'Must be an integer of 1 or more for gateway, access_point and switch.');
        }
    } else if (sku.line !== undefined && typeof sku.line !== 'string') {
        throw new ValidationError('line', 'Must be a string when present.');
    }

    if (sku.wifi_gen !== undefined && !(Number.isFinite(sku.wifi_gen) || (typeof sku.wifi_gen === 'string' && sku.wifi_gen.trim().length > 0))) {
        throw new ValidationError('wifi_gen', 'Must be a number or a non-empty string when present.');
    }
    CATALOG_NUMBER_FIELDS.forEach((key) => {
        if (sku[key] !== undefined && (!Number.isFinite(sku[key]) || sku[key] < 0)) {
            throw new ValidationError(key, 'Must be a non-negative number when present.');
        }
    });
    CATALOG_NULLABLE_NUMBER_FIELDS.forEach((key) => {
        if (sku[key] !== undefined && sku[key] !== null && (!Number.isFinite(sku[key]) || sku[key] < 0)) {
            throw new ValidationError(key, 'Must be a non-negative number or null when present.');
        }
    });
    CATALOG_BOOLEAN_FIELDS.forEach((key) => {
        if (sku[key] !== undefined && typeof sku[key] !== 'boolean') {
            throw new ValidationError(key, 'Must be a boolean when present.');
        }
    });
    CATALOG_STRING_FIELDS.forEach((key) => {
        if (sku[key] !== undefined && (typeof sku[key] !== 'string' || sku[key].trim().length === 0)) {
            throw new ValidationError(key, 'Must be a non-empty string when present.');
        }
    });

    if (sku.price_source !== undefined && !VALID_PRICE_SOURCES.has(sku.price_source)) {
        throw new ValidationError('price_source', 'Must be one of synchronized, manual when present.');
    }
    if (sku.sfp_form_factor !== undefined && !VALID_SFP_FORM_FACTORS.has(sku.sfp_form_factor)) {
        throw new ValidationError('sfp_form_factor', 'Must be one of SFP, SFP+, SFP28, QSFP+, QSFP28 when present.');
    }
    if (sku.capabilities !== undefined
        && (!Array.isArray(sku.capabilities)
            || !sku.capabilities.every((item) => typeof item === 'string' && item.trim().length > 0))) {
        throw new ValidationError('capabilities', 'Must be an array of non-empty strings when present.');
    }

    if (sku.category === 'enclosure') {
        if (!VALID_FORM_FACTORS.has(sku.form_factor)) {
            throw new ValidationError('form_factor', 'Must be one of rack, wall for an enclosure.');
        }
        if (!Number.isInteger(sku.rack_units) || sku.rack_units < 1) {
            throw new ValidationError('rack_units', 'Must be an integer of 1 or more (capacity in U) for an enclosure.');
        }
    } else if (sku.form_factor !== undefined) {
        throw new ValidationError('form_factor', 'Only valid for an enclosure.');
    }

    if (sku.controller_type !== undefined && !VALID_CONTROLLER_TYPES.has(sku.controller_type)) {
        throw new ValidationError('controller_type', 'Must be one of hardware, software, cloud, integrated.');
    }
    if (sku.category === 'controller') {
        if (sku.controller_type === undefined) {
            throw new ValidationError('controller_type', 'Required for a controller.');
        }
        CONTROLLER_REQUIRED_LIMITS.forEach((key) => {
            if (!Number.isFinite(sku[key])) {
                throw new ValidationError(key, 'Required for a controller.');
            }
        });
    }

    return true;
}

const BOM_LINE_CATEGORIES = new Set(['gateway', 'controller', 'switch', 'access_point', 'enclosure']);
const BOM_LINE_STATUSES = new Set(['ACTIVE', 'SUNSETTING']);
const VALID_PLAN_TYPES = new Set(['CE', 'HP']);
const VALID_MANAGEMENT_MODES = new Set(['dashboard', 'cli']);

function validateBomLine(line, path) {
    if (!isPlainObject(line)) {
        throw new ValidationError(path, 'Each BOM line must be an object.');
    }
    if (!BOM_LINE_CATEGORIES.has(line.category)) {
        throw new ValidationError(`${path}.category`, 'Must be one of gateway, controller, switch, access_point, enclosure.');
    }
    ['sku', 'name', 'vendor'].forEach((key) => {
        if (typeof line[key] !== 'string' || line[key].trim().length === 0) {
            throw new ValidationError(`${path}.${key}`, 'Must be a non-empty string.');
        }
    });
    if (!Number.isInteger(line.qty) || line.qty < 1) {
        throw new ValidationError(`${path}.qty`, 'Must be a positive integer.');
    }
    const unitPriced = line.unitPrice !== null;
    const totalPriced = line.lineTotal !== null;
    if (unitPriced !== totalPriced) {
        throw new ValidationError(`${path}.lineTotal`, 'unitPrice and lineTotal must both be null or both be numbers.');
    }
    if (unitPriced && (!Number.isFinite(line.unitPrice) || line.unitPrice < 0)) {
        throw new ValidationError(`${path}.unitPrice`, 'Must be a non-negative number or null.');
    }
    if (totalPriced && (!Number.isFinite(line.lineTotal) || line.lineTotal < 0)) {
        throw new ValidationError(`${path}.lineTotal`, 'Must be a non-negative number or null.');
    }
    if (!BOM_LINE_STATUSES.has(line.status)) {
        throw new ValidationError(`${path}.status`, 'Must be ACTIVE or SUNSETTING.');
    }
    if (typeof line.isGeneric !== 'boolean') {
        throw new ValidationError(`${path}.isGeneric`, 'Must be a boolean.');
    }
    if (line.priceSource !== undefined && !VALID_PRICE_SOURCES.has(line.priceSource)) {
        throw new ValidationError(`${path}.priceSource`, 'Must be one of synchronized, manual when present.');
    }
    if (line.isStale !== undefined && typeof line.isStale !== 'boolean') {
        throw new ValidationError(`${path}.isStale`, 'Must be a boolean when present.');
    }
    if (line.priceUpdatedAt !== undefined && (typeof line.priceUpdatedAt !== 'string' || line.priceUpdatedAt.trim().length === 0)) {
        throw new ValidationError(`${path}.priceUpdatedAt`, 'Must be a non-empty string when present.');
    }
}

// Shallow shape check; NWP-BOM-001's builder enforces the arithmetic and the single-currency rule.
function validateBom(bom) {
    if (!isPlainObject(bom)) {
        throw new ValidationError('bom', 'BOM must be an object.');
    }
    if (typeof bom.currency !== 'string' || bom.currency.trim().length === 0) {
        throw new ValidationError('bom.currency', 'Must be a non-empty string.');
    }
    if (!Array.isArray(bom.lines)) {
        throw new ValidationError('bom.lines', 'Must be an array.');
    }
    bom.lines.forEach((line, index) => validateBomLine(line, `bom.lines[${index}]`));
    if (bom.total !== null && (!Number.isFinite(bom.total) || bom.total < 0)) {
        throw new ValidationError('bom.total', 'Must be a non-negative number or null.');
    }
    if (typeof bom.totalIsPartial !== 'boolean') {
        throw new ValidationError('bom.totalIsPartial', 'Must be a boolean.');
    }
    if (bom.lines.some((line) => line.unitPrice === null) && bom.totalIsPartial !== true) {
        throw new ValidationError('bom.totalIsPartial', 'Must be true when any line has no price.');
    }
    return true;
}

// The VendorDescriptor list the handler passes to the engine (NWP-ENGINE-015 AC1).
function validateVendorDescriptors(vendors) {
    if (!Array.isArray(vendors) || vendors.length === 0) {
        throw new ValidationError('vendors', 'Must be a non-empty array of vendor descriptors.');
    }
    const seen = new Set();
    vendors.forEach((vendor, index) => {
        if (!isPlainObject(vendor)) {
            throw new ValidationError(`vendors[${index}]`, 'Each vendor descriptor must be an object.');
        }
        if (typeof vendor.name !== 'string' || vendor.name.trim().length === 0) {
            throw new ValidationError(`vendors[${index}].name`, 'Must be a non-empty string.');
        }
        if (seen.has(vendor.name)) {
            throw new ValidationError(`vendors[${index}].name`, 'Vendor names must be unique.');
        }
        seen.add(vendor.name);
        if (typeof vendor.needController !== 'boolean') {
            throw new ValidationError(`vendors[${index}].needController`, 'Must be a boolean.');
        }
        if (!Array.isArray(vendor.managementModes) || !vendor.managementModes.every((mode) => VALID_MANAGEMENT_MODES.has(mode))) {
            throw new ValidationError(`vendors[${index}].managementModes`, 'Must be an array containing only dashboard and cli.');
        }
    });
    return true;
}

// Shallow checks only; each builder validates its own content. Optional fields are checked only when present.
function validatePlan(plan) {
    if (!isPlainObject(plan)) {
        throw new ValidationError('plan', 'Plan must be an object.');
    }
    if (typeof plan.vendor !== 'string' || plan.vendor.trim().length === 0) {
        throw new ValidationError('plan.vendor', 'Must be a non-empty string.');
    }
    if (!VALID_PLAN_TYPES.has(plan.planType)) {
        throw new ValidationError('plan.planType', 'Must be CE or HP.');
    }
    if (typeof plan.complete !== 'boolean') {
        throw new ValidationError('plan.complete', 'Must be a boolean.');
    }
    if (!Array.isArray(plan.items)) {
        throw new ValidationError('plan.items', 'Must be an array.');
    }
    plan.items.forEach((item, index) => {
        if (!isPlainObject(item)
            || typeof item.category !== 'string' || item.category.trim().length === 0
            || typeof item.sku !== 'string' || item.sku.trim().length === 0
            || !Number.isInteger(item.qty) || item.qty < 0) {
            throw new ValidationError(`plan.items[${index}]`, 'Each item needs a category, a sku and a non-negative integer qty.');
        }
    });
    validateBom(plan.bom);
    ['unmet', 'flags', 'ledger'].forEach((key) => {
        if (!Array.isArray(plan[key])) {
            throw new ValidationError(`plan.${key}`, 'Must be an array.');
        }
    });
    if (plan.optics !== undefined && plan.optics !== null) {
        if (!isPlainObject(plan.optics)
            || !Number.isInteger(plan.optics.links) || plan.optics.links < 0
            || !Number.isInteger(plan.optics.modules) || plan.optics.modules < 0
            || (plan.optics.formFactor !== null && !VALID_SFP_FORM_FACTORS.has(plan.optics.formFactor))) {
            throw new ValidationError('plan.optics', 'Must be null or {links, modules, formFactor} with formFactor a valid SFP form factor or null.');
        }
    }
    ['powerProtection', 'topology', 'configurationPlan', 'installationMaterials'].forEach((key) => {
        if (plan[key] !== undefined && !isPlainObject(plan[key])) {
            throw new ValidationError(`plan.${key}`, 'Must be an object when present.');
        }
    });
    if (plan.limitations !== undefined && (!Array.isArray(plan.limitations) || !plan.limitations.every((text) => typeof text === 'string'))) {
        throw new ValidationError('plan.limitations', 'Must be an array of strings when present.');
    }
    return true;
}

// Validates the result after the handler has added generatedAt.
function validateEngineResult(result) {
    if (!isPlainObject(result)) {
        throw new ValidationError('result', 'Engine result must be an object.');
    }
    if (result.contractVersion !== CONTRACT_VERSION) {
        throw new ValidationError('contractVersion', `Must be the number ${CONTRACT_VERSION}.`);
    }
    if (typeof result.generatedAt !== 'string' || result.generatedAt.trim().length === 0) {
        throw new ValidationError('generatedAt', 'Must be a non-empty string added by the handler.');
    }
    if (!isPlainObject(result.requirements)) {
        throw new ValidationError('requirements', 'Must be an object.');
    }
    ['ledger', 'flags', 'plans'].forEach((key) => {
        if (!Array.isArray(result[key])) {
            throw new ValidationError(key, 'Must be an array.');
        }
    });
    result.plans.forEach((plan) => validatePlan(plan));
    if (!isPlainObject(result.defaultVendor)) {
        throw new ValidationError('defaultVendor', 'Must be an object with CE and HP keys.');
    }
    ['CE', 'HP'].forEach((key) => {
        if (!(key in result.defaultVendor)) {
            throw new ValidationError(`defaultVendor.${key}`, 'Key is required (use null when there is no default).');
        }
        const value = result.defaultVendor[key];
        if (value !== null && (typeof value !== 'string' || value.trim().length === 0)) {
            throw new ValidationError(`defaultVendor.${key}`, 'Must be a vendor name or null.');
        }
    });
    return true;
}

module.exports = {
    CONTRACT_VERSION,
    ValidationError,
    validateNormalizedInput,
    validateRequirements,
    validateSelectionResult,
    validateCatalogSku,
    validateVendorDescriptors,
    validateBom,
    validatePlan,
    validateEngineResult
};