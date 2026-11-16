import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { TrashIcon } from "@/components/ui/trash-icon";
import { cn } from "@/lib/cn";

import { shortWhen, type UpcomingBookingRow } from "./present-upcoming-bookings";

export interface UpcomingBookingRowViewProps {
  row: UpcomingBookingRow;
  /** The card shows the month under the day number; the dialog already has it in its header. */
  showMonth: boolean;
  /** Shows the trash button, but only when the API says the booking can be cancelled. */
  onCancel?: (row: UpcomingBookingRow) => void;
  /** Covers the row, e.g. the in-place cancel confirmation. */
  overlay?: ReactNode;
}

export function UpcomingBookingRowView({ row, showMonth, onCancel, overlay }: UpcomingBookingRowViewProps) {
  const { day } = row;

  return (
    <div
      className={cn(
        "relative grid grid-cols-[56px_minmax(0,1fr)_auto_48px] items-stretch overflow-hidden rounded border border-line bg-raised sm:grid-cols-[64px_minmax(0,1fr)_auto_64px]",
        day.isToday && "shadow-[inset_2px_0_0_#fff]",
      )}
    >
      <div className="flex flex-col items-center justify-center border-r border-line py-3.5 text-center">
        <span className={cn("text-[10px] font-semibold tracking-[0.2em]", day.isToday ? "text-white" : "text-muted")}>
          {day.isToday ? "HOY" : day.dow}
        </span>
        <span className="font-display text-2xl font-extrabold leading-tight">{day.dayNumber}</span>
        {showMonth ? <span className="text-[9px] font-semibold tracking-[0.2em] text-muted">{day.month}</span> : null}
      </div>

      <div className="flex min-w-0 flex-col justify-center py-3.5 pl-4 pr-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">{row.serviceLabel}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
          {row.title}
          {row.isPendingPayment ? <StatusBadge label="Pago pendiente" tone="warning" /> : null}
        </span>
      </div>

      <div className="flex flex-col items-end justify-center py-3.5 pr-4 text-right">
        <span className="font-display text-lg font-bold leading-tight">{row.time}</span>
        <span className="text-xs text-muted">{row.durationMinutes} min</span>
      </div>

      <div className="flex items-center justify-center border-l border-line">
        {row.canCancel && onCancel ? (
          <button
            type="button"
            onClick={() => onCancel(row)}
            aria-label={`Cancelar reserva del ${shortWhen(row)}`}
            className="flex size-11 items-center justify-center text-muted transition-colors hover:text-danger focus-visible:text-danger focus-visible:outline-none"
          >
            <TrashIcon className="size-[18px]" />
          </button>
        ) : null}
      </div>

      {overlay}
    </div>
  );
}
