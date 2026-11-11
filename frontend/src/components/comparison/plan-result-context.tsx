import React, { createContext, useContext, useMemo, useState } from "react";
import type { DefaultVendors, VendorPlansPayload } from "./types";

// Plain React state only: no localStorage, sessionStorage or router state, so a
// refresh clears the generated plans (manuscript delimitation: no persisted projects).

export interface PlanResult {
  plansData: VendorPlansPayload;
  defaultVendors?: DefaultVendors;
}

interface PlanResultValue {
  result: PlanResult | null;
  setResult: (result: PlanResult) => void;
  clearResult: () => void;
}

const PlanResultContext = createContext<PlanResultValue | null>(null);

export const PlanResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [result, setResult] = useState<PlanResult | null>(null);

  const value = useMemo<PlanResultValue>(
    () => ({ result, setResult, clearResult: () => setResult(null) }),
    [result],
  );

  return <PlanResultContext.Provider value={value}>{children}</PlanResultContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePlanResult = (): PlanResultValue => {
  const ctx = useContext(PlanResultContext);
  if (!ctx) throw new Error("usePlanResult must be used inside <PlanResultProvider>");
  return ctx;
};
