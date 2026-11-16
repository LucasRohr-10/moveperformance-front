import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/constants/routes.constants";
import { monthLabel } from "@/features/attendance-history";
import type { ActivitySummaryDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { getMyActivitySummary } from "./get-my-activity-summary";

const TITLE = "Tu mes en MOVE";

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// The streak stands out in yellow while it is alive; a zero is not celebrated.
const TILE_BASE = "rounded border px-1 py-4 text-center";
const TILE_TONE = {
  success: "border-success/35 bg-success/10",
  warning: "border-warning/35 bg-warning/10",
  neutral: "border-line bg-soft",
} as const;

function Tile({
  tone,
  value,
  label,
  caption,
}: {
  tone: keyof typeof TILE_TONE;
  value: string;
  label: ReactNode;
  caption: string;
}) {
  return (
    <div className={cn(TILE_BASE, TILE_TONE[tone])}>
      <p className={cn("font-display text-3xl font-extrabold leading-none", tone === "warning" ? "text-warning" : "text-white")}>
        {value}
      </p>
      {/* The card is narrow beside the agenda: anywhere-wrapping is the safety net so a label never leaves its tile. */}
      <p className="mt-1.5 text-[11px] text-white [overflow-wrap:anywhere]">{label}</p>
      <p className="mt-0.5 text-[10px] text-muted">{caption}</p>
    </div>
  );
}

function FirstTimeNote() {
  return (
    <div className="mt-4 rounded border border-dashed border-line p-5 text-center">
      <p className="text-sm font-semibold">Acá vas a ver tu racha</p>
      <p className="mt-1.5 text-xs text-muted">
        Cuando vengas a tu primer turno, empezamos a contar tus asistencias y tus veces por semana.
      </p>
      <Link href={ROUTES.BOOKINGS} className={cn(buttonVariants({ variant: "primary", size: "sm", touchTarget: true }), "mt-4")}>
        Reservar
      </Link>
    </div>
  );
}

export function MonthStatsView({ summary }: { summary: ActivitySummaryDto }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>{TITLE}</SectionLabel>
        <span className="text-xs text-muted">{capitalize(monthLabel(summary.month))}</span>
      </div>
      {summary.hasAttended ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Tile tone="success" value={String(summary.monthAttendances)} label="Asistencias" caption="este mes" />
            <Tile tone="success" value={summary.frequencyPerWeek.toFixed(1)} label={<>Veces/<wbr />semana</>} caption="últ. 4 semanas" />
            <Tile
              tone={summary.streak > 0 ? "warning" : "neutral"}
              value={String(summary.streak)}
              label="Racha"
              caption="seguidas"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Link
              href={ROUTES.HISTORY}
              className="inline-flex min-h-11 items-center border-b border-line text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors hover:border-white sm:min-h-0"
            >
              Ver mi actividad →
            </Link>
          </div>
        </>
      ) : (
        <FirstTimeNote />
      )}
    </Card>
  );
}

// A failing API stays inside this card: the rest of the profile keeps working. Next's own
// control-flow errors (redirect, prerender bail-outs) are rethrown untouched.
async function loadSummary(): Promise<ActivitySummaryDto | null> {
  try {
    return await getMyActivitySummary();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function MonthStatsCard() {
  const summary = await loadSummary();
  if (summary) return <MonthStatsView summary={summary} />;
  return (
    <Card>
      <SectionLabel>{TITLE}</SectionLabel>
      <p className="mt-4 text-sm text-muted">No pudimos cargar tus números.</p>
    </Card>
  );
}

export function MonthStatsSkeleton() {
  return (
    <Card aria-busy="true">
      <SectionLabel>{TITLE}</SectionLabel>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-24 bg-line" />
        <Skeleton className="h-24 bg-line" />
        <Skeleton className="h-24 bg-line" />
      </div>
    </Card>
  );
}
