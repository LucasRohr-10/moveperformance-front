import Link from "next/link";

import type { StatsGranularity } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { dashboardHref, GRANULARITY_PARAMS, type DashboardParams, type GranularityParam } from "../../dashboard-params";

const PARAM_OF: Record<StatsGranularity, GranularityParam> = {
  day: GRANULARITY_PARAMS.DAY,
  week: GRANULARITY_PARAMS.WEEK,
  month: GRANULARITY_PARAMS.MONTH,
};

export const GRANULARITY_LABELS: Record<StatsGranularity, string> = { day: "Día", week: "Semana", month: "Mes" };

export interface GranularityLinksProps {
  params: DashboardParams;
  /** What the API is grouping by now. */
  current: StatsGranularity;
  /** What the API allows for this period: a year cannot be shown day by day. */
  options: StatsGranularity[];
}

/** Links with `agrupar`, so the grouping is in the URL. With one option there is nothing to choose. */
export function GranularityLinks({ params, current, options }: GranularityLinksProps) {
  if (options.length < 2) return null;

  return (
    <div role="group" aria-label="Agrupar por" className="inline-flex border border-line">
      {options.map((option) => (
        <Link
          key={option}
          href={dashboardHref({ ...params, granularity: PARAM_OF[option] })}
          aria-current={option === current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] sm:min-h-0",
            option === current ? "bg-white text-black" : "text-muted hover:text-white",
          )}
        >
          {GRANULARITY_LABELS[option]}
        </Link>
      ))}
    </div>
  );
}
