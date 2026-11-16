import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/cn";

import { BOOKING_ERROR_ACTIONS } from "../booking-error-actions";
import { AVAILABLE_CELL_CLASS, UNAVAILABLE_CELL_CLASS } from "../occupancy-style";
import { savePendingSlotIntent } from "../pending-slot-intent";
import { coverageText, formatSlotTime } from "../slots";
import { AuthPanel } from "./auth-panel";
import type { PublicBookingViewProps } from "./types";

// Only shown once the preview actually says "not covered" — a null verdict (anonymous
// visitor, or a service with no plan concept) shows nothing, never a false warning.
function SlotCoverageNotice({
  slot,
  userId,
}: {
  slot: PublicBookingViewProps["selectedSlot"];
  userId: string | null;
}) {
  const eligibility = slot?.eligibility;
  if (!slot || !eligibility || eligibility.covered !== false) return null;
  const text = coverageText(eligibility);
  const action = eligibility.reason ? BOOKING_ERROR_ACTIONS[eligibility.reason]?.(slot) : null;
  if (!text) return null;
  // Either action navigates away (eventually through an external Mercado Pago redirect) —
  // remember this slot so the user doesn't have to pick it again on return. Paying for the
  // session keeps it in the selection until the API confirms the booking, so a pending or
  // rejected payment does not lose it.
  const onLeaveToPay = action
    ? () =>
        savePendingSlotIntent({
          surface: "reservar",
          userId,
          payingSlotId: eligibility.reason === "PACKAGE_REQUIRED" ? slot.id : null,
          slots: [{ slotId: slot.id, service: slot.service, startsAt: slot.startsAt }],
        })
    : undefined;
  return (
    <p className="flex items-center justify-between gap-2 rounded border border-warning/30 bg-warning/[0.08] px-2.5 py-2 text-xs leading-relaxed text-[#d4d4d4]">
      <span>{text}</span>
      {action ? (
        <Link
          href={action.href}
          onClick={onLeaveToPay}
          className="shrink-0 font-semibold text-white underline-offset-2 hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </p>
  );
}


export function PublicBookingDesktop({
  service,
  services,
  onChangeService,
  weekLabel,
  atFirstWeek,
  atLastWeek,
  onPrevWeek,
  onNextWeek,
  onGoToday,
  isToday,
  days,
  dayIndex,
  rows,
  selectedSlot,
  onSelectSlot,
  step,
  user,
  onConfirmClick,
  onAuthenticated,
  onCancelAuth,
  onSignOut,
  isConfirming,
  confirmLabel,
  booking,
  onReset,
}: PublicBookingViewProps) {
  const current = services.find((s) => s.value === service)!;

  return (
    <Card className="p-14">
      <SectionLabel>RESERVAS</SectionLabel>
      <div className="mt-4 flex items-end justify-between gap-8">
        <Heading size="lg">Reservá tu horario.</Heading>
        <div className="flex gap-1.5">
          {services.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChangeService(s.value)}
              className={cn(
                "rounded px-[18px] py-[11px] text-[10px] font-semibold uppercase tracking-[0.2em]",
                s.value === service ? "bg-white text-black" : "border border-line bg-card text-white",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-2 border-t border-line pt-5">
        <button
          type="button"
          onClick={onPrevWeek}
          disabled={atFirstWeek}
          aria-label="Semana anterior"
          className="h-9 w-9 rounded border border-line bg-card text-base text-white disabled:text-[#3a3a3a]"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onNextWeek}
          disabled={atLastWeek}
          aria-label="Semana siguiente"
          className="h-9 w-9 rounded border border-line bg-card text-base text-white disabled:text-[#3a3a3a]"
        >
          ›
        </button>
        <span className="ml-2 font-display text-base font-extrabold uppercase">{weekLabel}</span>
        <button
          type="button"
          onClick={onGoToday}
          disabled={isToday}
          className="ml-2 rounded border border-line px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white disabled:text-muted"
        >
          Hoy
        </button>
      </div>

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-10">
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
                <span className="text-[10px] font-semibold text-[#555]">
                  {day.isToday ? "HOY" : day.isClosed ? "CERRADO" : day.freeCount === 0 ? "COMPLETO" : " "}
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
                  const isSelected = selectedSlot?.id === cell.slot.id;
                  const isPast = cell.label === "" && !cell.isSelectable;
                  if (isPast) {
                    return <span key={i} className={cn("h-7 rounded-md", UNAVAILABLE_CELL_CLASS)} />;
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!cell.isSelectable}
                      title={[row.time, cell.label, cell.coverageLabel].filter(Boolean).join(" · ")}
                      aria-label={[row.time, cell.label, cell.coverageLabel].filter(Boolean).join(" · ")}
                      onClick={() => onSelectSlot(i, cell.slot.id)}
                      className={cn(
                        "h-7 rounded-md",
                        isSelected && "border-[1.5px] border-white bg-white",
                        !isSelected && !cell.isSelectable && UNAVAILABLE_CELL_CLASS,
                        !isSelected && cell.isSelectable && AVAILABLE_CELL_CLASS,
                      )}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-[22px] rounded border border-line bg-card p-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted">{current.label}</span>
            <span className="font-display text-lg font-extrabold uppercase leading-tight">{current.title}</span>
          </div>

          {booking ? (
            <div className="flex flex-col gap-3 border-t border-line pt-5">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-success text-xl text-black">
                ✓
              </span>
              <span className="font-display text-xl font-black uppercase">Reserva confirmada.</span>
              <span className="text-xs leading-relaxed text-muted">
                {current.label} · {formatSlotTime(booking.startsAt)} hs. Te enviamos la confirmación por mail.
              </span>
              <Button variant="secondary" fullWidth onClick={onReset}>
                Reservar otro horario
              </Button>
            </div>
          ) : (
            <>
              {selectedSlot ? (
                <div className="flex flex-col gap-3.5 border-t border-line pt-5">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted">Tu reserva</span>
                  <span className="font-display text-lg font-bold">
                    {formatSlotTime(selectedSlot.startsAt)} – {formatSlotTime(selectedSlot.endsAt)}
                  </span>
                  <SlotCoverageNotice slot={selectedSlot} userId={user?.id ?? null} />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 border-t border-line pt-5">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted">Tu reserva</span>
                  <p className="text-[13px] leading-relaxed text-muted">
                    Elegí un horario disponible en la grilla.
                  </p>
                </div>
              )}

              {step === "auth" ? (
                <AuthPanel onAuthenticated={onAuthenticated} onCancel={onCancelAuth} />
              ) : (
                <div className="flex flex-col gap-2">
                  {user ? (
                    <p className="text-xs text-muted">
                      Reservás como {user.name}.{" "}
                      <button type="button" onClick={onSignOut} className="underline-offset-2 hover:text-white hover:underline">
                        No soy yo
                      </button>
                    </p>
                  ) : null}
                  <Button fullWidth disabled={!selectedSlot || isConfirming} onClick={onConfirmClick}>
                    {isConfirming ? "Reservando…" : confirmLabel}
                  </Button>
                  {!user ? (
                    <p className="text-xs text-muted">Para confirmar te pedimos que ingreses o crees tu cuenta.</p>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
