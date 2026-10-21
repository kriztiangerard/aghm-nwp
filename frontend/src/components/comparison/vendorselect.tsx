import React, { useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlanTier, VendorName } from "./types";

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
  const id = useId();

  return (
    <div className="pt-1">
      <label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground mb-1.5 block"
      >
        Vendor for {tier} plan
      </label>
      <Select
        value={selectedVendor}
        onValueChange={(value) => onVendorChange(value as VendorName)}
      >
        <SelectTrigger id={id} className="w-full">
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