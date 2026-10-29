import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Inbox } from "lucide-react";
import type { PlanTier } from "./types";

const Bar: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-muted ${className}`} />
);

export const PlanCardSkeleton: React.FC = () => (
  <Card className="h-full min-w-0 border-border/80 shadow-sm" aria-hidden="true">
    <CardHeader className="space-y-4">
      <Bar className="h-6 w-1/2" />
      <Bar className="h-9 w-full" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Bar className="h-56 w-full" />
      <Bar className="h-4 w-1/3" />
      <Bar className="h-32 w-full" />
    </CardContent>
  </Card>
);

export const LoadingState: React.FC = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading plans"
    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
  >
    <PlanCardSkeleton />
    <PlanCardSkeleton />
  </div>
);

// One tier has no plan: keeps its column so the other card stays in place.
export const EmptyPlanCard: React.FC<{ tier: PlanTier }> = ({ tier }) => (
  <Card className="h-full min-w-0 border-dashed">
    <CardContent className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
      <Inbox className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">No {tier} plan available</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        None of the vendors produced a {tier} plan for these requirements.
      </p>
    </CardContent>
  </Card>
);

// Neither tier has any plan.
export const EmptyState: React.FC = () => (
  <div
    role="status"
    className="rounded-lg border-2 border-dashed p-10 text-center space-y-2"
  >
    <Inbox className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
    <p className="text-sm font-medium">No plans available</p>
    <p className="text-xs text-muted-foreground">
      No vendor returned a plan for the submitted requirements.
    </p>
  </div>
);