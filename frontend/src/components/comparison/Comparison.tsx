// eslint-disable-next-line react-refresh/only-export-components

import React, { useState } from "react";
import { PlanCard } from "./plancard";

// --- Shared Types & Interfaces ---

export type VendorName =
  | "TP-Link Omada"
  | "Ubiquiti UniFi"
  | "HPE Aruba Instant On"
  | "Cisco Business"
  | "Ruijie Reyee"
  | "Grandstream GWN Cloud";

export type PlanTier = "Cost-Efficient" | "High-Performance";

export interface BomLineItem {
  sku: string;
  modelName: string;
  category:
    | "Gateway"
    | "Switch"
    | "Access Point"
    | "Optic"
    | "Enclosure"
    | "Controller";
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status?: "ACTIVE" | "SUNSETTING";
}

export interface NetworkPlanData {
  vendor: VendorName;
  tier: PlanTier;
  bom: BomLineItem[];
  totalCost: number;
  pricingTimestamp: string;
  currency: string;
  advisories?: string[];
}

export type VendorPlansPayload = Record<
  VendorName,
  {
    "Cost-Efficient": NetworkPlanData;
    "High-Performance": NetworkPlanData;
  }
>;

interface ComparisonProps {
  plansData?: VendorPlansPayload;
  defaultVendor?: VendorName;
}

// --- Shared Currency Formatter (PHP) ---
export const formatCurrency = (amount: number, currency = "PHP") => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// --- Fallback Mock Data ---
const MOCK_PLANS_DATA: VendorPlansPayload = {
  "TP-Link Omada": {
    "Cost-Efficient": {
      vendor: "TP-Link Omada",
      tier: "Cost-Efficient",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 48500,
      bom: [
        { sku: "ER605", modelName: "Omada Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 3500, subtotal: 3500 },
        { sku: "TL-SG2428P", modelName: "JetStream 28-Port Gigabit Smart Switch with 24-Port PoE+", category: "Switch", quantity: 2, unitPrice: 13500, subtotal: 27000 },
        { sku: "EAP610", modelName: "AX1800 Ceiling Mount Wi-Fi 6 Access Point", category: "Access Point", quantity: 3, unitPrice: 6000, subtotal: 18000 },
      ],
    },
    "High-Performance": {
      vendor: "TP-Link Omada",
      tier: "High-Performance",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 79200,
      bom: [
        { sku: "ER7206", modelName: "Omada Gigabit Multi-WAN VPN Router", category: "Gateway", quantity: 1, unitPrice: 7200, subtotal: 7200 },
        { sku: "TL-SG3428MP", modelName: "JetStream 28-Port Gigabit L2+ Managed PoE+ Switch", category: "Switch", quantity: 2, unitPrice: 19500, subtotal: 39000 },
        { sku: "EAP650", modelName: "AX3000 Ultra-Slim Wireless Access Point", category: "Access Point", quantity: 4, unitPrice: 8250, subtotal: 33000 },
      ],
    },
  },
  "Ubiquiti UniFi": {
    "Cost-Efficient": {
      vendor: "Ubiquiti UniFi",
      tier: "Cost-Efficient",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 68900,
      bom: [
        { sku: "UCG-Ultra", modelName: "Cloud Gateway Ultra", category: "Gateway", quantity: 1, unitPrice: 8900, subtotal: 8900 },
        { sku: "USW-24-POE", modelName: "Standard 24 PoE Switch", category: "Switch", quantity: 2, unitPrice: 21000, subtotal: 42000 },
        { sku: "U6-Plus", modelName: "UniFi U6+ Access Point", category: "Access Point", quantity: 3, unitPrice: 6000, subtotal: 18000 },
      ],
    },
    "High-Performance": {
      vendor: "Ubiquiti UniFi",
      tier: "High-Performance",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 118500,
      bom: [
        { sku: "UDM-Pro", modelName: "Dream Machine Pro", category: "Gateway", quantity: 1, unitPrice: 24500, subtotal: 24500 },
        { sku: "USW-Pro-24-POE", modelName: "Pro 24 PoE L3 Switch", category: "Switch", quantity: 2, unitPrice: 29000, subtotal: 58000 },
        { sku: "U6-Pro", modelName: "UniFi U6 Pro Access Point", category: "Access Point", quantity: 4, unitPrice: 9000, subtotal: 36000 },
      ],
    },
  },
  "HPE Aruba Instant On": {
    "Cost-Efficient": {
      vendor: "HPE Aruba Instant On",
      tier: "Cost-Efficient",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 62000,
      bom: [
        { sku: "R9B32A", modelName: "Instant On Secure Gateway SG2505P", category: "Gateway", quantity: 1, unitPrice: 11000, subtotal: 11000 },
        { sku: "JL683A", modelName: "Instant On 1930 24G Class4 PoE 4SFP/SFP+ 195W Switch", category: "Switch", quantity: 2, unitPrice: 16500, subtotal: 33000 },
        { sku: "R4W02A", modelName: "Instant On AP22 (RW) Access Point", category: "Access Point", quantity: 3, unitPrice: 6000, subtotal: 18000 },
      ],
    },
    "High-Performance": {
      vendor: "HPE Aruba Instant On",
      tier: "High-Performance",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 98500,
      bom: [
        { sku: "R9B32A", modelName: "Instant On Secure Gateway SG2505P", category: "Gateway", quantity: 1, unitPrice: 11000, subtotal: 11000 },
        { sku: "JL684A", modelName: "Instant On 1930 24G Class4 PoE 4SFP/SFP+ 370W Switch", category: "Switch", quantity: 2, unitPrice: 25750, subtotal: 51500 },
        { sku: "S1T23A", modelName: "Instant On AP25 (RW) 4x4 Wi-Fi 6 Access Point", category: "Access Point", quantity: 4, unitPrice: 9000, subtotal: 36000 },
      ],
    },
  },
  "Cisco Business": {
    "Cost-Efficient": {
      vendor: "Cisco Business",
      tier: "Cost-Efficient",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 67500,
      bom: [
        { sku: "RV340-K9", modelName: "Dual WAN Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 14500, subtotal: 14500 },
        { sku: "CBS250-24P-4G", modelName: "Smart 24-Port GE PoE Switch", category: "Switch", quantity: 2, unitPrice: 18000, subtotal: 36000 },
        { sku: "CBW150AX", modelName: "Cisco Business 150AX Access Point", category: "Access Point", quantity: 3, unitPrice: 5666.67, subtotal: 17000 },
      ],
    },
    "High-Performance": {
      vendor: "Cisco Business",
      tier: "High-Performance",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 112000,
      bom: [
        { sku: "RV345P-K9", modelName: "Dual WAN Gigabit PoE VPN Router", category: "Gateway", quantity: 1, unitPrice: 20000, subtotal: 20000 },
        { sku: "CBS350-24FP-4X", modelName: "Managed 24-Port GE Full PoE 10G Uplinks", category: "Switch", quantity: 2, unitPrice: 30000, subtotal: 60000 },
        { sku: "CBW240AC", modelName: "Cisco Business 240AC Access Point", category: "Access Point", quantity: 4, unitPrice: 8000, subtotal: 32000 },
      ],
    },
  },
  "Ruijie Reyee": {
    "Cost-Efficient": {
      vendor: "Ruijie Reyee",
      tier: "Cost-Efficient",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 39800,
      bom: [
        { sku: "RG-EG210G-E", modelName: "Reyee 10-Port Cloud Managed Router", category: "Gateway", quantity: 1, unitPrice: 4800, subtotal: 4800 },
        { sku: "RG-ES226GC-P", modelName: "26-Port Gigabit Smart Cloud Managed PoE+ Switch", category: "Switch", quantity: 2, unitPrice: 11000, subtotal: 22000 },
        { sku: "RG-RAP2260(G)", modelName: "Reyee Wi-Fi 6 AX1800 Ceiling Access Point", category: "Access Point", quantity: 3, unitPrice: 4333.33, subtotal: 13000 },
      ],
    },
    "High-Performance": {
      vendor: "Ruijie Reyee",
      tier: "High-Performance",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 62500,
      bom: [
        { sku: "RG-EG310GH-E", modelName: "High-Performance Multi-WAN Enterprise Router", category: "Gateway", quantity: 1, unitPrice: 8500, subtotal: 8500 },
        { sku: "RG-NBS3200-24GT4XS-P", modelName: "24-Port L2+ Managed PoE+ Switch w/ 4 SFP+", category: "Switch", quantity: 2, unitPrice: 16500, subtotal: 33000 },
        { sku: "RG-RAP2260(E)", modelName: "Reyee AX3200 Multi-Gigabit Ceiling AP", category: "Access Point", quantity: 4, unitPrice: 5250, subtotal: 21000 },
      ],
    },
  },
  "Grandstream GWN Cloud": {
    "Cost-Efficient": {
      vendor: "Grandstream GWN Cloud",
      tier: "Cost-Efficient",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 42000,
      bom: [
        { sku: "GWN7002", modelName: "Multi-WAN Gigabit VPN Router", category: "Gateway", quantity: 1, unitPrice: 4500, subtotal: 4500 },
        { sku: "GWN7803P", modelName: "Layer 2+ Managed 24-Port PoE+ Network Switch", category: "Switch", quantity: 2, unitPrice: 11250, subtotal: 22500 },
        { sku: "GWN7660", modelName: "802.11ax 2x2:2 Wi-Fi 6 Access Point", category: "Access Point", quantity: 3, unitPrice: 5000, subtotal: 15000 },
      ],
    },
    "High-Performance": {
      vendor: "Grandstream GWN Cloud",
      tier: "High-Performance",
      pricingTimestamp: "Oct 14, 2026, 9:00 PM PST",
      currency: "PHP",
      totalCost: 69500,
      bom: [
        { sku: "GWN7003", modelName: "9-Gigabit VPN Router with SFP Ports", category: "Gateway", quantity: 1, unitPrice: 6500, subtotal: 6500 },
        { sku: "GWN7813P", modelName: "Layer 3 Managed 24-Port PoE+ Switch w/ 4 SFP+", category: "Switch", quantity: 2, unitPrice: 17500, subtotal: 35000 },
        { sku: "GWN7664", modelName: "High-Performance 4x4:4 Wi-Fi 6 Access Point", category: "Access Point", quantity: 4, unitPrice: 7000, subtotal: 28000 },
      ],
    },
  },
};

export const Comparison: React.FC<ComparisonProps> = ({
  plansData = MOCK_PLANS_DATA,
  defaultVendor = "TP-Link Omada",
}) => {
  const availableVendors = Object.keys(plansData) as VendorName[];

  // Independent local state for left (Cost-Efficient) and right (High-Performance) cards
  const [costEfficientVendor, setCostEfficientVendor] = useState<VendorName>(
    availableVendors.includes(defaultVendor) ? defaultVendor : availableVendors[0]
  );

  const [highPerformanceVendor, setHighPerformanceVendor] = useState<VendorName>(
    availableVendors.includes(defaultVendor) ? defaultVendor : availableVendors[0]
  );

  const activeCostEfficientPlan =
    plansData[costEfficientVendor]["Cost-Efficient"];
  const activeHighPerformancePlan =
    plansData[highPerformanceVendor]["High-Performance"];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Vendor Plan Selection & Comparison
        </h1>
        <p className="text-sm text-muted-foreground">
          Compare generated Cost-Efficient and High-Performance network plans side-by-side. Switch vendors independently on either card to evaluate hardware configurations and costs instantly.
        </p>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <PlanCard
          tier="Cost-Efficient"
          selectedVendor={costEfficientVendor}
          availableVendors={availableVendors}
          onVendorChange={setCostEfficientVendor}
          planData={activeCostEfficientPlan}
        />

        <PlanCard
          tier="High-Performance"
          selectedVendor={highPerformanceVendor}
          availableVendors={availableVendors}
          onVendorChange={setHighPerformanceVendor}
          planData={activeHighPerformancePlan}
        />
      </div>
    </section>
  );
};

export default Comparison;