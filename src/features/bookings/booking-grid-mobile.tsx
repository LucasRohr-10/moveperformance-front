import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/cn";

import { PickedMark } from "./booking-cart-content";
import { BookingCartTray } from "./booking-cart-tray";
import { AVAILABLE_CELL_CLASS, occupancyStyle, UNAVAILABLE_CELL_CLASS } from "./occupancy-style";
import { formatSlotTime, isSlotSelectable, occupancyLevel, slotLabel } from "./slots";
import type { BookingGridViewProps } from "./types";

export function BookingGridMobile({
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
  onSelectDay,
  groups,
  cart,
  onToggleSlot,
  onConfirm,
  renderSlotExtra,
}: BookingGridViewProps) {
  const day = days[dayIndex];

  return (
    // The floating card's clearance lives on the block below the grid (see BookingGrid).
    <div className="flex flex-col gap-6 pb-6">
      <div>
        <SectionLabel>04 — Disponibilidad</SectionLabel>
        <Heading size="md" className="mt-3">Reservá tu horario.</Heading>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {services.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChangeService(s.value)}
            className={cn(
              "h-11 rounded text-[10px] font-semibold uppercase tracking-[0.15em]",
              s.value === service ? "bg-white text-black" : "border border-line bg-card text-white",
            )}
          >
            {s.label}
            {cart.hasSlots(s.value) ? <PickedMark /> : null}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-extrabold uppercase">{weekLabel}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onPrevWeek}
              disabled={atFirstWeek}
              aria-label="Semana anterior"
              className="h-9 w-11 rounded border border-line bg-card text-white disabled:text-line"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={onNextWeek}
              disabled={atLastWeek}
              aria-label="Semana siguiente"
              className="h-9 w-11 rounded border border-line bg-card text-white disabled:text-line"
            >
              ›
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelectDay(i)}
              className={cn(
                "flex h-[72px] flex-col items-center justify-between rounded border py-2",
                i === dayIndex ? "border-white bg-white text-black" : "border-line bg-card text-white",
                d.isClosed && i !== dayIndex && "opacity-40",
              )}
            >
              <span className="text-[9px] font-semibold tracking-[0.12em]">{d.dow}</span>
              <span className="font-display text-[19px] font-black leading-none">{d.dayNumber}</span>
              <span className={cn("block h-[3px] w-3/5 rounded-full", i === dayIndex ? "bg-black/20" : "bg-line")}>
                <span
                  className={cn("block h-full rounded-full", i === dayIndex ? "bg-black" : "bg-white")}
                  style={{ width: d.totalCount ? `${Math.round((d.freeCount / d.totalCount) * 100)}%` : "0%" }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-display text-base font-extrabold uppercase">
          {day.dow} {day.dayNumber}
        </span>
        <span className="text-[11px] text-muted">
          {day.isClosed ? "Cerrado" : day.freeCount ? `${day.freeCount} de ${day.totalCount} horarios libres` : "Sin horarios libres"}
        </span>
      </div>

      {day.freeCount === 0 ? (
        <div className="flex flex-col items-center gap-3.5 rounded border border-dashed border-line px-5 py-7 text-center">
          <span className="text-[13px] leading-relaxed text-muted">
            {day.isClosed ? "No hay turnos para este servicio este día." : "No quedan horarios libres para este día."}
          </span>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <span className="pb-1 text-[10px] font-medium uppercase tracking-[0.3em] text-muted">{group.label}</span>
            {group.slots.map((slot) => {
              const selectable = isSlotSelectable(slot);
              const isSelected = cart.isSelected(slot.id);
              const level = occupancyLevel(slot);
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => onToggleSlot(slot)}
                  aria-pressed={isSelected}
                  className={cn(
                    "grid h-[52px] grid-cols-[60px_minmax(0,1fr)_92px] items-center gap-3 rounded-md px-3.5 text-left",
                    isSelected && "border-[1.5px] border-white bg-white text-black",
                    !isSelected && selectable && [AVAILABLE_CELL_CLASS, "text-white"],
                    !isSelected && !selectable && [UNAVAILABLE_CELL_CLASS, "text-[#4a4a4a]"],
                  )}
                  style={!isSelected ? occupancyStyle(level) : undefined}
                >
                  <span className="font-display text-base font-extrabold">{formatSlotTime(slot.startsAt)}</span>
                  <span />
                  <span className={cn("text-right text-[11px]", isSelected ? "text-black/60" : "text-muted")}>
                    {selectable ? (cart.policy.slotHint(slot) ?? "") : slotLabel(slot)}
                  </span>
                </button>
              );
            })}
          </div>
        ))
      )}

      <BookingCartTray cart={cart} onConfirm={onConfirm} renderSlotExtra={renderSlotExtra} />
    </div>
  );
}
