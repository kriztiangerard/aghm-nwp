import {
  VENDOR_NAMES,
  type BomCategory,
  type BomLineItem,
  type DefaultVendors,
  type NetworkPlanData,
  type PlanTier,
  type VendorName,
  type VendorPlansPayload,
} from "./types";

// ---------------------------------------------------------------------------
// ENGINE SHAPES (contracts.js v3, checked against a real engine output)
// Plan.bom is already priced by the engine (NWP-BOM-001), so nothing is
// recomputed here. Fields marked "contract-required" are missing from the
// engine's actual BOM lines today, so the adapter falls back instead of crashing.
// ---------------------------------------------------------------------------
const EXPECTED_CONTRACT_MAJOR = 3;

type EngineTier = "CE" | "HP";
type EngineBomCategory = "gateway" | "controller" | "switch" | "access_point" | "enclosure";

interface EngineItem {
  category: EngineBomCategory;
  sku: string;
  qty: number;
}

interface EngineBomLine {
  sku: string;
  qty: number;
  unitPrice: number | null; // null = price on request
  lineTotal: number | null; // null whenever unitPrice is null
  // Contract-required, currently absent from engine output (fallbacks in adaptLine):
  category?: EngineBomCategory;
  name?: string;
  vendor?: string;
  status?: "ACTIVE" | "SUNSETTING";
  isGeneric?: boolean;
  // Contract-optional:
  priceSource?: "synchronized" | "manual";
  isStale?: boolean;
  priceUpdatedAt?: string;
}

interface EngineBom {
  currency: string;
  lines: EngineBomLine[];
  total: number | null; // null when nothing is priced
  totalIsPartial: boolean; // true when any line is unpriced OR the plan is incomplete
}

interface EngineUnmet {
  category?: string;
  vendor?: string;
  reason?: string;
}

interface EngineFlag {
  code: string;
  message?: string;
  [key: string]: unknown;
}

// A requirement only, never a BOM line (NWP-ENGINE-012).
interface EngineOptics {
  links: number;
  modules: number;
  formFactor: string | null;
}

interface EnginePlan {
  vendor: string;
  planType: EngineTier;
  complete: boolean;
  items: EngineItem[];
  bom: EngineBom;
  unmet: EngineUnmet[];
  flags?: EngineFlag[];
  limitations?: string[];
  optics?: EngineOptics | null;
}

export interface EngineResult {
  // The contract says the number 3; the engine currently sends "3.0.0". Both are accepted.
  contractVersion: number | string;
  generatedAt: string; // stamped by the handler, since the engine has no clock
  plans: EnginePlan[];
  defaultVendor?: { CE?: string | null; HP?: string | null };
}
// ---------------------------------------------------------------------------

const TIER_MAP: Record<EngineTier, PlanTier> = {
  CE: "Cost-Efficient",
  HP: "High-Performance",
};

// Requires "Controller" to exist in BomCategory (types.ts).
const CATEGORY_MAP: Record<EngineBomCategory, BomCategory> = {
  gateway: "Gateway",
  controller: "Controller",
  switch: "Switch",
  access_point: "Access Point",
  enclosure: "Enclosure",
};

// One spelling everywhere: the only place alternate spellings are tolerated.
const VENDOR_ALIASES: Record<string, VendorName> = {
  "Aruba Instant On": "HPE Aruba Instant On",
  Aruba: "HPE Aruba Instant On",
};

const toVendorName = (raw: string): VendorName | null => {
  if ((VENDOR_NAMES as readonly string[]).includes(raw)) return raw as VendorName;
  return VENDOR_ALIASES[raw] ?? null;
};

const SUNSETTING_FLAG = "SKU_SUNSETTING";

// Interim: until the engine sets `status` on BOM lines, a SKU counts as sunsetting
// when a SKU_SUNSETTING flag's message names it (e.g. "SG3428: confirm availability").
const sunsettingSkusOf = (plan: EnginePlan): Set<string> => {
  const messages = (plan.flags ?? [])
    .filter((f) => f.code === SUNSETTING_FLAG && typeof f.message === "string")
    .map((f) => f.message as string);
  return new Set(
    plan.items.map((i) => i.sku).filter((sku) => messages.some((m) => m.includes(sku)))
  );
};

const adaptLine = (
  line: EngineBomLine,
  categoryBySku: Map<string, EngineBomCategory>,
  sunsetting: Set<string>
): BomLineItem => {
  const category = line.category ?? categoryBySku.get(line.sku);
  if (!category) {
    // Failing loudly beats showing a line with no category.
    throw new Error(`[adapter] BOM line ${line.sku} has no category and is not in plan.items`);
  }
  return {
    sku: line.sku,
    name: line.name ?? line.sku,
    category: CATEGORY_MAP[category],
    quantity: line.qty,
    unitPrice: line.unitPrice,
    subtotal: line.lineTotal,
    status: line.status ?? (sunsetting.has(line.sku) ? "SUNSETTING" : "ACTIVE"),
    // Provenance is optional on the contract; these fallbacks keep the UI type satisfied.
    priceSource: line.priceSource ?? "manual",
    isStale: line.isStale ?? false,
    priceUpdatedAt: line.priceUpdatedAt ?? null,
    isGeneric: line.isGeneric ?? false,
  };
};

const formatUnmet = (u: EngineUnmet): string => {
  const reason = u.reason ?? "Requirement not met";
  const where = [u.category, u.vendor ? `(${u.vendor})` : null].filter(Boolean).join(" ");
  return where ? `${where}: ${reason}` : reason;
};

// Optics are not billed, so they surface as an advisory instead of a BOM row.
const opticsAdvisory = (optics?: EngineOptics | null): string[] =>
  optics && optics.modules > 0
    ? [
        `Fiber links need ${optics.modules} ${optics.formFactor ?? "SFP"} transceiver module${
          optics.modules === 1 ? "" : "s"
        }. Not included in the total.`,
      ]
    : [];

// Manuscript: sunsetting devices may be recommended but must carry a notice to confirm availability.
const sunsettingAdvisories = (plan: EnginePlan): string[] =>
  (plan.flags ?? [])
    .filter((f) => f.code === SUNSETTING_FLAG && typeof f.message === "string")
    .map((f) => f.message as string);

const adaptPlan = (
  plan: EnginePlan,
  tier: PlanTier,
  vendor: VendorName,
  generatedAt: string
): NetworkPlanData => {
  const categoryBySku = new Map(plan.items.map((i) => [i.sku, i.category]));
  const sunsetting = sunsettingSkusOf(plan);
  const advisories = [
    ...(plan.limitations ?? []),
    ...sunsettingAdvisories(plan),
    ...opticsAdvisory(plan.optics),
  ];

  return {
    vendor,
    tier,
    bom: plan.bom.lines.map((l) => adaptLine(l, categoryBySku, sunsetting)),
    // bom.total is null when nothing is priced. 0 plus totalIsPartial lets the
    // card show "price unavailable" instead of a misleading 0.00.
    totalCost: plan.bom.total ?? 0,
    totalIsPartial: plan.bom.totalIsPartial,
    complete: plan.complete,
    unmet: plan.unmet.map(formatUnmet),
    generatedAt,
    currency: plan.bom.currency,
    advisories: advisories.length > 0 ? advisories : undefined,
  };
};

export interface AdaptedPlans {
  plansData: VendorPlansPayload;
  defaultVendors: DefaultVendors;
}

export function adaptEngineResult(result: EngineResult): AdaptedPlans {
  const major = Number.parseInt(String(result.contractVersion), 10);
  if (major !== EXPECTED_CONTRACT_MAJOR) {
    console.warn(
      `[adapter] Expected contract v${EXPECTED_CONTRACT_MAJOR}, received "${result.contractVersion}"`
    );
  }

  const plansData: VendorPlansPayload = {};

  for (const plan of result.plans) {
    const vendor = toVendorName(plan.vendor);
    if (!vendor) {
      console.warn(`[adapter] Unknown vendor "${plan.vendor}", plan skipped`);
      continue;
    }
    const tier = TIER_MAP[plan.planType];
    if (!tier) {
      console.warn(`[adapter] Unknown planType "${plan.planType}" for ${plan.vendor}, plan skipped`);
      continue;
    }
    plansData[vendor] = {
      ...plansData[vendor],
      [tier]: adaptPlan(plan, tier, vendor, result.generatedAt),
    };
  }

  const mapDefault = (raw?: string | null): VendorName | null =>
    raw ? toVendorName(raw) : null;

  return {
    plansData,
    defaultVendors: {
      "Cost-Efficient": mapDefault(result.defaultVendor?.CE),
      "High-Performance": mapDefault(result.defaultVendor?.HP),
    },
  };
}