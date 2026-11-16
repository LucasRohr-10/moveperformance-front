import { Suspense } from "react";

import type { PlanDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { getPlans } from "./get-plans";
import { PlanSelector } from "./plan-selector";
import type { PresentPlanOptions } from "./present-plan";
import { presentSelectorPlans } from "./present-selector-plans";
import { SELECTOR_SERVICES, SERVICE_ORDER, type SelectorService } from "./service-copy";

interface PlansSelectorSectionProps {
  className?: string;
  reserveHref?: PresentPlanOptions["reserveHref"];
}

function PlansMessage({ children }: { children: string }) {
  return (
    <div className="flex items-center rounded border border-line bg-card p-7 text-sm text-muted">
      {children}
    </div>
  );
}

function ServiceCard({
  service,
  result,
  reserveHref,
}: {
  service: SelectorService;
  result: PromiseSettledResult<PlanDto[]>;
  reserveHref?: PresentPlanOptions["reserveHref"];
}) {
  const { label, ...copy } = SELECTOR_SERVICES[service];

  if (result.status === "rejected") {
    return <PlansMessage>{`No pudimos cargar los planes de ${label}. Probá de nuevo en unos minutos.`}</PlansMessage>;
  }

  const options = presentSelectorPlans(service, result.value, { reserveHref });
  if (options.length === 0) {
    return <PlansMessage>{`Todavía no hay planes de ${label} publicados.`}</PlansMessage>;
  }

  return <PlanSelector id={service} label={label} {...copy} options={options} />;
}

export function PlansSelectorSection({ className, reserveHref }: PlansSelectorSectionProps) {
  return (
    <Suspense
      fallback={<p className={cn("text-sm text-muted", className)}>Cargando planes…</p>}
    >
      <PlansSelectorList className={className} reserveHref={reserveHref} />
    </Suspense>
  );
}

export async function PlansSelectorList({ className, reserveHref }: PlansSelectorSectionProps) {
  // One service failing must not hide the other, so each is settled on its own.
  const results = await Promise.allSettled(SERVICE_ORDER.map((service) => getPlans(service)));

  return (
    <div className={cn("grid gap-6 md:grid-cols-2", className)}>
      {SERVICE_ORDER.map((service, index) => (
        <ServiceCard key={service} service={service} result={results[index]} reserveHref={reserveHref} />
      ))}
    </div>
  );
}
