// src/dev/ComparisonDev.tsx
import { useState } from "react";
import Comparison from "@/components/comparison/Comparison";
import { scenarios } from "@/components/comparison/fixtures";

export default function ComparisonDev() {
  const [name, setName] = useState("happy");
  return (
    <div>
      <div className="flex flex-wrap gap-2 p-4 border-b">
        {Object.keys(scenarios).map((n) => (
          <button key={n} onClick={() => setName(n)}
            className={`px-3 py-1 rounded border text-sm ${n === name ? "bg-primary text-primary-foreground" : ""}`}>
            {n}
          </button>
        ))}
      </div>
      <Comparison plansData={scenarios[name]} />
    </div>
  );
}

// HELLO