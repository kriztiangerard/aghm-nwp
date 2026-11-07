'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validateVendorDescriptors,
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
