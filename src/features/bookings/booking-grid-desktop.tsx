import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/cn";

import { BookingCartCard } from "./booking-cart-card";
import { PickedMark } from "./booking-cart-content";
import {
  AVAILABLE_CELL_CLASS,
  OCCUPANCY_LEGEND,
  occupancyStyle,
  UNAVAILABLE_CELL_CLASS,
} from "./occupancy-style";
import { occupancyLevel } from "./slots";
import type { BookingGridViewProps } from "./types";

export function BookingGridDesktop({
  service,
  services,
  onChangeService,
  weekLabel,
  atFirstWeek,
  atLastWeek,
  onPrevWeek,
  onNextWeek,
  days,
  dayIndex,
  rows,
  cart,
  onToggleSlot,
  onConfirm,
  renderSlotExtra,
}: BookingGridViewProps) {

  return (
    <Card className="p-14">
      <SectionLabel>04 — Disponibilidad</SectionLabel>
      <div className="mt-4 flex items-end justify-between gap-8">
        <Heading size="lg">Reservá tu horario.</Heading>
        <div className="flex gap-1.5">
          {services.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChangeService(s.value)}
              className={cn(
                "rounded px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em]",
                s.value === service ? "bg-white text-black" : "border border-line bg-card text-white",
              )}
            >
              {s.label}
              {cart.hasSlots(s.value) ? <PickedMark /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-6 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevWeek}
            disabled={atFirstWeek}
            aria-label="Semana anterior"
            className="h-9 w-9 rounded border border-line bg-card text-base text-white disabled:text-line"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            disabled={atLastWeek}
            aria-label="Semana siguiente"
            className="h-9 w-9 rounded border border-line bg-card text-base text-white disabled:text-line"
          >
            ›
          </button>
          <span className="ml-2 font-display text-base font-extrabold uppercase">{weekLabel}</span>
        </div>
        <div className="flex gap-5 text-[11px] text-muted">
          {OCCUPANCY_LEGEND.map((item) => (
            <span key={item.level} className="flex items-center gap-2">
              <span
                className={cn("block h-2.5 w-3.5 rounded-sm", item.level === "full" ? UNAVAILABLE_CELL_CLASS : AVAILABLE_CELL_CLASS)}
                style={occupancyStyle(item.level)}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_290px] items-start gap-10">
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-1.5">
            <span />
            {days.map((day, i) => (
              <div
                key={day.date}
                className={cn(
                  "flex flex-col gap-0.5 border-b-2 pb-2.5",
                  i === dayIndex ? "border-white" : "border-transparent",
                  day.isClosed ? "text-[#4a4a4a]" : "text-white",
                )}
              >
                <span className="text-[10px] font-semibold tracking-[0.2em]">{day.dow}</span>
                <span className="font-display text-2xl font-black leading-none">{day.dayNumber}</span>
                <span className="text-[10px] font-semibold tracking-[0.15em] text-[#555]">
                  {day.isToday ? "HOY" : day.isClosed ? "CERRADO" : day.freeCount === 0 ? "COMPLETO" : " "}
                </span>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-sm text-muted">No hay horarios cargados para esta semana.</p>
          ) : (
            rows.map((row) => (
              <div key={row.time} className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-1.5">
                <span className="self-center font-display text-sm font-bold text-muted">{row.time}</span>
                {row.cells.map((cell, i) => {
                  if (!cell) {
                    return <span key={i} className="h-7 rounded-md border-[1.5px] border-dashed border-line" />;
                  }
                  const isSelected = cart.isSelected(cell.slot.id);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!cell.isSelectable}
                      title={[row.time, cell.label, cell.coverageLabel].filter(Boolean).join(" · ")}
                      aria-label={[row.time, cell.label, cell.coverageLabel].filter(Boolean).join(" · ")}
                      onClick={() => onToggleSlot(cell.slot)}
                      aria-pressed={isSelected}
                      className={cn(
                        "grid h-7 place-items-center rounded-md",
                        isSelected && "border-[1.5px] border-white bg-white",
                        !isSelected && !cell.isSelectable && UNAVAILABLE_CELL_CLASS,
                        !isSelected && cell.isSelectable && AVAILABLE_CELL_CLASS,
                      )}
                      style={!isSelected ? occupancyStyle(occupancyLevel(cell.slot)) : undefined}
                    >
                      {/* A slot you already hold reads as "unavailable" otherwise — the same
                          grey as a full one — which is indistinguishable from "it didn't book". */}
                      {cell.slot.alreadyBooked ? (
                        <span aria-hidden="true" className="block size-2 rounded-full bg-[#5a9e78]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <BookingCartCard cart={cart} onConfirm={onConfirm} renderSlotExtra={renderSlotExtra} />
      </div>
    </Card>
  );
}
