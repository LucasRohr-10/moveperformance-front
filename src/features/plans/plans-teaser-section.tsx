import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { ROUTES } from "@/config/constants/routes.constants";
import type { PlanDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/money";

import { getPlans } from "./get-plans";
import { SELECTOR_SERVICES, SERVICE_ORDER, type SelectorService } from "./service-copy";

interface PlansTeaserSectionProps {
  label: string;
}

function TeaserArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      aria-hidden="true"
      className={cn(
        "shrink-0 [transition:transform_0.4s_cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none group-hover:-translate-y-1 group-hover:translate-x-1",
        className,
      )}
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function ServiceCard({ service, fromPrice }: { service: SelectorService; fromPrice: string | null }) {
  const copy = SELECTOR_SERVICES[service];
  return (
    <Link
      href={`${ROUTES.PLANS_PUBLIC}#${service}`}
      className="group flex flex-col gap-7 border border-line bg-card px-7 py-8 no-underline transition-colors duration-300 hover:border-white"
    >
      <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-muted">
        <span>{copy.label}</span>
        <span>{copy.caption}</span>
      </div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="font-display text-[28px] font-black uppercase leading-none">{copy.title}</div>
          <p className="mt-3 text-[13px] text-muted">{copy.description}</p>
        </div>
        {fromPrice ? (
          <div className="shrink-0 text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Desde</div>
            <div className="mt-1 font-display text-[26px]">{fromPrice}</div>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-line pt-[18px] text-[11px] font-extrabold uppercase tracking-[0.2em]">
        {`Ver planes de ${copy.label}`}
        <TeaserArrow className="size-[22px]" />
      </div>
    </Link>
  );
}

// Fetched separately from the cards so a slow/failed price lookup never
// blocks the eyebrow/title/"ver todos" row above from painting immediately.
async function ServiceCards() {
  const results = await Promise.allSettled(SERVICE_ORDER.map((service) => getPlans(service)));

  return (
    <div className="mt-10 grid gap-[22px] md:grid-cols-2">
      {SERVICE_ORDER.map((service, index) => {
        const result = results[index];
        const basePlan: PlanDto | undefined = result.status === "fulfilled" ? result.value[0] : undefined;
        return <ServiceCard key={service} service={service} fromPrice={basePlan ? formatPrice(basePlan.price) : null} />;
      })}
    </div>
  );
}

export function PlansTeaserSection({ label }: PlansTeaserSectionProps) {
  return (
    <section id="plans" className="border-t border-line">
      <PageContainer className="py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel>{label}</SectionLabel>
            <Heading as="h2" size="lg" className="mt-4">
              Elegí tu plan.
            </Heading>
          </div>
          <Link
            href={ROUTES.PLANS_PUBLIC}
            className="group flex items-center gap-3 text-[12px] font-extrabold uppercase tracking-[0.18em] no-underline"
          >
            <span className="border-b-[1.5px] border-white pb-1.5">Ver todos los planes</span>
            <TeaserArrow className="size-6" />
          </Link>
        </div>
        <Suspense fallback={<p className="mt-10 text-sm text-muted">Cargando planes…</p>}>
          <ServiceCards />
        </Suspense>
      </PageContainer>
    </section>
  );
}
