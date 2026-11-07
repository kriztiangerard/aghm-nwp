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
// ENGINE SHAPES (contracts.js, CONTRACT_VERSION 3)
// Only the fields this adapter reads. Plan.bom is already priced by the engine
// (NWP-BOM-001), so nothing is recomputed here.
// ---------------------------------------------------------------------------
const EXPECTED_CONTRACT_VERSION = 3;

type EngineTier = "CE" | "HP";
type EngineBomCategory = "gateway" | "controller" | "switch" | "access_point" | "enclosure";

interface EngineBomLine {
  category: EngineBomCategory;
  sku: string;
  name: string;
  vendor: string;
  qty: number;
  unitPrice: number | null; // null = price on request
  lineTotal: number | null; // null whenever unitPrice is null
  status: "ACTIVE" | "SUNSETTING";
  isGeneric: boolean;
  priceSource?: "synchronized" | "manual";
  isStale?: boolean;
  priceUpdatedAt?: string;
}

interface EngineBom {
  currency: string;
  lines: EngineBomLine[];
  total: number | null; // null when nothing is priced
  totalIsPartial: boolean; // true when any line is unpriced or the plan is incomplete
}

interface EngineUnmet {
  category?: string;
  vendor?: string;
  reason?: string;
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
  bom: EngineBom;
  unmet: EngineUnmet[];
  limitations?: string[];
  optics?: EngineOptics | null;
}

export interface EngineResult {
  contractVersion: number;
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

const adaptLine = (line: EngineBomLine): BomLineItem => ({
  sku: line.sku,
  name: line.name,
  category: CATEGORY_MAP[line.category],
  quantity: line.qty,
  unitPrice: line.unitPrice,
  subtotal: line.lineTotal,
  status: line.status,
  // Provenance is optional on the contract; these fallbacks keep the UI type satisfied.
  priceSource: line.priceSource ?? "manual",
  isStale: line.isStale ?? false,
  priceUpdatedAt: line.priceUpdatedAt ?? null,
  isGeneric: line.isGeneric,
});

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

const adaptPlan = (
  plan: EnginePlan,
  tier: PlanTier,
  vendor: VendorName,
  generatedAt: string
): NetworkPlanData => {
  const advisories = [...(plan.limitations ?? []), ...opticsAdvisory(plan.optics)];

  return {
    vendor,
    tier,
    bom: plan.bom.lines.map(adaptLine),
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
  if (result.contractVersion !== EXPECTED_CONTRACT_VERSION) {
    console.warn(
      `[adapter] Expected contract v${EXPECTED_CONTRACT_VERSION}, received v${result.contractVersion}`
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