'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculatePerFloorPorts,
  applyGrowthMultiplier
} = require('../../src/types/engine/devices/switches.js');

test('adds each floor AP count to evenly distributed edge and PoE ports', () => {
  const result = calculatePerFloorPorts({
    edgePorts: 10,
    poeEdgePorts: 4,
    apCountsPerFloor: [2, 1, 3]
  });

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 6, requiredPoePorts: 4 },
    { floor: 2, requiredPorts: 4, requiredPoePorts: 2 },
    { floor: 3, requiredPorts: 6, requiredPoePorts: 4 }
  ]);
});

test('distributes remainders to earlier floors', () => {
  const result = calculatePerFloorPorts({
    edgePorts: 10,
    poeEdgePorts: 4,
    apCountsPerFloor: [0, 0, 0]
  });

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 4, requiredPoePorts: 2 },
    { floor: 2, requiredPorts: 3, requiredPoePorts: 1 },
    { floor: 3, requiredPorts: 3, requiredPoePorts: 1 }
  ]);
});

test('supports a single floor', () => {
  const result = calculatePerFloorPorts({
    edgePorts: 8,
    poeEdgePorts: 3,
    apCountsPerFloor: [2]
  });

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 10, requiredPoePorts: 5 }
  ]);
});

test('rejects PoE edge ports greater than total edge ports', () => {
  assert.throws(
    () => calculatePerFloorPorts({
      edgePorts: 3,
      poeEdgePorts: 4,
      apCountsPerFloor: [1, 1]
    }),
    /poeEdgePorts cannot exceed edgePorts/
  );
});

test('rejects invalid AP counts', () => {
  assert.throws(
    () => calculatePerFloorPorts({
      edgePorts: 4,
      poeEdgePorts: 2,
      apCountsPerFloor: [2, -1]
    }),
    /apCountsPerFloor must contain non-negative integer counts/
  );
});

test('applies 30 percent growth and rounds up', () => {
  const result = applyGrowthMultiplier([
    { floor: 1, requiredPorts: 11, requiredPoePorts: 3 }
  ], 30);

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 15, requiredPoePorts: 4 }
  ]);
});

test('applies growth independently to each floor', () => {
  const result = applyGrowthMultiplier([
    { floor: 1, requiredPorts: 10, requiredPoePorts: 2 },
    { floor: 2, requiredPorts: 11, requiredPoePorts: 3 }
  ], 30);

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 13, requiredPoePorts: 3 },
    { floor: 2, requiredPorts: 15, requiredPoePorts: 4 }
  ]);
});

test('leaves requirements unchanged when growth is zero', () => {
  const result = applyGrowthMultiplier([
    { floor: 1, requiredPorts: 11, requiredPoePorts: 3 }
  ], 0);

  assert.deepEqual(result, [
    { floor: 1, requiredPorts: 11, requiredPoePorts: 3 }
  ]);
});

test('rejects invalid growth percentages', () => {
  assert.throws(
    () => applyGrowthMultiplier([
      { floor: 1, requiredPorts: 10, requiredPoePorts: 2 }
    ], 30.5),
    /growthPercent must be an integer from 0 to 100/
  );
});


const {
  getSupportedPoeStandards,
  supportsPoeRequirement,
} = require('../../src/types/engine/devices/switches.js');

test('PoE+ supports 802.3af and 802.3at, but not 802.3bt', () => {
  const sku = {
    name: 'Managed PoE+ Switch',
    description: 'Supports PoE+ ports',
    switch_specs: { poe_ports: 8 },
  };

  assert.deepEqual(
    [...getSupportedPoeStandards(sku)].sort(),
    ['af', 'at']
  );
  assert.equal(supportsPoeRequirement(sku, 'af'), true);
  assert.equal(supportsPoeRequirement(sku, 'at'), true);
  assert.equal(supportsPoeRequirement(sku, 'bt3'), false);
});

test('PoE++ supports 802.3af, 802.3at, and 802.3bt', () => {
  const sku = {
    name: 'Managed PoE++ Switch',
    description: 'Supports PoE++ ports',
    switch_specs: { poe_ports: 8 },
  };

  assert.equal(supportsPoeRequirement(sku, 'af'), true);
  assert.equal(supportsPoeRequirement(sku, 'at'), true);
  assert.equal(supportsPoeRequirement(sku, 'bt3'), true);
});

test('rejects unknown PoE standards when documentation is absent', () => {
  const sku = {
    name: 'Managed Gigabit Switch',
    description: 'Gigabit Ethernet switching',
  };

  assert.equal(getSupportedPoeStandards(sku).size, 0);
  assert.equal(supportsPoeRequirement(sku, 'at'), false);
});

test('does not infer PoE support from wattage alone', () => {
  const sku = {
    name: 'Managed Switch',
    description: 'Gigabit switching',
    switch_specs: {
      poe_ports: 24,
      poe_budget_w: 500,
    },
  };

  assert.equal(supportsPoeRequirement(sku, 'at'), false);
});

const {
  getPoePortCapabilities,
} = require('../../src/types/engine/devices/switches.js');

test('counts mixed PoE+ and PoE++ ports separately', () => {
  const sku = {
    name: 'TL-SG3428XPP-M2',
    description: '16-Port PoE+ & 8-Port PoE++',
    switch_specs: {
      poe_ports: 24,
    },
  };

  assert.deepEqual(getPoePortCapabilities(sku), {
    af: 24,
    at: 24,
    bt3: 8,
  });
});

test('counts every PoE port as bt3 for a fully PoE++ model', () => {
  const sku = {
    name: 'Managed PoE++ Switch',
    description: '24-Port PoE++',
    switch_specs: {
      poe_ports: 24,
    },
  };

  assert.deepEqual(getPoePortCapabilities(sku), {
    af: 24,
    at: 24,
    bt3: 24,
  });
});

test('returns zero capabilities when mixed port counts do not match catalog data', () => {
  const sku = {
    name: 'Mixed PoE Switch',
    description: '16-Port PoE+ & 8-Port PoE++',
    switch_specs: {
      poe_ports: 20,
    },
  };

  assert.deepEqual(getPoePortCapabilities(sku), {
    af: 0,
    at: 0,
    bt3: 0,
  });
});

const {
  switchMeetsRequirements,
} = require('../../src/types/engine/devices/switches.js');

const baseSwitch = {
  name: 'Managed PoE+ Switch',
  description: '24-Port PoE+',
  switch_specs: {
    port_count: 28,
    poe_ports: 24,
    poe_budget_w: 370,
    sfp_ports: 4,
  },
};

const baseSwitchRequirements = {
  requiredPorts: 20,
  requiredPoePorts: 4,
  requiredPoeBudgetW: 120,
  requiredPoeStandard: 'at',
  requiredUplinks: 2,
};

test('accepts a switch that meets all port, PoE, budget, and uplink requirements', () => {
  assert.equal(
    switchMeetsRequirements({
      switchSku: baseSwitch,
      ...baseSwitchRequirements,
    }),
    true
  );
});

test('rejects a switch with insufficient total port capacity', () => {
  assert.equal(
    switchMeetsRequirements({
      switchSku: {
        ...baseSwitch,
        switch_specs: { ...baseSwitch.switch_specs, port_count: 21 },
      },
      ...baseSwitchRequirements,
    }),
    false
  );
});

test('rejects a switch with insufficient PoE port count', () => {
  assert.equal(
    switchMeetsRequirements({
      switchSku: {
        ...baseSwitch,
        switch_specs: { ...baseSwitch.switch_specs, poe_ports: 3 },
      },
      ...baseSwitchRequirements,
    }),
    false
  );
});

test('rejects a switch with insufficient PoE power budget', () => {
  assert.equal(
    switchMeetsRequirements({
      switchSku: {
        ...baseSwitch,
        switch_specs: { ...baseSwitch.switch_specs, poe_budget_w: 100 },
      },
      ...baseSwitchRequirements,
    }),
    false
  );
});

test('rejects an af-only switch when an AP requires 802.3at', () => {
  const afOnlySwitch = {
    name: 'Managed PoE Switch',
    description: '24-Port PoE',
    switch_specs: {
      port_count: 28,
      poe_ports: 24,
      poe_budget_w: 500,
      sfp_ports: 4,
    },
  };

  assert.equal(
    switchMeetsRequirements({
      switchSku: afOnlySwitch,
      ...baseSwitchRequirements,
    }),
    false
  );
});

test('rejects a switch with insufficient uplink ports', () => {
  assert.equal(
    switchMeetsRequirements({
      switchSku: {
        ...baseSwitch,
        switch_specs: { ...baseSwitch.switch_specs, sfp_ports: 1 },
      },
      ...baseSwitchRequirements,
    }),
    false
  );
});

test('allows zero uplinks when the switch has no SFP ports', () => {
  assert.equal(
    switchMeetsRequirements({
      switchSku: {
        ...baseSwitch,
        switch_specs: {
          ...baseSwitch.switch_specs,
          sfp_ports: 0,
        },
      },
      requiredPorts: 20,
      requiredPoePorts: 4,
      requiredPoeBudgetW: 120,
      requiredPoeStandard: 'at',
      requiredUplinks: 0,
    }),
    true
  );
});


const {
  getMinimumIdenticalSwitchQuantity,
} = require('../../src/types/engine/devices/switches.js');

test('calculates the smallest quantity when one switch lacks enough total ports', () => {
  const sku = {
    name: 'Managed PoE+ Switch',
    description: '24-Port PoE+',
    switch_specs: {
      port_count: 28,
      poe_ports: 24,
      poe_budget_w: 370,
      sfp_ports: 4,
    },
  };

  assert.equal(getMinimumIdenticalSwitchQuantity({
    switchSku: sku,
    requiredPorts: 50,
    requiredPoePorts: 10,
    requiredPoeBudgetW: 200,
    requiredPoeStandard: 'at',
  }), 2);
});

test('calculates quantity from the PoE port count when that is the limiting capacity', () => {
  const sku = {
    name: 'Managed PoE+ Switch',
    description: '8-Port PoE+',
    switch_specs: {
      port_count: 10,
      poe_ports: 8,
      poe_budget_w: 370,
      sfp_ports: 2,
    },
  };

  assert.equal(getMinimumIdenticalSwitchQuantity({
    switchSku: sku,
    requiredPorts: 12,
    requiredPoePorts: 17,
    requiredPoeBudgetW: 500,
    requiredPoeStandard: 'at',
  }), 3);
});

test('returns no solution when the switch cannot provide the required PoE class', () => {
  const sku = {
    name: 'Managed PoE Switch',
    description: '24-Port PoE',
    switch_specs: {
      port_count: 28,
      poe_ports: 24,
      poe_budget_w: 500,
      sfp_ports: 4,
    },
  };

  assert.equal(getMinimumIdenticalSwitchQuantity({
    switchSku: sku,
    requiredPorts: 40,
    requiredPoePorts: 10,
    requiredPoeBudgetW: 200,
    requiredPoeStandard: 'at',
  }), null);
});

test('returns no solution when each switch lacks the required uplink capacity', () => {
  const sku = {
    name: 'Managed PoE+ Switch',
    description: '24-Port PoE+',
    switch_specs: {
      port_count: 28,
      poe_ports: 24,
      poe_budget_w: 370,
      sfp_ports: 1,
    },
  };

  assert.equal(getMinimumIdenticalSwitchQuantity({
    switchSku: sku,
    requiredPorts: 40,
    requiredPoePorts: 10,
    requiredPoeBudgetW: 200,
    requiredPoeStandard: 'at',
    requiredUplinks: 2,
  }), null);
});


const {
  calculateAccessSwitchUplinks,
} = require('../../src/types/engine/devices/switches.js');

test('requires zero access uplinks for a single-floor site, even with redundancy requested', () => {
  assert.equal(calculateAccessSwitchUplinks({
    floorCount: 1,
    redundancyRequired: true,
  }), 0);
});

test('requires one access uplink per switch for a multi-floor site without redundancy', () => {
  assert.equal(calculateAccessSwitchUplinks({
    floorCount: 3,
    redundancyRequired: false,
  }), 1);
});

test('requires two access uplinks per switch for a multi-floor site with redundancy', () => {
  assert.equal(calculateAccessSwitchUplinks({
    floorCount: 3,
    redundancyRequired: true,
  }), 2);
});

test('rejects invalid floor counts', () => {
  assert.throws(
    () => calculateAccessSwitchUplinks({
      floorCount: 0,
      redundancyRequired: false,
    }),
    /floorCount must be a positive integer/
  );
});


const {
  calculateCoreSwitchQuantity,
} = require('../../src/types/engine/devices/switches.js');

test('selects one core switch when redundancy is not required', () => {
  assert.equal(calculateCoreSwitchQuantity({
    redundancyRequired: false,
  }), 1);
});

test('selects two core switches when redundancy is required', () => {
  assert.equal(calculateCoreSwitchQuantity({
    redundancyRequired: true,
  }), 2);
});

test('rejects a non-boolean redundancy setting for core quantity', () => {
  assert.throws(
    () => calculateCoreSwitchQuantity({
      redundancyRequired: 'REQUIRED',
    }),
    /redundancyRequired must be a boolean/
  );
});


const {
  addSingleHomingLimitation,
} = require('../../src/types/engine/devices/switches.js');

test('adds the edge-device single-homing limitation flag', () => {
  const ctx = { ledger: [], flags: [], unmet: [] };

  addSingleHomingLimitation(ctx);

  assert.deepEqual(ctx.flags, [{
    code: 'EDGE_DEVICES_SINGLE_HOMED',
    message: 'Edge devices stay single-homed; redundant access uplinks do not provide dual-homing for edge devices.',
  }]);
});

test('preserves existing flags and avoids duplicate single-homing flags', () => {
  const existingFlag = { code: 'EXISTING_NOTE', message: 'Existing note' };
  const ctx = { ledger: [], flags: [existingFlag], unmet: [] };

  addSingleHomingLimitation(ctx);
  addSingleHomingLimitation(ctx);

  assert.equal(ctx.flags[0], existingFlag);
  assert.equal(
    ctx.flags.filter(flag => flag.code === 'EDGE_DEVICES_SINGLE_HOMED').length,
    1
  );
});

test('rejects a context without a flags array', () => {
  assert.throws(
    () => addSingleHomingLimitation({ ledger: [], unmet: [] }),
    /ctx.flags must be an array/
  );
});

test('allows a non-PoE switch when no PoE ports or power are required', () => {
  const sku = {
    name: 'Managed Non-PoE Switch',
    description: 'Gigabit Ethernet switching',
    switch_specs: {
      port_count: 24,
      poe_ports: 0,
      poe_budget_w: 0,
      sfp_ports: 0,
    },
  };

  assert.equal(getMinimumIdenticalSwitchQuantity({
    switchSku: sku,
    requiredPorts: 20,
    requiredPoePorts: 0,
    requiredPoeBudgetW: 0,
    requiredPoeStandard: 'af',
  }), 1);
});
