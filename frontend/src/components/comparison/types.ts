// Single source of truth for the comparison front end.
// Imported by Comparison, PlanCard, the adapter, and the final report page.

// One spelling everywhere. The engine matches on the catalog `vendor` string,
// so these values must equal the catalog values exactly.
export const VENDOR_NAMES = [
  "TP-Link Omada",
  "Ubiquiti UniFi",
  "HPE Aruba Instant On", // TODO: confirm against the catalog string
  "Cisco Business",
  "Ruijie Reyee",
  "Grandstream GWN Cloud",
] as const;

export type VendorName = (typeof VENDOR_NAMES)[number];

export const PLAN_TIERS = ["Cost-Efficient", "High-Performance"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export type BomCategory =
  | "Gateway"
  | "Switch"
  | "Access Point"
  | "Optic"
  | "Enclosure"
  | "Controller"
  | "Installation Material";

export type PriceSource = "synchronized" | "manual";

export interface BomLineItem {
  sku: string;
  name: string; // was modelName; matches CatalogSku.name in contract v3
  category: BomCategory;
  quantity: number;
  unitPrice: number | null; // null = "Price unavailable", never 0
  subtotal: number | null; // null whenever unitPrice is null
  status?: "ACTIVE" | "SUNSETTING" | "DISCONTINUED";
  priceSource: PriceSource;
  isStale: boolean;
  priceUpdatedAt: string | null; // stays at the last verified date while stale
  isGeneric: boolean; // generic enclosure, not a vendor part
}

export interface NetworkPlanData {
  vendor: VendorName;
  tier: PlanTier;
  bom: BomLineItem[];
  totalCost: number; // sum of the priced lines only
  totalIsPartial: boolean; // true when any line has a null price
  complete: boolean;
  unmet: string[]; // unmet requirements, shown when !complete
  generatedAt: string; // from the handler (the engine has no clock); was pricingTimestamp
  currency: string;
  advisories?: string[];
}

// Partial at both levels: a vendor may be missing entirely,
// or have a plan for only one tier.
export type VendorPlansPayload = Partial<
  Record<VendorName, Partial<Record<PlanTier, NetworkPlanData>>>
>;

// One default per tier, from NWP-ENGINE-017 ({CE, HP}, mapped by the adapter).
export type DefaultVendors = Partial<Record<PlanTier, VendorName | null>>;