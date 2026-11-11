import React, { createContext, useContext, useMemo, useState } from "react";
import type { NetworkPlanData } from "./types";
import type { PlanChoice } from "./Comparison";

// Plain React state only. Nothing touches localStorage, sessionStorage or router
// state, so a refresh clears it (manuscript delimitation: no persisted projects).

interface SelectedPlanValue {
  choice: PlanChoice | null;
  plan: NetworkPlanData | null;
  setSelected: (choice: PlanChoice, plan: NetworkPlanData) => void;
  clear: () => void;
}

const SelectedPlanContext = createContext<SelectedPlanValue | null>(null);

export const SelectedPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ choice: PlanChoice; plan: NetworkPlanData } | null>(null);

  const value = useMemo<SelectedPlanValue>(
    () => ({
      choice: state?.choice ?? null,
      plan: state?.plan ?? null,
      setSelected: (choice, plan) => setState({ choice, plan }),
      clear: () => setState(null),
    }),
    [state],
  );

  return <SelectedPlanContext.Provider value={value}>{children}</SelectedPlanContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSelectedPlan = (): SelectedPlanValue => {
  const ctx = useContext(SelectedPlanContext);
  if (!ctx) throw new Error("useSelectedPlan must be used inside <SelectedPlanProvider>");
  return ctx;
};

/*
Wiring (provider must sit above both routes):

  const { setSelected } = useSelectedPlan();
  const navigate = useNavigate();

  <Comparison
    plansData={plansData}
    defaultVendors={defaultVendors}
    onContinue={(choice, plan) => {
      setSelected(choice, plan);
      navigate("/report");            // do not pass `state`
    }}
  />

  // Final report page
  const { choice, plan } = useSelectedPlan();
  if (!choice || !plan) return <Navigate to="/" replace />;   // e.g. after a refresh
*/