import type { ReactNode } from "react";

import type { MetricValueDto, StatsMetaDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import type { CompareParam } from "../dashboard-params";
import { InfoToggle } from "../hoy/info-toggle";
import { formatChange } from "./format-change";

const TONE_CLASS = { up: "text-success", down: "text-danger", neutral: "text-muted" } as const;

export interface KpiTileProps {
  label: string;
  /** The definition, from the mockup. */
  info: string;
  /** Already formatted: the tile only places it. */
  value: string;
  metric: MetricValueDto;
  comparison: StatsMetaDto["comparison"];
  compare: CompareParam;
  /** What fewer is good news for: cancellations, bajas, paused. */
  downIsGood?: boolean;
  /** A line before the comparison: "por mes", "3 el mismo día". */
  note?: ReactNode;
}

/** A number of Negocio, with how it moved. Same shape as the Hoy tiles, but it is not a link. */
export function KpiTile({ label, info, value, metric, comparison, compare, downIsGood = false, note }: KpiTileProps) {
  const change = formatChange(metric, comparison, downIsGood, compare);

  return (
    <article className="flex min-w-0 flex-col gap-0.5 rounded border border-line bg-card p-3.5 lg:px-[18px] lg:py-4">
      <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted lg:text-[11px] lg:tracking-[0.18em]">
        <h3 className="m-0 text-[length:inherit] font-[inherit] tracking-[inherit]">{label}</h3>
        <InfoToggle label={label} text={info} />
      </div>
      <p className="mt-1 font-display text-[26px] leading-[1.1] font-extrabold tabular-nums lg:text-[30px]">{value}</p>
      {note || change.text ? (
        <p className="text-xs text-muted">
          {note ? <span>{note}</span> : null}
          {note && change.text ? " · " : null}
          {change.figure ? <span className={cn(TONE_CLASS[change.tone])}>{change.figure}</span> : null}
          {change.figure && change.context ? " " : null}
          {change.context ? <span>{change.context}</span> : null}
        </p>
      ) : null}
    </article>
  );
}
