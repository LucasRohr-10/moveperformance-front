"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/constants/routes.constants";
import type { StaffPlanDto } from "@/lib/api/types";

import { PlanForm } from "./plan-form";
import { getPlan } from "./staff-plans-api";

/** Placeholder shaped like the loaded form, instead of a blank screen. */
function LoadingPlan() {
  return (
    <div role="status">
      <span className="sr-only">Cargando el plan…</span>
      <Card>
        <Skeleton className="h-4 w-full bg-line" />
        <Skeleton className="mt-6 h-4 w-2/3 bg-line" />
        <Skeleton className="mt-6 h-4 w-1/2 bg-line" />
      </Card>
    </div>
  );
}

export function EditPlanPanel({ planId }: { planId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<StaffPlanDto | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  function fetchPlan() {
    return getPlan(planId)
      .then(setPlan)
      .catch(() => setHasFailed(true));
  }

  /** A retry: clear the previous failure before asking again. */
  function load() {
    setHasFailed(false);
    return fetchPlan();
  }

  useEffect(() => {
    void fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  function goToList() {
    router.push(ROUTES.STAFF_PLANS);
  }

  if (hasFailed) {
    return (
      <Card padding="none">
        <EmptyState
          title="No pudimos cargar el plan"
          description="Puede ser un problema temporario del servidor, o el plan ya no existe."
          role="alert"
          action={
            <Button variant="secondary" touchTarget onClick={load}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );
  }

  if (!plan) return <LoadingPlan />;

  return <PlanForm plan={plan} onSaved={goToList} onCancel={goToList} />;
}
