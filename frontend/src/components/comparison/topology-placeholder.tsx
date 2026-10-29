// REPLACE WITH PATHOLOGY COMPONENT WHEN REAFLOW IS INTEGRATED
import React from "react";
import { Network } from "lucide-react";
import type { PlanTier, VendorName } from "./types";

interface TopologyPlaceholderProps {
  tier: PlanTier;
  selectedVendor: VendorName;
}

export const TopologyPlaceholder: React.FC<TopologyPlaceholderProps> = ({
  tier,
  selectedVendor,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Network className="w-4 h-4 text-muted-foreground" />
           Network Topology
        </h4>
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
  );
};

export default TopologyPlaceholder;