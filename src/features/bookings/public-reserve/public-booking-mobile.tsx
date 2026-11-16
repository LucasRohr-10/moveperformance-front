import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/cn";

import { BOOKING_ERROR_ACTIONS } from "../booking-error-actions";
import { AVAILABLE_CELL_CLASS, UNAVAILABLE_CELL_CLASS } from "../occupancy-style";
import { savePendingSlotIntent } from "../pending-slot-intent";
import { coverageLabel, coverageText, formatSlotTime, isPastSlot, isSlotSelectable } from "../slots";
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

export function PublicBookingMobile({
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
  onSelectDay,
  groups,
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
  const day = days[dayIndex];
  const current = services.find((s) => s.value === service)!;
  const showOverlay = step === "auth" || isConfirming || booking !== null;

  if (showOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg">
        <div className="flex h-14 items-center justify-between border-b border-line px-5">
          <span className="font-display text-base font-extrabold uppercase">
            {booking ? "Listo" : "Confirmá tu reserva"}
          </span>
          {!booking ? (
            <button
              type="button"
              onClick={onCancelAuth}
              aria-label="Volver a la grilla"
              className="flex h-11 w-11 items-center justify-center text-xl text-white"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 px-5 py-7">
          {booking ? (
            <div className="flex flex-col items-start gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-success text-xl text-black">
                ✓
              </span>
              <span className="font-display text-2xl font-black uppercase">Reserva confirmada.</span>
              <span className="text-sm leading-relaxed text-muted">
                {current.label} · {formatSlotTime(booking.startsAt)} hs. Te enviamos la confirmación por mail.
              </span>
              <Button variant="secondary" fullWidth onClick={onReset}>
                Reservar otro horario
              </Button>
            </div>
          ) : (
            <>
              {selectedSlot ? (
                <div className="flex flex-col gap-3.5 border-b border-line pb-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-[84px] w-[72px] flex-col items-center justify-center gap-0.5 rounded bg-white text-black">
                      <span className="text-[10px] font-semibold">{day.dow}</span>
                      <span className="font-display text-3xl font-black leading-none">{day.dayNumber}</span>
                      <span className="text-[10px] font-semibold">{day.month}</span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-success">{current.label}</span>
                      <span className="font-display text-xl font-extrabold">
                        {formatSlotTime(selectedSlot.startsAt)} – {formatSlotTime(selectedSlot.endsAt)}
                      </span>
                      <span className="truncate text-xs text-muted">{current.title}</span>
                      <button type="button" onClick={onCancelAuth} className="w-fit text-xs text-muted underline-offset-2 hover:underline">
                        ← Cambiar horario
                      </button>
                    </div>
                  </div>
                  <SlotCoverageNotice slot={selectedSlot} userId={user?.id ?? null} />
                </div>
              ) : null}

              {user ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-muted">
                    Reservás como {user.name}.{" "}
                    <button type="button" onClick={onSignOut} className="underline-offset-2 hover:text-white hover:underline">
                      No soy yo
                    </button>
                  </p>
                  <Button fullWidth disabled={!selectedSlot || isConfirming} onClick={onConfirmClick}>
                    {isConfirming ? "Reservando…" : confirmLabel}
                  </Button>
                </div>
              ) : (
                <>
                  <AuthPanel onAuthenticated={onAuthenticated} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div>
        <SectionLabel>RESERVAS</SectionLabel>
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
              className="h-9 w-11 rounded border border-line bg-card text-white disabled:text-[#3a3a3a]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={onNextWeek}
              disabled={atLastWeek}
              aria-label="Semana siguiente"
              className="h-9 w-11 rounded border border-line bg-card text-white disabled:text-[#3a3a3a]"
            >
              ›
            </button>
            <button
              type="button"
              onClick={onGoToday}
              disabled={isToday}
              className="h-9 rounded border border-line px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white disabled:text-muted"
            >
              Hoy
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
                "flex h-16 flex-col items-center justify-between rounded border py-2",
                i === dayIndex ? "border-white bg-white text-black" : "border-line bg-card text-white",
                d.isClosed && i !== dayIndex && "opacity-40",
              )}
            >
              <span className="text-[9px] font-semibold tracking-[0.12em]">{d.isToday ? "HOY" : d.dow}</span>
              <span className="font-display text-[19px] font-black leading-none">{d.dayNumber}</span>
              <span
                className={cn(
                  "block h-[5px] w-[5px] rounded-full",
                  d.freeCount > 0 ? "bg-white" : "bg-[#333]",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-display text-base font-extrabold uppercase">
          {day.dow} {day.dayNumber} {day.month}
        </span>
        <span className="text-[11px] text-muted">{day.freeCount} disponibles</span>
      </div>

      {day.freeCount === 0 ? (
        <div className="flex flex-col items-center gap-3.5 rounded border border-dashed border-line px-5 py-7 text-center">
          <span className="text-[13px] leading-relaxed text-muted">No hay horarios disponibles este día.</span>
        </div>
      ) : (
        // Past slots of today are hidden on mobile (not shown dimmed, as the desktop grid does).
        groups
          .map((group) => ({ ...group, slots: group.slots.filter((s) => !isPastSlot(s)) }))
          .filter((group) => group.slots.length > 0)
          .map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <span className="pb-1 text-[10px] font-medium uppercase tracking-[0.3em] text-muted">{group.label}</span>
            {group.slots.map((slot) => {
              const selectable = isSlotSelectable(slot);
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => onSelectSlot(dayIndex, slot.id)}
                  className={cn(
                    "flex h-[52px] items-center justify-between rounded-md px-3.5 text-left",
                    isSelected && "border-[1.5px] border-white bg-white text-black",
                    !isSelected && selectable && [AVAILABLE_CELL_CLASS, "text-white"],
                    !isSelected && !selectable && [UNAVAILABLE_CELL_CLASS, "text-[#4a4a4a]"],
                  )}
                >
                  <span className="font-display text-[17px] font-extrabold">{formatSlotTime(slot.startsAt)}</span>
                  <span
                    className={cn(
                      "text-xs",
                      isSelected ? "text-black" : selectable ? "text-muted" : "text-[#4a4a4a]",
                    )}
                  >
                    {isSelected
                      ? "Elegido ✓"
                      : selectable
                        ? (coverageLabel(slot) ?? "Disponible")
                        : "No disponible"}
                  </span>
                </button>
              );
            })}
          </div>
        ))
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-3 border-t border-line bg-bg px-6 py-4 lg:hidden">
        <div className="mx-auto flex w-full max-w-[1160px] items-baseline justify-between gap-3">
          <span className={cn("font-display text-sm font-extrabold uppercase", selectedSlot ? "text-white" : "text-muted")}>
            {selectedSlot ? `${day.dow} ${day.dayNumber} ${day.month} · ${formatSlotTime(selectedSlot.startsAt)} · ${current.label}` : "Elegí un horario"}
          </span>
        </div>
        <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-3">
          <Button fullWidth disabled={!selectedSlot} onClick={onConfirmClick}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
