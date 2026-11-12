// src/dev/ComparisonDev.tsx
import { useState } from "react";
import Comparison, { type PlanChoice } from "@/components/comparison/Comparison";
import type { NetworkPlanData } from "@/components/comparison/types";
import { scenarios } from "@/components/comparison/fixtures";

export default function ComparisonDev() {
  const [name, setName] = useState("happy");
  // What "Continue to final report" would hand to the report page.
  const [continued, setContinued] = useState<{
    choice: PlanChoice;
    plan: NetworkPlanData;
  } | null>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-4 border-b">
        {Object.keys(scenarios).map((n) => (
          <button key={n} onClick={() => { setName(n); setContinued(null); }}
            className={`px-3 py-1 rounded border text-sm ${n === name ? "bg-primary text-primary-foreground" : ""}`}>
            {n}
          </button>
        ))}
      </div>

      {/* key={name} resets the selection when switching scenarios, even if fixtures share a generatedAt */}
      <Comparison
        key={name}
        plansData={scenarios[name]}
        onContinue={(choice, plan) => setContinued({ choice, plan })}
      />

      {continued && (
        <pre className="mx-auto max-w-7xl px-4 pb-8 text-xs">
          {JSON.stringify(
            {
              tier: continued.choice.tier,
              vendor: continued.choice.vendor,
              complete: continued.plan.complete,
              totalCost: continued.plan.totalCost,
              bomLines: continued.plan.bom.length,
            },
            null,
            2,
          )}
        </pre>
      )}
    </div>
  );
}