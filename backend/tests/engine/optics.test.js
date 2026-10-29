'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  planOptics,
  countFiberLinks,
  countOpticModules,
  resolveFormFactor,
} = require('../../src/types/engine/devices/optics.js');

const { createCtx, ValidationError } = require('../../src/types/engine/ctx.js');

function makeSwitch(overrides = {}) {
  return {
    sfp_ports: 4,
    sfp_form_factor: 'SFP+',
    ...overrides,
  };
}

function makeInput(floors = 2) {
  return { floors };
}

function makeReqs(backbone = 'fiber', redundancy = 'none') {
  return { backbone, redundancy };
}

test('NWP-ENGINE-012-TC-001: one floor without redundancy requires one fiber link', () => {
  assert.equal(countFiberLinks(1, 'none'), 1);
});

test('NWP-ENGINE-012-TC-002: multiple floors without redundancy require one link per floor', () => {
  assert.equal(countFiberLinks(3, 'none'), 3);
});

test('NWP-ENGINE-012-TC-003: required redundancy doubles the links per floor', () => {
  assert.equal(countFiberLinks(3, 'required'), 6);
});

test('NWP-ENGINE-012-TC-004: backupWan does not double the fiber links', () => {
  assert.equal(countFiberLinks(3, 'backupWan'), 3);
});

test('NWP-ENGINE-012-TC-005: each fiber link requires two optic modules', () => {
  assert.equal(countOpticModules(4), 8);
});

test('NWP-ENGINE-012-TC-006: zero links require zero optic modules', () => {
  assert.equal(countOpticModules(0), 0);
});

test('NWP-ENGINE-012-TC-007: reject invalid floor counts', () => {
  for (const floors of [0, -1, 1.5, NaN, Infinity, '2', null]) {
    assert.throws(
      () => countFiberLinks(floors, 'none'),
      ValidationError,
      `Expected floors=${String(floors)} to be rejected`
    );
  }
});

test('NWP-ENGINE-012-TC-008: reject unsupported redundancy values', () => {
  for (const redundancy of ['invalid', 'Required', '', null, undefined]) {
    assert.throws(
      () => countFiberLinks(2, redundancy),
      ValidationError,
      `Expected redundancy=${String(redundancy)} to be rejected`
    );
  }
});

test('NWP-ENGINE-012-TC-009: reject invalid optic-module link counts', () => {
  for (const links of [-1, 1.5, NaN, Infinity, '2', null]) {
    assert.throws(
      () => countOpticModules(links),
      ValidationError,
      `Expected links=${String(links)} to be rejected`
    );
  }
});

test('NWP-ENGINE-012-TC-010: copper backbone returns null without optics flags', () => {
  const ctx = createCtx();
  const result = planOptics(
    makeInput(2),
    makeReqs('copper', 'none'),
    makeSwitch(),
    ctx
  );

  assert.equal(result, null);
  assert.deepEqual(ctx.flags, []);
  assert.deepEqual(ctx.ledger, []);
});

test('NWP-ENGINE-012-TC-011: fiber backbone calculates links, modules, and form factor', () => {
  const ctx = createCtx();
  const result = planOptics(
    makeInput(3),
    makeReqs('fiber', 'none'),
    makeSwitch({ sfp_form_factor: 'SFP+' }),
    ctx
  );

  assert.deepEqual(result, {
    links: 3,
    modules: 6,
    formFactor: 'SFP+',
  });
});

test('NWP-ENGINE-012-TC-012: required redundancy doubles links and modules', () => {
  const ctx = createCtx();
  const result = planOptics(
    makeInput(2),
    makeReqs('fiber', 'required'),
    makeSwitch(),
    ctx
  );

  assert.deepEqual(result, {
    links: 4,
    modules: 8,
    formFactor: 'SFP+',
  });
});

test('NWP-ENGINE-012-TC-013: missing SFP ports returns unknown form factor and adds a flag', () => {
  const ctx = createCtx();
  const result = planOptics(
    makeInput(2),
    makeReqs('fiber', 'none'),
    makeSwitch({ sfp_ports: 0 }),
    ctx
  );

  assert.deepEqual(result, {
    links: 2,
    modules: 4,
    formFactor: null,
  });

  assert.ok(ctx.flags.some(
    flag => flag.code === 'OPTICS_NO_SFP_PORTS'
  ));
});

test('NWP-ENGINE-012-TC-014: unknown form factor returns null and adds a warning flag', () => {
  const ctx = createCtx();
  const result = planOptics(
    makeInput(2),
    makeReqs('fiber', 'none'),
    makeSwitch({ sfp_form_factor: 'UNKNOWN' }),
    ctx
  );

  assert.deepEqual(result, {
    links: 2,
    modules: 4,
    formFactor: null,
  });

  assert.ok(ctx.flags.some(
    flag => flag.code === 'OPTICS_FORM_FACTOR_UNKNOWN'
  ));
});

test('NWP-ENGINE-012-TC-015: single-floor fiber adds ledger entry and compatibility advisory', () => {
  const ctx = createCtx();
  const result = planOptics(
    makeInput(1),
    makeReqs('fiber', 'none'),
    makeSwitch(),
    ctx
  );

  assert.deepEqual(result, {
    links: 1,
    modules: 2,
    formFactor: 'SFP+',
  });

  assert.ok(ctx.ledger.some(
    entry => entry.field === 'fiberLinks' && entry.valueUsed === 1
  ));

  assert.ok(ctx.flags.some(
    flag => flag.code === 'OPTICS_COMPATIBILITY_ADVISORY'
  ));
});
