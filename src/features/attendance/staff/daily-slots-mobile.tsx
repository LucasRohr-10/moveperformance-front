"use client";

import Link from "next/link";

import { ROUTES } from "@/config/constants/routes.constants";
import { formatSlotTime } from "@/features/bookings/slots";
import type { DailySlot } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { DayNavigator } from "./day-navigator";
import {
  countLabel,
  isBookedSlot,
  occupancyPercent,
  SERVICE_FILTERS,
  SERVICE_LABEL,
  type DailySlotsViewProps,
  type ScheduleRow,
} from "./schedule-model";
import { SlotNotes } from "./slot-notes";
import { SlotsFallback } from "./slots-fallback";

function MobileSlot({ slot }: { slot: DailySlot }) {
  const isBooked = isBookedSlot(slot);
  const cardClass = cn(
    "flex min-h-16 items-center justify-between gap-3 rounded border px-4 py-3.5",
    isBooked ? "border-[#4a4a4a] bg-[#1f1f1f]" : "border-dashed border-line bg-transparent",
  );

  const content = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-sm", isBooked ? "font-semibold text-white" : "font-normal text-[#7a7a7a]")}>
          {SERVICE_LABEL[slot.service]}
        </span>
        {slot.professionalName ? (
          <span className="truncate text-xs text-[#bdbdbd]">{slot.professionalName}</span>
        ) : null}
        <SlotNotes slot={slot} className="mt-1" />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={cn(
            "tabular-nums",
            isBooked ? "text-sm font-semibold text-white" : "text-xs font-normal text-[#7a7a7a]",
          )}
        >
          {countLabel(slot)}
        </span>
        {isBooked ? (
          <span className="block h-0.5 w-11 bg-white/12">
            <span className="block h-0.5 bg-white" style={{ width: `${occupancyPercent(slot)}%` }} />
          </span>
        ) : null}
      </span>
    </>
  );

  // A cancelled slot has no attendance to take, so it is not a link.
  if (slot.cancelledAt) return <div className={cardClass}>{content}</div>;

  return (
    <Link
      href={`${ROUTES.STAFF_SCHEDULE}/${slot.id}`}
      aria-label={`Ver asistencia de ${SERVICE_LABEL[slot.service]} ${formatSlotTime(slot.startsAt)}`}
      className={cardClass}
    >
      {content}
    </Link>
  );
}

function MobileRow({ row, isFirst }: { row: ScheduleRow; isFirst: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[56px_minmax(0,1fr)] gap-3",
        !isFirst && "border-t border-[#1c1c1c]",
        row.isPast && "opacity-70",
        // The highlight bleeds 20px each side to reach the screen edges past the list's padding.
        row.isNow && "bg-[#181818] shadow-[-20px_0_0_#181818,20px_0_0_#181818]",
      )}
    >
      <div className="flex flex-col gap-1 pt-5">
        <span className={cn("text-[13px] font-semibold tabular-nums", row.isNow ? "text-white" : "text-[#bdbdbd]")}>
          {row.time}
        </span>
        {row.isNow ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">Ahora</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5 py-3.5">
        {row.slots.map((slot) => (
          <MobileSlot key={slot.id} slot={slot} />
        ))}
      </div>
    </div>
  );
}

/** The staff attendance screen from `MOVE Staff Turnos Mobile.html`: a sticky day + service bar over one card per slot. */
export function DailySlotsMobile({
  date,
  onChangeDate,
  filter,
  onChangeFilter,
  rows,
  status,
  onRetry,
}: DailySlotsViewProps) {
  const showRows = status === "ready" && rows.length > 0;

  return (
    <div data-testid="daily-slots-mobile" className="md:hidden">
      <div className="sticky top-0 z-[5] border-b border-line bg-bg px-5 pt-5 pb-4">
        <DayNavigator date={date} onChange={onChangeDate} variant="mobile" />

        <div role="group" aria-label="Filtrar por servicio" className="mt-4 grid grid-cols-4 gap-2">
          {SERVICE_FILTERS.map((option) => {
            const isActive = option.value === filter;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChangeFilter(option.value)}
                className={cn(
                  "flex h-11 min-w-0 flex-col items-center justify-center gap-[3px] rounded border px-1 text-xs font-medium whitespace-nowrap",
                  isActive ? "border-white bg-white text-black" : "border-line bg-transparent text-[#bdbdbd]",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-2 pb-10">
        {showRows ? (
          <>
            {rows.map((row, index) => (
              <MobileRow key={row.time} row={row} isFirst={index === 0} />
            ))}
            <p className="mt-6 text-center text-xs text-muted">Tocá un turno para ver y marcar la asistencia.</p>
          </>
        ) : (
          <SlotsFallback status={status} filter={filter} onRetry={onRetry} />
        )}

        <Link
          href={`${ROUTES.STAFF_SCHEDULE_EDIT}?date=${date}`}
          className="mt-6 flex h-11 items-center justify-center rounded border border-line text-[11px] font-semibold uppercase tracking-[0.15em] text-white"
        >
          Editar día
        </Link>
      </div>
    </div>
  );
}
