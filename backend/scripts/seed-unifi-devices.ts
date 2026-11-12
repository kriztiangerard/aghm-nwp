
import "dotenv/config";
import type { PoolClient } from "pg";
import { pool } from "../src/config/database";

import routers from "../db/catalog/ubiquiti/unifi-routers.json";
import switches from "../db/catalog/ubiquiti/unifi-switches.json";
import aps from "../db/catalog/ubiquiti/unifi-aps.json";

import {
  deviceSchemas,
  type DeviceSchemas,
} from "../db/catalog/schema/generated-schema";

type DeviceSource = {
  name: string;
  devices: unknown[];
};

type RejectedDevice = {
  source: string;
  sku: string;
  errors: string[];
};

type DeviceResult = {
  deviceId: number;
  inserted: boolean;
};

const sources: DeviceSource[] = [
  { name: "UniFi Routers", devices: routers },
  { name: "UniFi Switches", devices: switches },
  { name: "UniFi Access Points", devices: aps },
];

function validateDevices(): {
  validDevices: DeviceSchemas[];
  rejectedDevices: RejectedDevice[];
} {
  const validDevices: DeviceSchemas[] = [];
  const rejectedDevices: RejectedDevice[] = [];

  for (const source of sources) {
    console.log(`\nChecking ${source.name}...`);

    for (const device of source.devices) {
      const record =
        typeof device === "object" && device !== null
          ? (device as Record<string, unknown>)
          : {};

      const sku =
        typeof record.sku === "string" ? record.sku : "Unknown SKU";

      const result = deviceSchemas.safeParse(device);

      if (result.success) {
        validDevices.push(result.data);
        console.log(`PASS: ${sku}`);
      } else {
        rejectedDevices.push({
          source: source.name,
          sku,
          errors: result.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
          ),
        });

        console.log(`FAIL: ${sku}`);
      }
    }
  }

  return { validDevices, rejectedDevices };
}

async function findProductLineId(
  client: PoolClient,
  device: any
): Promise<number> {
  const result = await client.query(
    `SELECT product_line_id
     FROM product_line
     WHERE vendor_id = $1
       AND category = $2
       AND name = $3`,
    [device.vendor_id, device.category, device.product_line]
  );

  if (result.rowCount === 0) {
    throw new Error(
      `Product line not found: ${device.category} / ${device.product_line}`
    );
  }

  return result.rows[0].product_line_id;
}

async function resolveCapabilityId(
  client: PoolClient,
  capabilityName: string
): Promise<number> {
  const existing = await client.query(
    `SELECT capability_id
     FROM capability
     WHERE capability_desc = $1`,
    [capabilityName]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    return existing.rows[0].capability_id;
  }

  // Capability IDs have no database default.
  // Lock before generating an ID to avoid concurrent MAX + 1 inserts.
  await client.query("LOCK TABLE capability IN EXCLUSIVE MODE");

  const recheck = await client.query(
    `SELECT capability_id
     FROM capability
     WHERE capability_desc = $1`,
    [capabilityName]
  );

  if (recheck.rowCount && recheck.rowCount > 0) {
    return recheck.rows[0].capability_id;
  }

  const nextId = await client.query(
    `SELECT COALESCE(MAX(capability_id), 0) + 1 AS next_id
     FROM capability`
  );

  const capabilityId = Number(nextId.rows[0].next_id);

  await client.query(
    `INSERT INTO capability (capability_id, capability_desc)
     VALUES ($1, $2)`,
    [capabilityId, capabilityName]
  );

  return capabilityId;
}

// Synchronize device capabilities with the incoming JSON entry.
async function linkCapabilities(
  client: PoolClient,
  deviceId: number,
  capabilities: string[] = []
): Promise<void> {
  const capabilityIds: number[] = [];

  for (const capabilityName of capabilities) {
    const capabilityId = await resolveCapabilityId(
      client,
      capabilityName
    );

    capabilityIds.push(capabilityId);
  }

  await client.query(
    `DELETE FROM device_capability
     WHERE device_id = $1
       AND NOT (capability_id = ANY($2::int[]))`,
    [deviceId, capabilityIds]
  );

  for (const capabilityId of capabilityIds) {
    await client.query(
      `INSERT INTO device_capability (device_id, capability_id)
       VALUES ($1, $2)
       ON CONFLICT (device_id, capability_id) DO NOTHING`,
      [deviceId, capabilityId]
    );
  }
}

async function upsertDevice(
  client: PoolClient,
  device: any,
  productLineId: number
): Promise<DeviceResult> {
  const result = await client.query(
    `INSERT INTO device (
      vendor_id,
      sku,
      price,
      price_updated_at,
      name,
      description,
      is_rack_mountable,
      u_height,
      lifecycle_status,
      eos_date,
      eol_date,
      product_line_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (vendor_id, sku)
    DO UPDATE SET
      price = EXCLUDED.price,
      price_updated_at = EXCLUDED.price_updated_at,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_rack_mountable = EXCLUDED.is_rack_mountable,
      u_height = EXCLUDED.u_height,
      lifecycle_status = EXCLUDED.lifecycle_status,
      eos_date = EXCLUDED.eos_date,
      eol_date = EXCLUDED.eol_date,
      product_line_id = EXCLUDED.product_line_id
    RETURNING device_id, (xmax = 0) AS inserted`,
    [
      device.vendor_id,
      device.sku,
      device.price,
      device.price_updated_at ?? null,
      device.name,
      device.description,
      device.is_rack_mountable,
      device.u_height,
      device.lifecycle_status,
      device.eos_date,
      device.eol_date,
      productLineId,
    ]
  );

  return {
    deviceId: result.rows[0].device_id,
    inserted: result.rows[0].inserted,
  };
}

async function upsertGatewayRouterSpecs(
  client: PoolClient,
  deviceId: number,
  specs: any
): Promise<void> {
  await client.query(
    `INSERT INTO gateway_router_specifications (
      device_id,
      wan_ports,
      lan_ports,
      max_throughput_mbps,
      max_power_draw_w,
      vpn_supported,
      sfp_ports,
      sfp_form_factor,
      ha_capability
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (device_id)
    DO UPDATE SET
      wan_ports = EXCLUDED.wan_ports,
      lan_ports = EXCLUDED.lan_ports,
      max_throughput_mbps = EXCLUDED.max_throughput_mbps,
      max_power_draw_w = EXCLUDED.max_power_draw_w,
      vpn_supported = EXCLUDED.vpn_supported,
      sfp_ports = EXCLUDED.sfp_ports,
      sfp_form_factor = EXCLUDED.sfp_form_factor,
      ha_capability = EXCLUDED.ha_capability`,
    [
      deviceId,
      specs.wan_ports,
      specs.lan_ports,
      specs.max_throughput_mbps,
      specs.max_power_draw_w,
      specs.vpn_supported,
      specs.sfp_ports ?? 0,
      specs.sfp_form_factor ?? null,
      specs.ha_capability ?? null,
    ]
  );
}

async function upsertSwitchSpecs(
  client: PoolClient,
  deviceId: number,
  specs: any
): Promise<void> {
  await client.query(
    `INSERT INTO switch_specifications (
      device_id,
      port_count,
      poe_ports,
      poe_budget_w,
      switching_capacity_gbps,
      layer,
      max_power_draw_w,
      sfp_ports,
      sfp_form_factor
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (device_id)
    DO UPDATE SET
      port_count = EXCLUDED.port_count,
      poe_ports = EXCLUDED.poe_ports,
      poe_budget_w = EXCLUDED.poe_budget_w,
      switching_capacity_gbps = EXCLUDED.switching_capacity_gbps,
      layer = EXCLUDED.layer,
      max_power_draw_w = EXCLUDED.max_power_draw_w,
      sfp_ports = EXCLUDED.sfp_ports,
      sfp_form_factor = EXCLUDED.sfp_form_factor`,
    [
      deviceId,
      specs.port_count,
      specs.poe_ports ?? null,
      specs.poe_budget_w ?? null,
      specs.switching_capacity_gbps,
      specs.layer,
      specs.max_power_draw_w ?? null,
      specs.sfp_ports ?? 0,
      specs.sfp_form_factor ?? null,
    ]
  );
}

async function upsertApSpecs(
  client: PoolClient,
  deviceId: number,
  specs: any
): Promise<void> {
  await client.query(
    `INSERT INTO ap_specifications (
      device_id,
      wifi_standard,
      max_concurrent_clients,
      max_data_rate_mbps,
      supported_24ghz,
      supported_5ghz,
      supported_6ghz,
      max_power_draw_w,
      power_method
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (device_id)
    DO UPDATE SET
      wifi_standard = EXCLUDED.wifi_standard,
      max_concurrent_clients = EXCLUDED.max_concurrent_clients,
      max_data_rate_mbps = EXCLUDED.max_data_rate_mbps,
      supported_24ghz = EXCLUDED.supported_24ghz,
      supported_5ghz = EXCLUDED.supported_5ghz,
      supported_6ghz = EXCLUDED.supported_6ghz,
      max_power_draw_w = EXCLUDED.max_power_draw_w,
      power_method = EXCLUDED.power_method`,
    [
      deviceId,
      specs.wifi_standard,
      specs.max_concurrent_clients ?? null,
      specs.max_data_rate_mbps,
      specs.supported_24ghz,
      specs.supported_5ghz,
      specs.supported_6ghz,
      specs.max_power_draw_w ?? null,
      specs.power_method ?? null,
    ]
  );
}

async function upsertFirewallSpecs(
  client: PoolClient,
  deviceId: number,
  specs: any
): Promise<void> {
  await client.query(
    `INSERT INTO firewall_specifications (
      device_id,
      firewall_throughputs_mbps,
      vpn_throughput_mbps,
      max_concurrent_sessions,
      wan_ports,
      lan_ports,
      max_power_draw_w,
      idps_throughput_mbps
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (device_id)
    DO UPDATE SET
      firewall_throughputs_mbps = EXCLUDED.firewall_throughputs_mbps,
      vpn_throughput_mbps = EXCLUDED.vpn_throughput_mbps,
      max_concurrent_sessions = EXCLUDED.max_concurrent_sessions,
      wan_ports = EXCLUDED.wan_ports,
      lan_ports = EXCLUDED.lan_ports,
      max_power_draw_w = EXCLUDED.max_power_draw_w,
      idps_throughput_mbps = EXCLUDED.idps_throughput_mbps`,
    [
      deviceId,
      specs.firewall_throughputs_mbps ?? null,
      specs.vpn_throughput_mbps ?? null,
      specs.max_concurrent_sessions ?? null,
      specs.wan_ports ?? null,
      specs.lan_ports ?? null,
      specs.max_power_draw_w ?? null,
      specs.idps_throughput_mbps ?? null,
    ]
  );
}

// Remove specification rows that no longer match the incoming device.
async function cleanupStaleSpecifications(
  client: PoolClient,
  deviceId: number,
  device: any
): Promise<void> {
  const subtypeTables = {
    gateway_router: "gateway_router_specifications",
    switch: "switch_specifications",
    ap: "ap_specifications",
  } as const;

  for (const [category, table] of Object.entries(subtypeTables)) {
    if (category !== device.category) {
      await client.query(
        `DELETE FROM ${table} WHERE device_id = $1`,
        [deviceId]
      );
    }
  }

  if (device.category !== "gateway_router" || !device.firewall_specs) {
    await client.query(
      `DELETE FROM firewall_specifications WHERE device_id = $1`,
      [deviceId]
    );
  }
}

async function upsertDeviceWithSpecs(
  client: PoolClient,
  device: any,
  productLineId: number
): Promise<DeviceResult> {
  // Lock an existing device before cleaning up its related rows.
  const existing = await client.query(
    `SELECT device_id
     FROM device
     WHERE vendor_id = $1
       AND sku = $2
     FOR UPDATE`,
    [device.vendor_id, device.sku]
  );

  const existingDeviceId = existing.rows[0]?.device_id;

  if (existingDeviceId) {
    await cleanupStaleSpecifications(
      client,
      existingDeviceId,
      device
    );
  }

  const result = await upsertDevice(client, device, productLineId);
  const deviceId = result.deviceId;

  if (device.category === "gateway_router") {
    if (!device.gateway_router_specs) {
      throw new Error(`Missing gateway router specifications: ${device.sku}`);
    }

    await upsertGatewayRouterSpecs(
      client,
      deviceId,
      device.gateway_router_specs
    );

    if (device.firewall_specs) {
      await upsertFirewallSpecs(
        client,
        deviceId,
        device.firewall_specs
      );
    }
  } else if (device.category === "switch") {
    if (!device.switch_specs) {
      throw new Error(`Missing switch specifications: ${device.sku}`);
    }

    await upsertSwitchSpecs(
      client,
      deviceId,
      device.switch_specs
    );
  } else if (device.category === "ap") {
    if (!device.ap_specs) {
      throw new Error(`Missing AP specifications: ${device.sku}`);
    }

    await upsertApSpecs(client, deviceId, device.ap_specs);
  } else {
    throw new Error(`Unsupported device category: ${device.category}`);
  }

  await linkCapabilities(
    client,
    deviceId,
    device.capabilities ?? []
  );

  return result;
}

async function seedOneDevice(device: any): Promise<DeviceResult> {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const productLineId = await findProductLineId(client, device);

    const result = await upsertDeviceWithSpecs(
      client,
      device,
      productLineId
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return result;
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log("Starting UniFi device seeding...");

  // Validate all input records before performing any database writes.
  const { validDevices, rejectedDevices } = validateDevices();

  const totalDevices = sources.reduce(
    (total, source) => total + source.devices.length,
    0
  );

  let inserted = 0;
  let updated = 0;
  let skipped = rejectedDevices.length;

  console.log("\n========== VALIDATION SUMMARY ==========");
  console.log(`Total devices: ${totalDevices}`);
  console.log(`Passed: ${validDevices.length}`);
  console.log(`Failed: ${rejectedDevices.length}`);
  console.log("========================================");

  for (const device of rejectedDevices) {
    console.error(`\nSKIPPED: ${device.sku} (${device.source})`);
    for (const error of device.errors) {
      console.error(`  - ${error}`);
    }
  }

  const connection = await pool.query("SELECT NOW()");
  console.log("\nDatabase connection successful.");
  console.log("Database time:", connection.rows[0].now);

  for (const device of validDevices) {
    try {
      const result = await seedOneDevice(device);

      if (result.inserted) {
        inserted++;
        console.log(`INSERTED: ${device.sku} (ID: ${result.deviceId})`);
      } else {
        updated++;
        console.log(`UPDATED: ${device.sku} (ID: ${result.deviceId})`);
      }
    } catch (error) {
      skipped++;

      const message =
        error instanceof Error ? error.message : String(error);

      console.error(`SKIPPED: ${device.sku} — ${message}`);
    }
  }

  console.log("\n========== UNIFI INGESTION SUMMARY ==========");
  console.log(`Total devices: ${totalDevices}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log("=============================================");
}

main()
  .catch((error) => {
    console.error("UniFi device catalog seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
