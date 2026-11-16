"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ROUTES } from "@/config/constants/routes.constants";
import { formatSlotTime } from "@/features/bookings/slots";
import type { DailySlot, ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { DayNavigator } from "./day-navigator";
import {
  countLabel,
  isBookedSlot,
  occupancyPercent,
  SERVICE_FILTERS,
  SERVICE_LABEL,
  visibleServices,
  type DailySlotsViewProps,
  type ScheduleRow,
  type ScheduleView,
  type ServiceFilter,
} from "./schedule-model";
import { SlotNotes } from "./slot-notes";
import { SlotsFallback } from "./slots-fallback";

const VIEWS: { value: ScheduleView; label: string }[] = [
  { value: "grid", label: "Grilla" },
  { value: "list", label: "Lista" },
];

// The hour column plus one column per visible service (all three, or the one filtered).
const GRID_COLUMNS = {
  1: "grid-cols-[64px_minmax(0,1fr)]",
  3: "grid-cols-[64px_repeat(3,minmax(0,1fr))]",
} as const;

const SLOT_CARD_BOOKED = "border-[#4a4a4a] bg-[#1f1f1f]";
const SLOT_CARD_EMPTY = "border-dashed border-line bg-transparent";

function slotLabel(slot: DailySlot): string {
  return `Ver asistencia de ${SERVICE_LABEL[slot.service]} ${formatSlotTime(slot.startsAt)}`;
}

function HourCell({ row }: { row: ScheduleRow }) {
  return (
    <span
      className={cn(
        "flex min-h-[52px] flex-col justify-center gap-1 self-stretch px-4 text-[13px] font-semibold tabular-nums",
        row.isNow ? "text-white shadow-[inset_2px_0_0_#fff]" : "text-[#bdbdbd]",
      )}
    >
      {row.time}
      {row.isNow ? (
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">Ahora</span>
      ) : null}
    </span>
  );
}

function GridCell({ slot }: { slot: DailySlot }) {
  const isBooked = isBookedSlot(slot);
  // `flex-1`: the cell stretches to the row's height, so the card fills it next to a taller neighbor.
  const cardClass = cn(
    "block flex-1 rounded border px-2.5 pt-[9px] pb-2.5",
    isBooked ? SLOT_CARD_BOOKED : SLOT_CARD_EMPTY,
  );

  const content = (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "tabular-nums",
            isBooked ? "text-[13px] font-semibold text-white" : "text-xs font-normal text-[#7a7a7a]",
          )}
        >
          {countLabel(slot)}
        </span>
        {slot.professionalName ? (
          <span className="truncate text-[11px] text-[#bdbdbd]">{slot.professionalName}</span>
        ) : null}
      </span>
      {/* Kept (invisible) on cards without bookings so every card is as tall as one that has them. */}
      <span aria-hidden="true" className={cn("mt-2 block h-0.5 bg-white/12", !isBooked && "invisible")}>
        <span className="block h-0.5 bg-white" style={{ width: `${occupancyPercent(slot)}%` }} />
      </span>
      <SlotNotes slot={slot} className="mt-2" />
    </>
  );

  // A cancelled slot has no attendance to take, so it is not a link.
  if (slot.cancelledAt) return <div className={cardClass}>{content}</div>;

  return (
    <Link
      href={`${ROUTES.STAFF_SCHEDULE}/${slot.id}`}
      title="Ver asistencia"
      aria-label={slotLabel(slot)}
      className={cn(cardClass, "hover:border-white")}
    >
      {content}
    </Link>
  );
}

function GridView({ rows, services }: { rows: ScheduleRow[]; services: ServiceType[] }) {
  const columns = services.length === 1 ? GRID_COLUMNS[1] : GRID_COLUMNS[3];

  return (
    <>
      <div className={cn("grid gap-x-4 bg-soft pr-4", columns)}>
        <span className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">Hora</span>
        {services.map((service) => (
          <span
            key={service}
            className="flex items-center gap-2 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-white"
          >
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-white" />
            {SERVICE_LABEL[service]}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={row.time}
          className={cn(
            "grid gap-x-4 border-t border-line pr-4",
            columns,
            row.isNow && "bg-[#181818]",
            row.isPast && "opacity-70",
          )}
        >
          <HourCell row={row} />
          {services.map((service) => {
            const cellSlots = row.slots.filter((slot) => slot.service === service);
            return (
              <div key={service} className="flex min-w-0 flex-col gap-1.5 py-2">
                {cellSlots.map((slot) => (
                  <GridCell key={slot.id} slot={slot} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

function ListChip({ slot }: { slot: DailySlot }) {
  const isBooked = isBookedSlot(slot);
  const chipClass = cn(
    "grid items-center rounded border px-3 py-2 text-[13px]",
    isBooked ? SLOT_CARD_BOOKED : SLOT_CARD_EMPTY,
  );

  const content = (
    <>
      {/* Invisible, the widest chip's content ("Performance" + "Sin reservas"): it sets every chip's width. */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 flex gap-2.5">
        <span className="font-semibold">{SERVICE_LABEL.performance}</span>
        <span className="text-xs">{countLabel({ ...slot, booked: 0, cancelledAt: null })}</span>
      </span>
      <span className="col-start-1 row-start-1 flex items-center justify-center gap-2.5">
        <span className={isBooked ? "font-semibold text-white" : "font-normal text-[#7a7a7a]"}>
          {SERVICE_LABEL[slot.service]}
        </span>
        <span className={cn("tabular-nums", isBooked ? "text-[13px] text-[#bdbdbd]" : "text-xs text-[#7a7a7a]")}>
          {countLabel(slot)}
        </span>
        <SlotNotes slot={slot} />
      </span>
    </>
  );

  if (slot.cancelledAt) return <div className={chipClass}>{content}</div>;

  return (
    <Link
      href={`${ROUTES.STAFF_SCHEDULE}/${slot.id}`}
      title="Ver asistencia"
      aria-label={slotLabel(slot)}
      className={cn(chipClass, "hover:border-white")}
    >
      {content}
    </Link>
  );
}

function ListView({ rows, filter }: { rows: ScheduleRow[]; filter: ServiceFilter }) {
  return (
    <>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] bg-soft pr-4">
        <span className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">Hora</span>
        <span className="flex items-center gap-2 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
          {filter === "all" ? null : <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-white" />}
          {filter === "all" ? "Turnos" : SERVICE_LABEL[filter]}
        </span>
      </div>
      {rows.map((row) => (
        <div
          key={row.time}
          className={cn(
            "grid grid-cols-[64px_minmax(0,1fr)] items-center border-t border-line",
            row.isNow && "bg-[#181818]",
            row.isPast && "opacity-70",
          )}
        >
          <HourCell row={row} />
          <div className="flex flex-wrap gap-1.5 py-2 pr-3">
            {row.slots.map((slot) => (
              <ListChip key={slot.id} slot={slot} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Surface({ children }: { children: ReactNode }) {
  return <div className="mt-5 overflow-hidden rounded border border-line bg-card">{children}</div>;
}

/** The staff attendance screen from `MOVE Staff Turnos.html`: day bar, service filter, grid or list. */
export function DailySlotsDesktop({
  date,
  onChangeDate,
  filter,
  onChangeFilter,
  rows,
  status,
  onRetry,
}: DailySlotsViewProps) {
  const [view, setView] = useState<ScheduleView>("grid");
  const showRows = status === "ready" && rows.length > 0;

  return (
    <div data-testid="daily-slots-desktop" className="hidden md:block">
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <DayNavigator date={date} onChange={onChangeDate} variant="desktop" />

        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Filtrar por servicio" className="flex gap-1.5">
            {SERVICE_FILTERS.map((option) => {
              const isActive = option.value === filter;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChangeFilter(option.value)}
                  className={cn(
                    "flex items-center gap-2 rounded border px-3 py-[7px] text-xs font-medium",
                    isActive ? "border-white bg-white text-black" : "border-line bg-transparent text-muted",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div role="group" aria-label="Vista" className="flex overflow-hidden rounded border border-line">
            {VIEWS.map((option, index) => {
              const isActive = option.value === view;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setView(option.value)}
                  className={cn(
                    "px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em]",
                    index > 0 && "border-l border-line",
                    isActive ? "bg-white text-black" : "bg-transparent text-muted",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <Link
            href={`${ROUTES.STAFF_SCHEDULE_EDIT}?date=${date}`}
            className="flex h-9 items-center rounded border border-line px-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-white hover:border-white"
          >
            Editar día
          </Link>
        </div>
      </div>

      <Surface>
        {showRows ? (
          view === "grid" ? (
            <GridView rows={rows} services={visibleServices(filter)} />
          ) : (
            <ListView rows={rows} filter={filter} />
          )
        ) : (
          <SlotsFallback status={status} filter={filter} onRetry={onRetry} className="px-5" />
        )}
      </Surface>

      {showRows ? <p className="mt-3 text-xs text-muted">Tocá un turno para ver y marcar la asistencia.</p> : null}
    </div>
  );
}
