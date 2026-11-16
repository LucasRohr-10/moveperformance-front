import type { ReactNode } from "react";
import { Suspense } from "react";

import { PlanCard } from "@/components/ui/plan-card";
import type { PlanDto, ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { getPlans } from "./get-plans";
import { PlanAction } from "./plan-action";
import { presentPlan } from "./present-plan";

interface PlansSectionProps {
  service: ServiceType;
  className?: string;
}

function PlansMessage({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("text-sm text-muted", className)}>{children}</p>;
}

export function PlansSection({ service, className }: PlansSectionProps) {
  return (
    <Suspense fallback={<PlansMessage className={className}>Cargando planes…</PlansMessage>}>
      <PlansList service={service} className={className} />
    </Suspense>
  );
}

export async function PlansList({ service, className }: PlansSectionProps) {
  let plans: PlanDto[];
  try {
    plans = await getPlans(service);
  } catch {
    return (
      <PlansMessage className={className}>
        No pudimos cargar los planes. Probá de nuevo en unos minutos.
      </PlansMessage>
    );
  }

  if (plans.length === 0) {
    return <PlansMessage className={className}>Todavía no hay planes publicados.</PlansMessage>;
  }

  return (
    <div className={cn("grid gap-6 md:grid-cols-3", className)}>
      {plans.map((plan) => {
        const { actionLabel, actionHref, ...card } = presentPlan(plan);
        return (
          <PlanCard
            key={plan.id}
            {...card}
            action={
              <PlanAction
                label={actionLabel}
                href={actionHref}
                highlighted={card.highlighted ?? false}
              />
            }
          />
        );
      })}
    </div>
  );
}
