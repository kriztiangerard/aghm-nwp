import React, { useMemo, useState } from "react";
import { PlanCard } from "./plancard";
import { EmptyPlanCard, EmptyState, LoadingState } from "./plan-states";
import {
  PLAN_TIERS,
  VENDOR_NAMES,
  type DefaultVendors,
  type PlanTier,
  type VendorName,
  type VendorPlansPayload,
} from "./types";

interface ComparisonProps {
  plansData?: VendorPlansPayload; // undefined = still loading
  defaultVendors?: DefaultVendors;
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

// Mock data for development
const devPlans: VendorPlansPayload = {
  "TP-Link Omada": {
    "Cost-Efficient": {
      vendor: "TP-Link Omada",
      tier: "Cost-Efficient",
      generatedAt: "Oct 21, 2026, 9:00 AM",
      currency: "PHP",
      totalCost: 3500,
      totalIsPartial: false,
      complete: true,
      unmet: [],
      bom: [
        {
          sku: "ER605",
          name: "Omada Gigabit VPN Router",
          category: "Gateway",
          quantity: 1,
          unitPrice: 3500,
          subtotal: 3500,
          status: "ACTIVE",
          priceSource: "synchronized",
          isStale: false,
          priceUpdatedAt: "2026-10-20",
          isGeneric: false,
        },
      ],
    },
    // Optional: Added High-Performance so the right-hand card also shows data
    "High-Performance": {
      vendor: "TP-Link Omada",
      tier: "High-Performance",
      generatedAt: "Oct 21, 2026, 9:00 AM",
      currency: "PHP",
      totalCost: 9800,
      totalIsPartial: false,
      complete: true,
      unmet: [],
      bom: [
        {
          sku: "ER7206",
          name: "Omada Multi-Gigabit VPN Router",
          category: "Gateway",
          quantity: 1,
          unitPrice: 9800,
          subtotal: 9800,
          status: "ACTIVE",
          priceSource: "synchronized",
          isStale: false,
          priceUpdatedAt: "2026-10-20",
          isGeneric: false,
        },
      ],
    },
  },
};

export const Comparison: React.FC<ComparisonProps> = ({
  plansData = devPlans,
  defaultVendors,
}) => {
  const generationKey = generationKeyOf(plansData);
  return (
    <ComparisonView
      key={generationKey}
      plansData={plansData}
      defaultVendors={defaultVendors}
    />
  );
};

const ComparisonView: React.FC<ComparisonProps> = ({ plansData, defaultVendors }) => {
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
  // NWP-COMPARE-002 reads `shown` (and adds selectedTier) from this component.

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
        onVendorChange={(v) => setChoice((c) => ({ ...c, [tier]: v }))}
        planData={plan}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {renderCard("Cost-Efficient")}
          {renderCard("High-Performance")}
        </div>
      )}
    </section>
  );
};

export default Comparison;