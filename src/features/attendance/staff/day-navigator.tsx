"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { addDaysToDate, todayBusinessDate } from "@/features/bookings/slots";
import { cn } from "@/lib/cn";

import { buildCalendarWeeks, monthKeyOf, monthLabel, shiftMonthKey, WEEKDAY_LABELS } from "./calendar-grid";

// The API takes the business date as `YYYY-MM-DD`; the calendar names each day the way
// every other date in the app is shown.
function formatBusinessDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

const NAVIGATOR_DATE = new Intl.DateTimeFormat("es-UY", { weekday: "short", day: "numeric", month: "short" });

// The date button's label, e.g. "Mié 28 oct."
function formatNavigatorDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const parts = NAVIGATOR_DATE.formatToParts(new Date(year, month - 1, day));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = part("weekday");
  const monthName = part("month");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${part("day")} ${
    monthName.endsWith(".") ? monthName : `${monthName}.`
  }`;
}

export type DayNavigatorVariant = "desktop" | "mobile";

/** Previous day / date (opens a calendar) / next day. The two variants are the two designs of the same control. */
export function DayNavigator({
  date,
  onChange,
  variant,
}: {
  date: string;
  onChange(date: string): void;
  variant: DayNavigatorVariant;
}) {
  const calendarId = useId();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => monthKeyOf(date));
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarTriggerRef = useRef<HTMLButtonElement>(null);
  const isMobile = variant === "mobile";
  const isToday = date === todayBusinessDate();

  function openCalendar() {
    setCalendarMonth(monthKeyOf(date));
    setIsCalendarOpen(true);
  }

  function closeCalendar({ restoreFocus } = { restoreFocus: false }) {
    setIsCalendarOpen(false);
    if (restoreFocus) calendarTriggerRef.current?.focus();
  }

  function pickDate(nextDate: string) {
    onChange(nextDate);
    closeCalendar({ restoreFocus: true });
  }

  // Same outside-click + Escape idiom as `mobile-profile-header`'s overlays:
  // a click outside just closes, Escape closes and returns focus to the trigger.
  useEffect(() => {
    if (!isCalendarOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCalendar({ restoreFocus: true });
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCalendarOpen]);

  function stepButton(label: string, glyph: string, delta: number) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => onChange(addDaysToDate(date, delta))}
        className={cn(
          "rounded border border-line text-white",
          isMobile ? "h-11 text-base" : "size-9 text-[13.333px] hover:border-white",
        )}
      >
        {glyph}
      </button>
    );
  }

  return (
    <div className={isMobile ? "grid grid-cols-[44px_1fr_44px] gap-2" : "flex items-center gap-2"}>
      {stepButton("Día anterior", "‹", -1)}

      <div ref={calendarRef} className="relative">
        <button
          ref={calendarTriggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isCalendarOpen}
          aria-controls={calendarId}
          onClick={() => (isCalendarOpen ? closeCalendar() : openCalendar())}
          className={cn(
            "flex items-center gap-2 rounded border border-line font-semibold text-white",
            isMobile ? "h-11 w-full justify-center text-sm" : "h-9 px-4 text-[13px] hover:border-white",
          )}
        >
          <span>{formatNavigatorDate(date)}</span>
          {isMobile ? (
            isToday ? (
              <span className="rounded-[3px] bg-white px-1.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.2em] text-black">
                Hoy
              </span>
            ) : null
          ) : (
            <span className="font-normal text-muted">{date.slice(0, 4)}</span>
          )}
          <span className="sr-only"> — cambiar fecha</span>
        </button>

        {isCalendarOpen ? (
          <div
            id={calendarId}
            role="dialog"
            aria-label="Elegir fecha"
            className={cn(
              "absolute top-[calc(100%+8px)] z-20 w-72 rounded border border-line bg-card p-4",
              isMobile ? "left-1/2 -translate-x-1/2" : "left-0",
            )}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setCalendarMonth((month) => shiftMonthKey(month, -1))}
                className="rounded p-1 text-muted hover:text-white"
              >
                ‹
              </button>
              <span aria-live="polite" className="text-xs font-semibold uppercase tracking-wide">
                {monthLabel(calendarMonth)}
              </span>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setCalendarMonth((month) => shiftMonthKey(month, 1))}
                className="rounded p-1 text-muted hover:text-white"
              >
                ›
              </button>
            </div>

            <table className="mt-3 w-full border-collapse text-center text-xs">
              <caption className="sr-only">{monthLabel(calendarMonth)}</caption>
              <thead>
                <tr>
                  {WEEKDAY_LABELS.map((label) => (
                    <th key={label} scope="col" className="pb-2 font-normal text-muted">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildCalendarWeeks(calendarMonth).map((week) => (
                  <tr key={week[0].date}>
                    {week.map((day) => {
                      const isSelected = day.date === date;
                      const isDayToday = day.date === todayBusinessDate();
                      return (
                        <td key={day.date} className="p-0.5">
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            aria-current={isDayToday ? "date" : undefined}
                            aria-label={formatBusinessDate(day.date)}
                            onClick={() => pickDate(day.date)}
                            className={cn(
                              "h-8 w-8 rounded",
                              day.isOutside && "text-line",
                              !day.isOutside && !isSelected && "text-white hover:bg-soft",
                              isDayToday && !isSelected && "border border-line",
                              isSelected && "bg-white font-semibold text-black",
                            )}
                          >
                            {day.dayNumber}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => pickDate(todayBusinessDate())}>
                Ir a hoy
              </Button>
              <Button variant="secondary" size="sm" onClick={() => closeCalendar({ restoreFocus: true })}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {stepButton("Día siguiente", "›", 1)}

      {!isMobile && isToday ? (
        <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Hoy</span>
      ) : null}
    </div>
  );
}
