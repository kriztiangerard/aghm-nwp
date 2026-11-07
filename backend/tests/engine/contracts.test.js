'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    CONTRACT_VERSION,
    validateVendorDescriptors,
    validateEngineResult,
    ValidationError
} = require('../../src/types/engine/contracts.js');

const validVendor = {
    name: 'Test Vendor',
    needController: false,
    managementModes: ['dashboard']
};

test('accepts a valid vendor descriptor', () => {
    assert.equal(validateVendorDescriptors([validVendor]), true);
});

test('accepts dashboard-only management mode', () => {
    const vendor = {
        ...validVendor,
        managementModes: ['dashboard']
    };

    assert.equal(validateVendorDescriptors([vendor]), true);
});

test('accepts CLI-only management mode', () => {
    const vendor = {
        ...validVendor,
        managementModes: ['cli']
    };

    assert.equal(validateVendorDescriptors([vendor]), true);
});

test('accepts both dashboard and CLI management modes', () => {
    const vendor = {
        ...validVendor,
        managementModes: ['dashboard', 'cli']
    };

    assert.equal(validateVendorDescriptors([vendor]), true);
});

test('accepts an empty managementModes array', () => {
    const vendor = {
        ...validVendor,
        managementModes: []
    };

    assert.equal(validateVendorDescriptors([vendor]), true);
});

test('rejects a non-array vendor descriptor list', () => {
    assert.throws(
        () => validateVendorDescriptors(validVendor),
        (error) => error instanceof ValidationError
            && error.field === 'vendors'
    );
});

test('rejects an empty vendor descriptor list', () => {
    assert.throws(
        () => validateVendorDescriptors([]),
        (error) => error instanceof ValidationError
            && error.field === 'vendors'
    );
});

test('rejects a non-object vendor descriptor', () => {
    assert.throws(
        () => validateVendorDescriptors([null]),
        (error) => error instanceof ValidationError
            && error.field === 'vendors[0]'
    );
});

test('rejects a missing vendor name', () => {
    const vendor = {
        needController: false,
        managementModes: ['dashboard']
    };

    assert.throws(
        () => validateVendorDescriptors([vendor]),
        (error) => error instanceof ValidationError
            && error.field === 'vendors[0].name'
    );
});

test('rejects an empty vendor name', () => {
    const vendor = {
        ...validVendor,
        name: '   '
    };

    assert.throws(
        () => validateVendorDescriptors([vendor]),
        (error) => error instanceof ValidationError
            && error.field === 'vendors[0].name'
    );
});

test('rejects duplicate vendor names', () => {
    const vendors = [
        validVendor,
        { ...validVendor }
    ];

    assert.throws(
        () => validateVendorDescriptors(vendors),
        (error) => error instanceof ValidationError
            && error.field === 'vendors[1].name'
    );
});

test('rejects a non-boolean needController value', () => {
    const vendor = {
        ...validVendor,
        needController: 'false'
    };

    assert.throws(
        () => validateVendorDescriptors([vendor]),
        (error) => error instanceof ValidationError
            && error.field === 'vendors[0].needController'
    );
});

test('rejects missing managementModes', () => {
    const vendor = {
        name: 'Test Vendor',
        needController: false
    };

    assert.throws(
        () => validateVendorDescriptors([vendor]),
        (error) => error instanceof ValidationError
            && error.field === 'vendors[0].managementModes'
    );
});

test('rejects a non-array managementModes value', () => {
    const vendor = {
        ...validVendor,
        managementModes: 'dashboard'
    };

    assert.throws(
        () => validateVendorDescriptors([vendor]),
        (error) => error instanceof ValidationError
            && error.field === 'vendors[0].managementModes'
    );
});

test('rejects an unsupported management mode', () => {
    const vendor = {
        ...validVendor,
        managementModes: ['dashboard', 'unknown']
    };

    assert.throws(
        () => validateVendorDescriptors([vendor]),
        (error) => error instanceof ValidationError
            && error.field === 'vendors[0].managementModes'
    );
});

// ============================================================
// ENGINE RESULT: DEFAULT VENDOR CONTRACT
// ============================================================

function makeValidEngineResult(defaultVendor = { CE: 'Vendor A', HP: 'Vendor B' }) {
    return {
        contractVersion: CONTRACT_VERSION,
        generatedAt: '2026-11-07T00:00:00.000Z',
        requirements: {},
        ledger: [],
        flags: [],
        plans: [],
        defaultVendor
    };
}

test('accepts valid CE and HP default vendors', () => {
    assert.equal(
        validateEngineResult(makeValidEngineResult({
            CE: 'Vendor A',
            HP: 'Vendor B'
        })),
        true
    );
});

test('accepts null when neither plan type has a default vendor', () => {
    assert.equal(
        validateEngineResult(makeValidEngineResult({
            CE: null,
            HP: null
        })),
        true
    );
});

test('accepts one default vendor and one null default', () => {
    assert.equal(
        validateEngineResult(makeValidEngineResult({
            CE: 'Vendor A',
            HP: null
        })),
        true
    );
});

test('rejects a missing defaultVendor object', () => {
    const result = makeValidEngineResult();
    delete result.defaultVendor;

    assert.throws(
        () => validateEngineResult(result),
        (error) => error instanceof ValidationError
            && error.field === 'defaultVendor'
    );
});

test('rejects a missing CE default vendor key', () => {
    assert.throws(
        () => validateEngineResult(makeValidEngineResult({
            HP: 'Vendor B'
        })),
        (error) => error instanceof ValidationError
            && error.field === 'defaultVendor.CE'
    );
});

test('rejects a missing HP default vendor key', () => {
    assert.throws(
        () => validateEngineResult(makeValidEngineResult({
            CE: 'Vendor A'
        })),
        (error) => error instanceof ValidationError
            && error.field === 'defaultVendor.HP'
    );
});

test('rejects an empty CE vendor name', () => {
    assert.throws(
        () => validateEngineResult(makeValidEngineResult({
            CE: '   ',
            HP: 'Vendor B'
        })),
        (error) => error instanceof ValidationError
            && error.field === 'defaultVendor.CE'
    );
});

test('rejects a non-string HP default vendor value', () => {
    assert.throws(
        () => validateEngineResult(makeValidEngineResult({
            CE: 'Vendor A',
            HP: 123
        })),
        (error) => error instanceof ValidationError
            && error.field === 'defaultVendor.HP'
    );
});

test('rejects a non-object defaultVendor value', () => {
    assert.throws(
        () => validateEngineResult(makeValidEngineResult(null)),
        (error) => error instanceof ValidationError
            && error.field === 'defaultVendor'
    );
});
