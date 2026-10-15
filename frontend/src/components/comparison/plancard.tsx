import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock } from "lucide-react";
import {
  formatCurrency,
  type PlanTier,
  type VendorName,
  type NetworkPlanData,
} from "../comparison/Comparison";
import { VendorSelect } from "./vendorselect";
import { TopologyPlaceholder } from "./topology-placeholder";
import { ComponentTable } from "./componenttable";

interface PlanCardProps {
  tier: PlanTier;
  selectedVendor: VendorName;
  availableVendors: VendorName[];
  onVendorChange: (vendor: VendorName) => void;
  planData: NetworkPlanData;
}

export const PlanCard: React.FC<PlanCardProps> = ({
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
            <CardTitle className="text-xl font-bold">
              {isCostEfficient ? "Cost-Efficient Plan" : "High-Performance Plan"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isCostEfficient
                ? "Essential qualifying hardware meeting all baseline requirements."
                : "Next-tier hardware with growth headroom and lower utilization ceiling."}
            </CardDescription>
          </div>
        </div>

        <VendorSelect
          tier={tier}
          selectedVendor={selectedVendor}
          availableVendors={availableVendors}
          onVendorChange={onVendorChange}
        />
      </CardHeader>

      <Separator />

      {/* 2. Topology Placeholder & 3. BOM Table */}
      <CardContent className="flex-1 pt-5 space-y-6">
        <TopologyPlaceholder tier={tier} selectedVendor={selectedVendor} />
        <ComponentTable bom={planData.bom} currency={planData.currency} />
        <div className="text-right">
            <span className="text-2xl font-extrabold text-primary">
              {formatCurrency(planData.totalCost, planData.currency)}
            </span>
            <span className="text-xs text-muted-foreground block">
              Estimated Total
            </span>
          </div>
      </CardContent>

      {/* Card Footer */}
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

export default PlanCard;