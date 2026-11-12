import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button"; // NWP-COMPARE-002
import { PlanCard } from "./plancard";
import { EmptyPlanCard, EmptyState, LoadingState } from "./plan-states";
import {
  PLAN_TIERS,
  VENDOR_NAMES,
  type DefaultVendors,
  type NetworkPlanData, // NWP-COMPARE-002
  type PlanTier,
  type VendorName,
  type VendorPlansPayload,
} from "./types";

// NWP-COMPARE-002
export interface PlanChoice {
  tier: PlanTier;
  vendor: VendorName;
}

interface ComparisonProps {
  plansData?: VendorPlansPayload; // undefined = still loading
  defaultVendors?: DefaultVendors;
  /** NWP-COMPARE-002: called with the chosen tier/vendor and that plan's data. */
  onContinue?: (choice: PlanChoice, plan: NetworkPlanData) => void;
}

const generationKeyOf = (plansData?: VendorPlansPayload): string => {
  if (!plansData) return "loading";
  for (const vendor of VENDOR_NAMES) {
    for (const tier of PLAN_TIERS) {
      const plan = plansData[vendor]?.[tier];
      if (plan) return plan.generatedAt;
    }
  }
  return "empty";
};

// The key remounts ComparisonView for every new generation, which also resets
// the selection below.
export const Comparison: React.FC<ComparisonProps> = ({
  plansData,
  defaultVendors,
  onContinue,
}) => {
  const generationKey = generationKeyOf(plansData);
  return (
    <ComparisonView
      key={generationKey}
      plansData={plansData}
      defaultVendors={defaultVendors}
      onContinue={onContinue}
    />
  );
};

const ComparisonView: React.FC<ComparisonProps> = ({
  plansData,
  defaultVendors,
  onContinue,
}) => {
  const vendorsByTier = useMemo(() => {
    const result = {} as Record<PlanTier, VendorName[]>;
    for (const tier of PLAN_TIERS) {
      result[tier] = VENDOR_NAMES.filter((v) => plansData?.[v]?.[tier]);
    }
    return result;
  }, [plansData]);

  const [choice, setChoice] = useState<Record<PlanTier, VendorName | null>>({
    "Cost-Efficient": null,
    "High-Performance": null,
  });

  // NWP-COMPARE-002: the selection is held by tier (the card), not by vendor,
  // so it follows the vendor dropdown. In-memory only: no storage, no router state.
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null);

  const shownVendor = (tier: PlanTier): VendorName | undefined => {
    const list = vendorsByTier[tier];
    const picked = choice[tier];
    if (picked && list.includes(picked)) return picked;
    const preferred = defaultVendors?.[tier];
    if (preferred && list.includes(preferred)) return preferred;
    return list[0];
  };

  const shown: Record<PlanTier, VendorName | undefined> = {
    "Cost-Efficient": shownVendor("Cost-Efficient"),
    "High-Performance": shownVendor("High-Performance"),
  };

  // NWP-COMPARE-002: derived from the selected tier and that card's current vendor.
  const selectedVendor = selectedTier ? shown[selectedTier] : undefined;
  const selectedPlan =
    selectedTier && selectedVendor
      ? plansData?.[selectedVendor]?.[selectedTier]
      : undefined;
  const canContinue =
    selectedTier !== null && selectedVendor !== undefined && selectedPlan?.complete === true;

  // NWP-COMPARE-002: keep the selection on this card, but clear it when the
  // newly chosen vendor's plan is incomplete.
  const handleVendorChange = (tier: PlanTier, vendor: VendorName) => {
    setChoice((c) => ({ ...c, [tier]: vendor }));
    if (selectedTier === tier && plansData?.[vendor]?.[tier]?.complete !== true) {
      setSelectedTier(null);
    }
  };

  const handleContinue = () => {
    if (!canContinue || !selectedTier || !selectedVendor || !selectedPlan) return;
    onContinue?.({ tier: selectedTier, vendor: selectedVendor }, selectedPlan);
  };

  const isLoading = plansData === undefined;
  const hasAnyPlan = PLAN_TIERS.some((t) => vendorsByTier[t].length > 0);

  const renderCard = (tier: PlanTier) => {
    const vendor = shown[tier];
    const plan = vendor ? plansData?.[vendor]?.[tier] : undefined;
    if (!vendor || !plan) return <EmptyPlanCard tier={tier} />;
    return (
      <PlanCard
        tier={tier}
        selectedVendor={vendor}
        availableVendors={vendorsByTier[tier]}
        onVendorChange={(v) => handleVendorChange(tier, v)}
        planData={plan}
        isSelected={selectedTier === tier}
        onSelect={() => setSelectedTier(tier)}
        selectable={plan.complete}
      />
    );
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Vendor Plan Selection & Comparison
        </h1>
        <p className="text-sm text-muted-foreground">
          Compare the Cost-Efficient and High-Performance plans side by side.
          Change the vendor on either card independently to see its hardware and costs.
        </p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !hasAnyPlan ? (
        <EmptyState />
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label="Network plans"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
          >
            {renderCard("Cost-Efficient")}
            {renderCard("High-Performance")}
          </div>

          <div className="flex justify-end">
            <Button type="button" size="lg" disabled={!canContinue} onClick={handleContinue}>
              Continue to final report
            </Button>
          </div>
        </>
      )}
    </section>
  );
};

export default Comparison;