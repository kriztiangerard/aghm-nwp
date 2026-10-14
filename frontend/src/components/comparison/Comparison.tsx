import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Network, Cpu, CheckCircle2, Clock } from "lucide-react";

// --- Types & Interfaces (Can be moved to src/schemas/comparison.ts) ---

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
  category: "Gateway" | "Switch" | "Access Point" | "Optic" | "Enclosure" | "Controller";
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
  /** The complete generated payload containing plans across supported vendors */
  plansData?: VendorPlansPayload;
  /** The initial default vendor selected by Step 4 of the recommendation engine */
  defaultVendor?: VendorName;
}

// --- Currency Formatter (PHP) ---
const formatCurrency = (amount: number, currency = "PHP") => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// --- Fallback Mock Data (For standalone UI development & testing) ---
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

// --- Reusable Single Plan Card Component ---

interface PlanColumnCardProps {
  tier: PlanTier;
  selectedVendor: VendorName;
  availableVendors: VendorName[];
  onVendorChange: (vendor: VendorName) => void;
  planData: NetworkPlanData;
}

const PlanColumnCard: React.FC<PlanColumnCardProps> = ({
  tier,
  selectedVendor,
  availableVendors,
  onVendorChange,
  planData,
}) => {
  const isCostEfficient = tier === "Cost-Efficient";

  return (
    <Card className="flex flex-col h-full border-border/80 shadow-sm">
      {/* 1. Card Header & Independent Vendor Dropdown */}
      <CardHeader className="pb-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={isCostEfficient ? "secondary" : "default"}
                className="uppercase tracking-wider text-xs font-semibold"
              >
                {tier}
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold">
              {isCostEfficient ? "Cost-Efficient Plan" : "High-Performance Plan"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isCostEfficient
                ? "Essential qualifying hardware meeting all baseline requirements."
                : "Next-tier hardware with growth headroom and lower utilization ceiling."}
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Estimated Total</span>
            <span className="text-2xl font-extrabold text-primary">
              {formatCurrency(planData.totalCost, planData.currency)}
            </span>
          </div>
        </div>

        {/* Vendor Switcher Dropdown */}
        <div className="pt-1">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Selected Vendor Ecosystem
          </label>
          <Select
            value={selectedVendor}
            onValueChange={(value) => onVendorChange(value as VendorName)}
          >
            <SelectTrigger
              className="w-full"
              aria-label={`Select vendor for ${tier} plan`}
            >
              <SelectValue placeholder="Choose a vendor..." />
            </SelectTrigger>
            <SelectContent>
              {availableVendors.map((vendor) => (
                <SelectItem key={vendor} value={vendor}>
                  {vendor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 pt-5 space-y-6">
        {/* 2. Network Topology Placeholder (Middle Section) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Network className="w-4 h-4 text-muted-foreground" />
              Logical Network Topology
            </h4>
            <Badge variant="outline" className="text-[11px] font-normal">
              {selectedVendor}
            </Badge>
          </div>

          <div
            data-testid={`topology-placeholder-${tier}`}
            className="w-full h-56 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center p-6 text-center transition-colors"
          >
            <div className="p-3 rounded-full bg-background border shadow-xs mb-3">
              <Network className="w-6 h-6 text-primary/70" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {selectedVendor} — {tier} Topology
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Interactive logical diagram placeholder. Ready for Reaflow canvas integration.
            </p>
          </div>
        </div>

        {/* 3. Itemized Bill of Materials / Component List (Bottom Half) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              Network Components (Bill of Materials)
            </h4>
            <span className="text-xs text-muted-foreground">
              {planData.bom.reduce((acc, item) => acc + item.quantity, 0)} total units
            </span>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">Component</TableHead>
                  <TableHead className="text-xs text-center w-16">Qty</TableHead>
                  <TableHead className="text-xs text-right">Unit Price</TableHead>
                  <TableHead className="text-xs text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planData.bom.map((item) => (
                  <TableRow key={item.sku}>
                    <TableCell className="py-2.5">
                      <div className="font-medium text-xs text-foreground">
                        {item.sku}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {item.category} • {item.modelName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-xs py-2.5">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground py-2.5">
                      {formatCurrency(item.unitPrice, planData.currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs py-2.5">
                      {formatCurrency(item.subtotal, planData.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Card Footer: Timestamp & Integrity Stamp */}
      <CardFooter className="pt-2 pb-4 border-t bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Pricing as of {planData.pricingTimestamp}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          One-time hardware estimate
        </span>
      </CardFooter>
    </Card>
  );
};

// --- Main Comparison Dashboard Component ---

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

  // Retrieve the exact unmodified plan objects from client-side state
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
        {/* Left Card: Cost-Efficient Plan */}
        <PlanColumnCard
          tier="Cost-Efficient"
          selectedVendor={costEfficientVendor}
          availableVendors={availableVendors}
          onVendorChange={setCostEfficientVendor}
          planData={activeCostEfficientPlan}
        />

        {/* Right Card: High-Performance Plan */}
        <PlanColumnCard
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