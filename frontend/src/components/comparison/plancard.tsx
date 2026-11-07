import React, { useId } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // NWP-COMPARE-002
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils"; // NWP-COMPARE-002
import { formatCurrency, formatDateTime, PRICE_UNAVAILABLE } from "./format";
import type { NetworkPlanData, PlanTier, VendorName } from "./types";
import { VendorSelect } from "./vendorselect";
import { TopologyPlaceholder } from "./topology-placeholder";
import { ComponentTable } from "./componenttable";

interface PlanCardProps {
  tier: PlanTier;
  selectedVendor: VendorName;
  availableVendors: VendorName[];
  onVendorChange: (vendor: VendorName) => void;
  planData: NetworkPlanData;
  // NWP-COMPARE-002
  isSelected: boolean;
  onSelect: () => void;
  /** The plan's `complete` flag. False disables selection. */
  selectable: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  tier,
  selectedVendor,
  availableVendors,
  onVendorChange,
  planData,
  isSelected,
  onSelect,
  selectable,
}) => {
  const isCostEfficient = tier === "Cost-Efficient";
  // A partial total with nothing priced would read as 0.00, so say so instead.
  const nothingPriced = planData.totalIsPartial && planData.totalCost === 0;

  // NWP-COMPARE-002
  const titleId = useId();

  const handleCardClick = () => {
    if (selectable) onSelect();
  };

  // Only act when the card itself has focus, so Enter/Space inside the vendor
  // dropdown or the select button keep their own behaviour.
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (selectable) onSelect();
    }
  };

  // React events bubble through portals, so this also stops clicks inside the
  // dropdown list (rendered outside the card in the DOM) from reaching the card.
  const stopBubbling = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Card
      role="radio"
      aria-checked={isSelected}
      aria-disabled={!selectable}
      aria-labelledby={titleId}
      tabIndex={selectable ? 0 : -1}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "flex flex-col h-full min-w-0 outline-none transition-[box-shadow,border-color]",
        "focus-visible:ring-2 focus-visible:ring-ring",
        selectable && "cursor-pointer",
        isSelected
          ? "border-primary ring-2 ring-primary shadow-xl shadow-primary/40"
          : "border-border/80 shadow-sm",
      )}
    >
      <CardHeader className="pb-4 space-y-0 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle id={titleId} className="text-xl font-bold">
              {isCostEfficient ? "Cost-Efficient Plan" : "High-Performance Plan"}
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            {isCostEfficient
              ? "Essential qualifying hardware meeting all baseline requirements."
              : "Next-tier hardware with growth headroom and lower utilization ceiling."}
          </CardDescription>
        </div>

        <div className="sm:w-52 shrink-0" onClick={stopBubbling} onKeyDown={stopBubbling}>
          <VendorSelect
            tier={tier}
            selectedVendor={selectedVendor}
            availableVendors={availableVendors}
            onVendorChange={onVendorChange}
          />
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 pt-5 space-y-6">
        <TopologyPlaceholder tier={tier} selectedVendor={selectedVendor} />

        {!planData.complete && (
          <div
            role="alert"
            className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs space-y-1.5"
          >
            <p className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              This plan is incomplete. Unmet requirements:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-foreground">
              {planData.unmet.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        )}

        <ComponentTable bom={planData.bom} currency={planData.currency} />

        <div className="text-right space-y-0.5">
          <span className="text-2xl font-extrabold text-primary">
            {nothingPriced
              ? PRICE_UNAVAILABLE
              : formatCurrency(planData.totalCost, planData.currency)}
          </span>
          <span className="text-xs text-muted-foreground block">
            {planData.totalIsPartial ? "Partial total" : "Estimated total"}
          </span>
          {planData.totalIsPartial && (
            <span className="text-[11px] text-amber-700 dark:text-amber-400 block">
              Excludes items with unavailable prices
            </span>
          )}
        </div>

        {/* NWP-COMPARE-002 */}
        <Button
          type="button"
          className="w-full"
          variant={isSelected ? "default" : "outline"}
          disabled={!selectable}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? "Selected" : "Select this plan"}
        </Button>
      </CardContent>

      <CardFooter className="pt-2 pb-4 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Pricing generated {formatDateTime(planData.generatedAt)}
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