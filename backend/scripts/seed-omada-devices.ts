import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PoolClient } from "pg";

import { deviceSchemas } from "../db/catalog/schema/generated-schema";
import { pool } from "../src/config/database";

type JsonRecord = Record<string, unknown>;
type DeviceCategory = "gateway_router" | "switch" | "ap";

type CatalogFile = {
  fileName: string;
  category: DeviceCategory;
  subtypeTable: "GatewayRouter" | "Switch" | "AP" | "Firewall";
  subtypeFields: readonly string[];
};

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

class DatabaseSeedError extends Error {
  constructor(cause: unknown) {
    super("Database write failed.", { cause });
    this.name = "DatabaseSeedError";
  }
}

const catalogFiles: readonly CatalogFile[] = [
  {
    fileName: "omada-routers.json",
    category: "gateway_router",
    subtypeTable: "GatewayRouter",
    subtypeFields: [
      "wan_ports",
      "lan_ports",
      "max_throughput_mbps",
      "max_power_draw_w",
      "vpn_supported",
      "sfp_ports",
      "sfp_form_factor",
    ],
  },
  {
    fileName: "omada-switches.json",
    category: "switch",
    subtypeTable: "Switch",
    subtypeFields: [
      "port_count",
      "poe_ports",
      "poe_budget_w",
      "switching_capacity_gbps",
      "layer",
      "max_power_draw_w",
      "sfp_ports",
      "sfp_form_factor",
    ],
  },
  {
    fileName: "omada-aps.json",
    category: "ap",
    subtypeTable: "AP",
    subtypeFields: [
      "wifi_standard",
      "max_concurrent_clients",
      "max_data_rate_mbps",
      "supported_24ghz",
      "supported_5ghz",
      "supported_6ghz",
      "max_power_draw_w",
      "power_method",
    ],
  },
];

const deviceFields = [
  "vendor_id",
  "sku",
  "price",
  "price_updated_at",
  "name",
  "description",
  "is_rack_mountable",
  "u_height",
  "lifecycle_status",
  "eos_date",
  "eol_date",
] as const;

const firewallFields = [
  "firewall_throughputs_mbps",
  "vpn_throughput_mbps",
  "max_concurrent_sessions",
  "wan_ports",
  "lan_ports",
  "max_power_draw_w",
] as const;

const isRecord = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function formatValidationIssues(
  issues: unknown[],
  category: DeviceCategory
): string[] {
  return issues.flatMap((issue) => {
    if (!isRecord(issue)) {
      return ["invalid schema value"];
    }

    if (issue.code === "invalid_union" && Array.isArray(issue.errors)) {
      const categoryBranch = issue.errors.find(
        (branch) =>
          Array.isArray(branch) &&
          !branch.some(
            (nestedIssue) =>
              isRecord(nestedIssue) &&
              Array.isArray(nestedIssue.path) &&
              nestedIssue.path[0] === "category"
          )
      );
      const selectedIssues = Array.isArray(categoryBranch)
        ? categoryBranch
        : issue.errors.flat();
      return formatValidationIssues(selectedIssues, category);
    }

    const path = Array.isArray(issue.path)
      ? issue.path.filter((part): part is string => typeof part === "string")
      : [];
    const message =
      typeof issue.message === "string" ? issue.message : "invalid schema value";
    return [`${path.join(".") || category}: ${message}`];
  });
}

function getCatalogCapabilities(
  entry: JsonRecord,
  source: string
): string[] {
  const capabilities = entry.capabilities;
  if (capabilities === undefined) {
    return [];
  }

  if (
    !Array.isArray(capabilities) ||
    !capabilities.every(
      (capability) =>
        typeof capability === "string" && capability.trim().length > 0
    )
  ) {
    throw new Error(`${source}: capabilities must be an array of non-empty strings.`);
  }

  if (new Set(capabilities).size !== capabilities.length) {
    throw new Error(`${source}: capabilities must not contain duplicates.`);
  }

  return capabilities;
}

function validateEntry(
  value: unknown,
  source: string,
  expectedCategory: DeviceCategory
): { entry: JsonRecord; capabilities: string[] } {
  if (!isRecord(value)) {
    throw new Error(`${source}: catalog entry must be a JSON object.`);
  }

  if (value.category !== expectedCategory) {
    throw new Error(
      `${source}: expected category "${expectedCategory}", received "${String(value.category)}".`
    );
  }

  const capabilities = getCatalogCapabilities(value, source);
  // Catalog tags exceed the fixed capability enum and are resolved separately.
  const { capabilities: _capabilities, ...entryForValidation } = value;
  const parsed = deviceSchemas.safeParse(entryForValidation);

  if (!parsed.success) {
    const details = formatValidationIssues(
      parsed.error.issues,
      expectedCategory
    ).join("; ");
    throw new Error(`${source}: ${details}`);
  }

  if (typeof value.sku !== "string" || !value.sku.trim()) {
    throw new Error(`${source}: sku must be a non-empty string.`);
  }

  return { entry: value, capabilities };
}

async function upsertDevice(): {
  /*INSERT HERE */
}

async function upsertSubtype() {
  /*INSERT HERE */
}

async function upsertCapabilities(
  client: PoolClient,
  deviceId: number,
  capabilities: readonly string[]
): Promise<void> {
  const capabilityIds: number[] = [];

  for (const capability of capabilities) {
    const result = await client.query<{ capability_id: number }>(
      `INSERT INTO "Capability" ("capability_desc")
       VALUES ($1)
       ON CONFLICT ("capability_desc") DO UPDATE
       SET "capability_desc" = EXCLUDED."capability_desc"
       RETURNING "capability_id"`,
      [capability]
    );

    const capabilityId = result.rows[0]?.capability_id;
    if (capabilityId === undefined) {
      throw new Error(`Capability upsert returned no id for "${capability}".`);
    }
    capabilityIds.push(capabilityId);
  }

  await client.query(
    `DELETE FROM "DeviceCapability"
     WHERE "device_id" = $1
       AND NOT ("capability_id" = ANY($2::int[]))`,
    [deviceId, capabilityIds]
  );

  for (const capabilityId of capabilityIds) {
    await client.query(
      `INSERT INTO "DeviceCapability" ("device_id", "capability_id")
       VALUES ($1, $2)
       ON CONFLICT ("device_id", "capability_id") DO NOTHING`,
      [deviceId, capabilityId]
    );
  }
}

async function seedEntry(
  file: CatalogFile,
  source: string,
  value: unknown
): Promise<"inserted" | "updated"> {
  const { entry, capabilities } = validateEntry(
    value,
    source,
    file.category
  );
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (error) {
    throw new DatabaseSeedError(error);
  }
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    /*MAKE SURE UPSERTS ARE COMPATIBLE W THIS */

    const { deviceId, inserted } = await upsertDevice(client, entry);
    await upsertSubtype(
      client,
      deviceId,
      file.subtypeTable,
      file.subtypeFields,
      entry[`${file.category === "gateway_router" ? "gateway_router" : file.category}_specs`]
    );
    await upsertCapabilities(client, deviceId, capabilities);

    if (file.category === "gateway_router" && entry.firewall_specs) {
      await upsertFirewallSpecs(client, deviceId, entry.firewall_specs);
    }


    await client.query("COMMIT");
    transactionStarted = false;
    return inserted ? "inserted" : "updated";
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(`${source}: rollback failed:`, rollbackError);
      }
    }
    throw new DatabaseSeedError(error);
  } finally {
    client.release();
  }
}

async function upsertFirewallSpecs(): {
  /*INSERT FIREWALL HELPER HERE */
}

async function readCatalogFile(
  file: CatalogFile,
  counts: SeedCounts
): Promise<unknown[]> {
  const filePath = path.resolve(
    process.cwd(),
    "backend/db/catalog/omada",
    file.fileName
  );

  try {
    const text = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("catalog root must be a JSON array.");
    }
    return parsed;
  } catch (error) {
    counts.skipped += 1;
    console.error(`${file.fileName}: unable to read catalog:`, error);
    return [];
  }
}

async function main() {
  const counts: SeedCounts = { inserted: 0, updated: 0, skipped: 0 };
  let databaseFailure = false;

  console.log("Starting Omada device catalog seeding...");

  for (const file of catalogFiles) {
    const entries = await readCatalogFile(file, counts);

    for (const [index, entry] of entries.entries()) {
      const source = `${file.fileName}[${index}]`;
      try {
        const outcome = await seedEntry(file, source, entry);
        counts[outcome] += 1;
        console.log(`${source}: ${outcome} ${String(
          isRecord(entry) ? entry.sku : "entry"
        )}`);
      } catch (error) {
        counts.skipped += 1;
        if (error instanceof DatabaseSeedError) {
          databaseFailure = true;
        }
        console.error(`${source}: skipped:`, error);
      }
    }
  }

  console.log("Device catalog seeding summary:");
  console.log(`  Inserted: ${counts.inserted}`);
  console.log(`  Updated: ${counts.updated}`);
  console.log(`  Skipped: ${counts.skipped}`);
  if (databaseFailure) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Device catalog seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
