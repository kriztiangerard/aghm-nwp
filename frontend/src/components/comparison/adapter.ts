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
// ENGINE SHAPES
// GROUNDED in contract v2: CatalogSku fields, SelectionResult {sku, qty, flags},
//   unmet {category, vendor, reason}, tiers CE/HP, categories.
// STILL ASSUMED (not in the contract yet, confirm against the stories):
//   plan wrapper (`lines`, `limitations`, `optics`, `installationMaterials`),
//   flag object shape (`code`), and where the v3 price fields sit (on the sku).
// ---------------------------------------------------------------------------
type EngineTier = "CE" | "HP";
type CatalogCategory = "gateway" | "access_point" | "switch" | "optic" | "enclosure";

interface EngineCatalogSku {
  sku: string;
  name?: string; // required in contract v3
  vendor: string;
  category: CatalogCategory;
  status: "ACTIVE" | "SUNSETTING" | "DISCONTINUED";
  price: number | null;
  currency: string;
  capabilities?: string[]; // v3
  // v3 price provenance, from the catalog export (Pricing table)
  priceSource?: "synchronized" | "manual";
  isStale?: boolean;
  priceUpdatedAt?: string | null;
}

type EngineFlag = string | { code: string; [key: string]: unknown };

interface EngineUnmet {
  category: string;
  vendor: string;
  reason: string;
}

interface EnginePlanLine {
  sku: EngineCatalogSku;
  qty: number;
  flags: EngineFlag[];
}

interface EngineOptics {
  moduleCount: number;
  formFactor: string;
}

interface EngineMaterialRow {
  key: string;
  label: string;
  quantity: number;
  unitPrice: number | null; // representative prices are still open
}

interface EnginePlan {
  vendor: string;
  tier: EngineTier;
  complete: boolean;
  unmet: EngineUnmet[];
  limitations?: string[];
  lines: EnginePlanLine[];
  optics?: EngineOptics | null;
  installationMaterials?: EngineMaterialRow[];
}

export interface EngineResult {
  plans: EnginePlan[];
  defaultVendor?: { CE?: string | null; HP?: string | null };
  generatedAt: string; // stamped by the handler, since the engine has no clock
}
// ---------------------------------------------------------------------------

const TIER_MAP: Record<EngineTier, PlanTier> = {
  CE: "Cost-Efficient",
  HP: "High-Performance",
};

const CATEGORY_MAP: Record<CatalogCategory, BomCategory> = {
  gateway: "Gateway",
  switch: "Switch",
  access_point: "Access Point",
  optic: "Optic",
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

const hasFlag = (flags: EngineFlag[], code: string) =>
  flags.some((f) => (typeof f === "string" ? f : f.code) === code);

const round2 = (n: number) => Math.round(n * 100) / 100;

const lineTotal = (unitPrice: number | null, quantity: number) =>
  unitPrice === null ? null : round2(unitPrice * quantity);

const adaptLine = ({ sku, qty, flags }: EnginePlanLine): BomLineItem => ({
  sku: sku.sku,
  name: sku.name ?? sku.sku,
  category: CATEGORY_MAP[sku.category],
  quantity: qty,
  unitPrice: sku.price,
  subtotal: lineTotal(sku.price, qty),
  status: sku.status,
  // Fallbacks apply only until contract v3 makes these required.
  priceSource: sku.priceSource ?? "manual",
  isStale: sku.isStale ?? false,
  priceUpdatedAt: sku.priceUpdatedAt ?? null,
  isGeneric: sku.category === "enclosure" && hasFlag(flags, "ENCLOSURE_GENERIC"),
});

// SFP modules are never catalog BOM lines; the row comes from plan.optics.
const adaptOptics = (optics: EngineOptics): BomLineItem => ({
  sku: "SFP-MODULE",
  name: `SFP module (${optics.formFactor})`,
  category: "Optic",
  quantity: optics.moduleCount,
  unitPrice: null,
  subtotal: null,
  priceSource: "manual",
  isStale: false,
  priceUpdatedAt: null,
  isGeneric: true,
});

const adaptMaterial = (row: EngineMaterialRow): BomLineItem => ({
  sku: `MATERIAL-${row.key.toUpperCase()}`,
  name: row.label,
  category: "Installation Material",
  quantity: row.quantity,
  unitPrice: row.unitPrice,
  subtotal: lineTotal(row.unitPrice, row.quantity),
  priceSource: "manual",
  isStale: false,
  priceUpdatedAt: null,
  isGeneric: true,
});

const formatUnmet = (u: EngineUnmet) => `${u.category} (${u.vendor}): ${u.reason}`;

const adaptPlan = (
  plan: EnginePlan,
  vendor: VendorName,
  generatedAt: string
): NetworkPlanData => {
  const bom: BomLineItem[] = [
    ...plan.lines.map(adaptLine),
    ...(plan.optics && plan.optics.moduleCount > 0 ? [adaptOptics(plan.optics)] : []),
    ...(plan.installationMaterials ?? []).map(adaptMaterial),
  ];

  // Priced lines only; a null price never silently counts as 0.
  const totalCost = round2(bom.reduce((sum, l) => sum + (l.subtotal ?? 0), 0));

  return {
    vendor,
    tier: TIER_MAP[plan.tier],
    bom,
    totalCost,
    totalIsPartial: bom.some((l) => l.unitPrice === null),
    complete: plan.complete,
    unmet: plan.unmet.map(formatUnmet),
    generatedAt,
    currency: plan.lines[0]?.sku.currency ?? "PHP",
    advisories: plan.limitations,
  };
};

export interface AdaptedPlans {
  plansData: VendorPlansPayload;
  defaultVendors: DefaultVendors;
}

export function adaptEngineResult(result: EngineResult): AdaptedPlans {
  const plansData: VendorPlansPayload = {};

  for (const plan of result.plans) {
    const vendor = toVendorName(plan.vendor);
    if (!vendor) {
      console.warn(`[adapter] Unknown vendor "${plan.vendor}", plan skipped`);
      continue;
    }
    const tier = TIER_MAP[plan.tier];
    plansData[vendor] = {
      ...plansData[vendor],
      [tier]: adaptPlan(plan, vendor, result.generatedAt),
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