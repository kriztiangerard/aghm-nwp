// src/components/comparison/fixtures.ts  (dev/QA only, never imported by Comparison)
import type { BomLineItem, NetworkPlanData, PlanTier, VendorName, VendorPlansPayload } from "./types";
import { engineScenarios } from "./engine-sample-fixtures.ts";

const AT = "Oct 28, 2026, 9:00 AM";

const line = (o: Partial<BomLineItem> & Pick<BomLineItem, "sku" | "name" | "category" | "quantity" | "unitPrice">): BomLineItem => ({
  status: "ACTIVE", priceSource: "synchronized", isStale: false,
  priceUpdatedAt: "2026-10-27", isGeneric: false,
  subtotal: o.unitPrice === null ? null : o.unitPrice * o.quantity,
  ...o,
});

const plan = (vendor: VendorName, tier: PlanTier, bom: BomLineItem[], extra: Partial<NetworkPlanData> = {}): NetworkPlanData => ({
  vendor, tier, bom, generatedAt: AT, currency: "PHP",
  totalCost: bom.reduce((s, l) => s + (l.subtotal ?? 0), 0),
  totalIsPartial: bom.some((l) => l.unitPrice === null),
  complete: true, unmet: [], ...extra,
});

const omadaCE = plan("TP-Link Omada", "Cost-Efficient", [
  line({ sku: "ER605", name: "Omada Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 3500 }),
  line({ sku: "EAP610", name: "Omada AX1800 Ceiling AP", category: "Access Point", quantity: 2, unitPrice: 5200 }),
]);
const omadaHP = plan("TP-Link Omada", "High-Performance", [
  line({ sku: "ER7206", name: "Omada Multi-Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 9800 }),
  line({ sku: "EAP670", name: "Omada AX5400 Ceiling AP", category: "Access Point", quantity: 2, unitPrice: 8900 }),
]);
const unifiCE = plan("Ubiquiti UniFi", "Cost-Efficient", [
  line({ sku: "UDR", name: "UniFi Dream Router", category: "Gateway", quantity: 1, unitPrice: 12000 }),
]);
const unifiHP = plan("Ubiquiti UniFi", "High-Performance", [
  line({ sku: "UDM-Pro", name: "UniFi Dream Machine Pro", category: "Gateway", quantity: 1, unitPrice: 23000 }),
]);

export const scenarios: Record<string, VendorPlansPayload | undefined> = {
  loading: undefined,                                   // AC 1 loading state
  empty: {},                                            // AC 1 empty state
  happy: {                                              // AC 1, 2, 3, 4, 5, 6
    "TP-Link Omada": { "Cost-Efficient": omadaCE, "High-Performance": omadaHP },
    "Ubiquiti UniFi": { "Cost-Efficient": unifiCE, "High-Performance": unifiHP },
  },
  partial: {                                            // AC 2: options filtered per tier, no crash
    "TP-Link Omada": { "Cost-Efficient": omadaCE, "High-Performance": omadaHP },
    "Ubiquiti UniFi": { "Cost-Efficient": unifiCE },    // no HP for UniFi
  },
  nullPrice: {                                          // AC 4: "Price unavailable", partial total
    "TP-Link Omada": {
      "Cost-Efficient": plan("TP-Link Omada", "Cost-Efficient", [
        line({ sku: "ER605", name: "Omada Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 3500 }),
        line({ sku: "OC200", name: "Omada Hardware Controller", category: "Controller", quantity: 1, unitPrice: null }),
      ]),
    },
  },
  lineStates: {                                         // AC 4: stale, manual, Sunsetting, generic
    "TP-Link Omada": {
      "Cost-Efficient": plan("TP-Link Omada", "Cost-Efficient", [
        line({ sku: "ER605", name: "Omada Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 3500, status: "SUNSETTING" }),
        line({ sku: "EAP610", name: "Omada AX1800 Ceiling AP", category: "Access Point", quantity: 2, unitPrice: 5200, isStale: true, priceUpdatedAt: "2026-09-30" }),
        line({ sku: "SW-8", name: "Omada 8-Port PoE Switch", category: "Switch", quantity: 1, unitPrice: 4100, priceSource: "manual" }),
        line({ sku: "WALL-9U", name: "Generic 9U Wall Cabinet", category: "Enclosure", quantity: 1, unitPrice: 6500, isGeneric: true }),
      ]),
    },
  },
  incomplete: {                                         // AC 4: unmet list, no "complete" check mark
    "TP-Link Omada": {
      "Cost-Efficient": plan("TP-Link Omada", "Cost-Efficient", omadaCE.bom, {
        complete: false,
        unmet: ["No gateway in the catalog meets the required 2,000 Mbps routing throughput."],
      }),
    },
    ...engineScenarios, // engineSample, engineSampleComplete, engineSampleMixed
  },
};