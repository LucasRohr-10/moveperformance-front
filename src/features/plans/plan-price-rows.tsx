import Link from "next/link";
import { Suspense } from "react";

import { ROUTES } from "@/config/constants/routes.constants";
import type { ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { getPlans } from "./get-plans";
import { presentPlan } from "./present-plan";

interface PlanPriceRowsProps {
  service: ServiceType;
  className?: string;
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      aria-hidden="true"
      className="size-5 shrink-0 -translate-x-1.5 translate-y-1.5 opacity-0 [transition:all_0.35s_cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 max-[900px]:translate-x-0 max-[900px]:translate-y-0 max-[900px]:opacity-100"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function PlansMessage({ className, children }: { className?: string; children: string }) {
  return <p className={cn("text-sm text-muted", className)}>{children}</p>;
}

// The compact price list on Performance/Recovery: each row is index-linked
// into the /planes selector (#service-0, #service-1, …), reusing the exact
// same getPlans/presentPlan pipeline as that page so prices never duplicate.
export function PlanPriceRows({ service, className }: PlanPriceRowsProps) {
  return (
    <Suspense fallback={<PlansMessage className={className}>Cargando planes…</PlansMessage>}>
      <PlanPriceRowsList service={service} className={className} />
    </Suspense>
  );
}

export async function PlanPriceRowsList({ service, className }: PlanPriceRowsProps) {
  const plans = await getPlans(service).catch(() => null);

  if (!plans) {
    return <PlansMessage className={className}>No pudimos cargar los planes. Probá de nuevo en unos minutos.</PlansMessage>;
  }
  if (plans.length === 0) {
    return <PlansMessage className={className}>Todavía no hay planes publicados.</PlansMessage>;
  }

  return (
    <div className={cn("border-t border-line", className)}>
      {plans.map((plan, index) => {
        const { name, price, badge } = presentPlan(plan);
        return (
          <Link
            key={plan.id}
            href={`${ROUTES.PLANS_PUBLIC}#${service}-${index}`}
            className="group flex items-center justify-between gap-[18px] border-b border-line py-[22px] no-underline [transition:background-color_0.25s,padding_0.25s] motion-reduce:transition-none hover:bg-[#181818] hover:px-3.5"
          >
            <span className="flex flex-1 flex-wrap items-center gap-3">
              <span className="text-[15px] font-bold">{name}</span>
              {badge ? (
                <span className="bg-white px-[7px] py-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-black">
                  {badge}
                </span>
              ) : null}
            </span>
            <span className="flex items-center gap-[18px]">
              <span className="font-display text-[22px]">{price}</span>
              <ArrowIcon />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
