import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VendorName, PlanTier } from "./Comparison";

interface VendorSelectProps {
  tier: PlanTier;
  selectedVendor: VendorName;
  availableVendors: VendorName[];
  onVendorChange: (vendor: VendorName) => void;
}

export const VendorSelect: React.FC<VendorSelectProps> = ({
  tier,
  selectedVendor,
  availableVendors,
  onVendorChange,
}) => {
  return (
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
  );
};

export default VendorSelect;