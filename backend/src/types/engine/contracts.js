'use strict';
// NWP-ENGINE-001 — hand-off shapes between steps. Frozen at the end of Day 1.
// A change needs a pull request approved by the producer and consumer owners; bump CONTRACT_VERSION if incompatible.
const CONTRACT_VERSION = 1;

/**
 * @typedef {Object} NormalizedInput   // output of NWP-ENGINE-002
 * @property {number} contractVersion
 * @property {'one'|'twoOrMore'} locations
 * @property {number} floors
 * @property {number[]} floorArea           // per floor, after fallback
 * @property {number} roomsPerFloor
 * @property {{floor:number, occupancy:number}[]} largeRooms
 * @property {number} wiredPcs @property {number} wifiDevices @property {number} voipPhones @property {number} cameras
 * @property {{cls:string, count:number, poe:boolean}[]} otherDevices
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
 * // 005: backbone, cat5eFlag, edgePorts, poeEdgePorts, otherPoeLoadW, flags
 */

/**
 * @typedef {Object} CatalogSku
 * @property {string} sku @property {string} vendor
 * @property {'gateway'|'access_point'|'switch'|'optic'|'enclosure'} category
 * @property {string} line @property {'ACTIVE'|'SUNSETTING'|'DISCONTINUED'} status
 * @property {number|null} price @property {string} currency
 * // plus category-specific fields (see Appendix A of the specification)
 */

/**
 * @typedef {{ok:true, sku:CatalogSku, qty:number, flags:Object[]} | {ok:false, unmet:{category:string, vendor:string, reason:string}}} SelectionResult
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
    'cat5eFlag',
    'edgePorts',
    'poeEdgePorts',
    'otherPoeLoadW',
    'flags'
]);

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateNormalizedInput(input) {
    if (!isPlainObject(input)) {
        throw new ValidationError('input', 'Payload cannot be null or undefined and must be an object.');
    }

    const contractVersion = Number(input.contractVersion);
    if (!Number.isFinite(contractVersion) || contractVersion !== CONTRACT_VERSION) {
        throw new ValidationError('contractVersion', `Must be ${CONTRACT_VERSION}.`);
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

    if (!Array.isArray(input.otherDevices)) {
        throw new ValidationError('otherDevices', 'Must be an array.');
    }
    input.otherDevices.forEach((device, index) => {
        if (!isPlainObject(device)) {
            throw new ValidationError(`otherDevices[${index}]`, 'Each other device record must be an object.');
        }
        if (typeof device.cls !== 'string' || device.cls.trim().length === 0) {
            throw new ValidationError(`otherDevices[${index}].cls`, 'Class name must be a non-empty string.');
        }
        if (!Number.isInteger(device.count) || device.count < 0) {
            throw new ValidationError(`otherDevices[${index}].count`, 'Count must be a non-negative integer.');
        }
        if (typeof device.poe !== 'boolean') {
            throw new ValidationError(`otherDevices[${index}].poe`, 'POE flag must be a boolean.');
        }
    });

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
    if (reqs.backbone !== undefined && !['string', 'number', 'object'].includes(typeof reqs.backbone)) {
        throw new ValidationError('backbone', 'Has an invalid type.');
    }
    if (reqs.cat5eFlag !== undefined && typeof reqs.cat5eFlag !== 'boolean') {
        throw new ValidationError('cat5eFlag', 'Must be a boolean when present.');
    }
    ['edgePorts', 'poeEdgePorts', 'otherPoeLoadW'].forEach((key) => {
        if (reqs[key] !== undefined && (!Number.isFinite(reqs[key]) || reqs[key] < 0)) {
            throw new ValidationError(key, 'Must be a non-negative number when present.');
        }
    });

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

module.exports = { CONTRACT_VERSION, ValidationError, validateNormalizedInput, validateRequirements, validateSelectionResult };

