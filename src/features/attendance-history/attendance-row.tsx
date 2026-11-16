import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";

import { ATTENDANCE_STATE_BADGE, type AttendanceRow } from "./present-attendance";

const UNMARKED_HINT = "El staff todavía no marcó tu asistencia.";

export function AttendanceRowView({ row }: { row: AttendanceRow }) {
  const badge = ATTENDANCE_STATE_BADGE[row.state];
  const isCancelled = row.state === "cancelled";

  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3">
      <div className="flex flex-col items-center rounded border border-line py-1 text-center">
        <span className="text-[9px] font-semibold tracking-[0.15em] text-muted">{row.dow}</span>
        <span className={cn("font-display text-lg font-extrabold leading-tight", isCancelled && "text-muted")}>
          {row.dayNumber}
        </span>
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm", isCancelled && "text-muted")}>{isCancelled ? <s>{row.title}</s> : row.title}</p>
        <p className="mt-0.5 text-xs text-muted">{row.description}</p>
        {row.state === "unmarked" ? <p className="mt-1 text-[11px] text-muted">{UNMARKED_HINT}</p> : null}
      </div>
      <StatusBadge label={badge.label} tone={badge.tone} />
    </div>
  );
}
