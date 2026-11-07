import "dotenv/config";
import type { PoolClient } from "pg";
import { pool } from "../src/config/database";

import routers from "../db/catalog/omada/omada-routers.json";
import switches from "../db/catalog/omada/omada-switches.json";
import aps from "../db/catalog/omada/omada-aps.json";

async function insertDevice(client: PoolClient, device: any): Promise<number> {
  const result = await client.query(
    `
      INSERT INTO device (
        vendor_id,
        sku,
        price,
        name,
        description,
        is_rack_mountable,
        u_height,
        lifecycle_status,
        eos_date,
        eol_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING device_id
    `,
    [
      device.vendor_id,
      device.sku,
      device.price,
      device.name,
      device.description,
      device.is_rack_mountable,
      device.u_height,
      device.lifecycle_status,
      device.eos_date,
      device.eol_date,
    ],
  );

  return result.rows[0].device_id;
}

async function insertGatewayRouterSpecs(
  client: PoolClient,
  deviceId: number,
  specs: any,
): Promise<void> {
  await client.query(
    `
      INSERT INTO gateway_router_specifications (
        device_id,
        wan_ports,
        lan_ports,
        max_throughput_mbps,
        max_power_draw_w,
        vpn_supported,
        sfp_ports,
        sfp_form_factor
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      deviceId,
      specs.wan_ports,
      specs.lan_ports,
      specs.max_throughput_mbps,
      specs.max_power_draw_w,
      specs.vpn_supported,
      specs.sfp_ports ?? null,
      specs.sfp_form_factor ?? null,
    ],
  );
}

async function insertSwitchSpecs(
  client: PoolClient,
  deviceId: number,
  specs: any,
): Promise<void> {
  await client.query(
    `
      INSERT INTO switch_specifications (
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
    `,
    [
      deviceId,
      specs.port_count,
      specs.poe_ports,
      specs.poe_budget_w,
      specs.switching_capacity_gbps,
      specs.layer,
      specs.max_power_draw_w ?? null,
      specs.sfp_ports ?? null,
      specs.sfp_form_factor ?? null,
    ],
  );
}

async function insertApSpecs(
  client: PoolClient,
  deviceId: number,
  specs: any,
): Promise<void> {
  await client.query(
    `
      INSERT INTO ap_specifications (
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
    `,
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
    ],
  );
}

async function insertFirewallSpecs(
  client: PoolClient,
  deviceId: number,
  specs: any,
): Promise<void> {
  await client.query(
    `
      INSERT INTO firewall_specifications (
        device_id,
        firewall_throughputs_mbps,
        vpn_throughput_mbps,
        max_concurrent_sessions,
        wan_ports,
        lan_ports,
        max_power_draw_w
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      deviceId,
      specs.firewall_throughputs_mbps,
      specs.vpn_throughput_mbps,
      specs.max_concurrent_sessions,
      specs.wan_ports,
      specs.lan_ports,
      specs.max_power_draw_w,
    ],
  );
}

async function insertDeviceWithSpecs(
  client: PoolClient,
  device: any,
): Promise<number> {
  const deviceId = await insertDevice(client, device);

  if (device.category === "gateway_router") {
    await insertGatewayRouterSpecs(
      client,
      deviceId,
      device.gateway_router_specs,
    );

    if (device.firewall_specs) {
      await insertFirewallSpecs(
        client,
        deviceId,
        device.firewall_specs,
      );
    }
  } else if (device.category === "switch") {
    await insertSwitchSpecs(
      client,
      deviceId,
      device.switch_specs,
    );
  } else if (device.category === "ap") {
    await insertApSpecs(
      client,
      deviceId,
      device.ap_specs,
    );
  } else {
    throw new Error(`Unsupported device category: ${device.category}`);
  }

  return deviceId;
}

async function seedOneDevice(device: any): Promise<number> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const deviceId = await insertDeviceWithSpecs(client, device);

    await client.query("COMMIT");

    return deviceId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log("Starting device seeding...");

  const result = await pool.query("SELECT NOW()");

  console.log("Database connection successful.");
  console.log("Database time:", result.rows[0].now);

  const devices = [
    ...routers,
    ...switches,
    ...aps,
  ];

  console.log(`Loaded ${routers.length} routers.`);
  console.log(`Loaded ${switches.length} switches.`);
  console.log(`Loaded ${aps.length} access points.`);
  console.log(`Loaded ${devices.length} devices total.`);

  if (routers.length === 0) {
    throw new Error("No routers found to test device insertion.");
  }

  // Test only one router until the RDS schema mismatch is resolved.
  const deviceId = await seedOneDevice(routers[0]);

  console.log(`Inserted device with ID: ${deviceId}`);
}

main()
  .catch((error) => {
    console.error("Device catalog seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

