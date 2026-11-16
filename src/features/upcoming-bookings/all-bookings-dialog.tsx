"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import {
  bookingCountLabel,
  browsableMonths,
  monthName,
  monthTitle,
  rowsForMonth,
  shortWhen,
  type UpcomingBookingRow,
} from "./present-upcoming-bookings";
import { UpcomingBookingRowView } from "./upcoming-booking-row";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const FILTERS: { value: ServiceType | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "performance", label: "Performance" },
  { value: "recovery", label: "Recovery" },
  { value: "rehab", label: "Fisioterapia" },
];

export interface AllBookingsDialogProps {
  /** Already without the bookings that were just cancelled. */
  rows: UpcomingBookingRow[];
  currentMonthKey: string;
  /** Resolves true when the booking was cancelled. */
  cancel: (row: UpcomingBookingRow) => Promise<boolean>;
  busyId: string | null;
  onClose: () => void;
}

// Mounted only while a row is being confirmed, so it slides in once it is on screen.
function RowConfirmation({
  row,
  isBusy,
  onBack,
  onConfirm,
}: {
  row: UpcomingBookingRow;
  isBusy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-between gap-3 rounded border border-danger/45 bg-[#1f1414] px-4 transition-transform duration-300 ease-out max-sm:flex-col max-sm:items-stretch max-sm:justify-center max-sm:py-2",
        isShown ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div>
        <p className="font-display text-[15px] font-bold">¿Querés cancelar?</p>
        <p className="text-xs text-muted">{shortWhen(row)}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={isBusy} onClick={onBack}>
          No
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={isBusy} onClick={onConfirm}>
          Sí, cancelar
        </Button>
      </div>
    </div>
  );
}

export function AllBookingsDialog({ rows, currentMonthKey, cancel, busyId, onClose }: AllBookingsDialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Fixed when it opens, so cancelling the last booking of a month does not move the client to another one.
  const [months] = useState(() => browsableMonths(rows, currentMonthKey));
  const [monthKey, setMonthKey] = useState(months[0]);
  const [service, setService] = useState<ServiceType | "all">("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const monthIndex = months.indexOf(monthKey);
  const visible = rowsForMonth(rows, monthKey, service);

  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (confirmingId) setConfirmingId(null);
        else onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.closest("[inert]"),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmingId, onClose]);

  function goToMonth(index: number) {
    setConfirmingId(null);
    setMonthKey(months[index]);
  }

  async function confirmCancel(row: UpcomingBookingRow) {
    await cancel(row);
    setConfirmingId(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="flex h-[min(640px,90vh)] w-full max-w-[760px] flex-col rounded border border-line-strong bg-card"
      >
        <div className="border-b border-line px-6 pb-4 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={`${id}-title`} className="font-display text-[22px] font-extrabold">
                Tus reservas
              </h2>
              <p className="mt-1.5 text-[13px] text-muted">
                {bookingCountLabel(visible.length)} en {monthName(monthKey)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex size-11 items-center justify-center text-xl leading-none text-muted hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              aria-label="Mes anterior"
              disabled={monthIndex <= 0}
              onClick={() => goToMonth(monthIndex - 1)}
              className="size-11 px-0 py-0 text-base"
            >
              ←
            </Button>
            <p aria-live="polite" className="font-display text-lg font-extrabold uppercase tracking-wide">
              {monthTitle(monthKey)}
            </p>
            <Button
              type="button"
              variant="secondary"
              aria-label="Mes siguiente"
              disabled={monthIndex >= months.length - 1}
              onClick={() => goToMonth(monthIndex + 1)}
              className="size-11 px-0 py-0 text-base"
            >
              →
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                data-autofocus={value === "all" ? "" : undefined}
                aria-pressed={service === value}
                onClick={() => setService(value)}
                className={cn(
                  "min-h-11 rounded border px-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:min-h-0 sm:py-1.5",
                  service === value ? "border-white text-white" : "border-line text-muted hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No tenés reservas este mes.</p>
          ) : (
            <ul className="space-y-2.5">
              {visible.map((row) => (
                <li
                  key={row.id}
                  className={cn("transition-opacity", confirmingId && confirmingId !== row.id && "opacity-35")}
                >
                  <UpcomingBookingRowView
                    row={row}
                    showMonth={false}
                    onCancel={(selected) => setConfirmingId(selected.id)}
                    overlay={
                      confirmingId === row.id ? (
                        <RowConfirmation
                          row={row}
                          isBusy={busyId === row.id}
                          onBack={() => setConfirmingId(null)}
                          onConfirm={() => void confirmCancel(row)}
                        />
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
