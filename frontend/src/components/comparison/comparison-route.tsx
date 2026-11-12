import { Navigate, useNavigate } from "react-router-dom";
import Comparison from "./Comparison";
import { usePlanResult } from "./plan-result-context";
import { useSelectedPlan } from "./selected-plan-context";

export default function ComparisonRoute() {
  const { result } = usePlanResult();
  const { setSelected } = useSelectedPlan();
  const navigate = useNavigate();

  // After a refresh (or a direct visit) nothing has been generated, so go back.
  if (!result) return <Navigate to="/questionnaire" replace />;

  return (
    <Comparison
      plansData={result.plansData}
      defaultVendors={result.defaultVendors}
      onContinue={(choice, plan) => {
        setSelected(choice, plan);
        navigate("/report"); // no `state` option
      }}
    />
  );
}