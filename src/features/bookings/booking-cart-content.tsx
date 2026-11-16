import Link from "next/link";
import type { ReactNode } from "react";

import { TrashIcon } from "@/components/ui/trash-icon";
import type { BookableSlot } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { cartItemLabel, groupByDay, rehabPayNote, shortDateLabel, slotTimeRange, turnsCount } from "./booking-cart";
import { BOOKING_ERROR_ACTIONS, REASON_SPOKEN_BY_ITS_ACTION } from "./booking-error-actions";
import type { CoverageTone } from "./cart-policy";
import { savePendingSlotIntent } from "./pending-slot-intent";
import type { BookingCart, ServiceCartGroup } from "./use-booking-cart";

// The approved mockup: covered is the app's success colour, charged outside its warning one.
const COVERAGE_TONE_CLASS: Record<CoverageTone, string> = {
  neutral: "text-[#8a8a8a]",
  ok: "text-success",
  offline: "text-warning",
};

// A service the policy keeps out of the batch is paid on its own, after the others.
function paysSeparately(cart: BookingCart, group: ServiceCartGroup): boolean {
  return !cart.policy.inBatch(group.service);
}

export function confirmLabel(cart: BookingCart): string {
  const onlyCheckout = cart.groups.length === 1 && paysSeparately(cart, cart.groups[0]);
  return onlyCheckout ? "Ir a pagar" : "Confirmar reservas";
}

export interface BookingCartContentProps {
  cart: BookingCart;
  /** A spot under each slot, for whatever the surface needs to ask about it. */
  renderSlotExtra?: (slot: BookableSlot) => ReactNode;
}

/** The picked slots, one card per service and grouped by day; shared by the desktop card and the mobile sheet. */
export function BookingCartContent({ cart, renderSlotExtra }: BookingCartContentProps) {
  const otherLabels = cart.groups.filter((g) => !paysSeparately(cart, g)).map((g) => g.label);

  return (
    <div className="flex flex-col gap-2.5">
      {cart.groups.map((group) => (
        <ServiceCard
          key={group.service}
          group={group}
          cart={cart}
          payNote={payNoteFor(cart, group, otherLabels)}
          renderSlotExtra={renderSlotExtra}
        />
      ))}
    </div>
  );
}

function payNoteFor(cart: BookingCart, group: ServiceCartGroup, otherLabels: string[]): string | null {
  return paysSeparately(cart, group) && otherLabels.length > 0 ? rehabPayNote(otherLabels) : null;
}

function ServiceCard({
  group,
  cart,
  payNote,
  renderSlotExtra,
}: {
  group: ServiceCartGroup;
  cart: BookingCart;
  payNote: string | null;
  renderSlotExtra?: (slot: BookableSlot) => ReactNode;
}) {
  return (
    <section aria-label={group.label} className="flex flex-col gap-2.5 rounded-lg border border-line bg-card p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-sm font-black uppercase">{group.label}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
          {turnsCount(group.slots.length)}
        </span>
      </div>

      {groupByDay(group.slots).map((day) => (
        <div key={day.date} className="flex items-stretch gap-2.5">
          <div className="flex w-[42px] shrink-0 flex-col items-center justify-center rounded-md border border-line bg-soft py-1.5">
            <span className="text-[8px] tracking-[0.2em] text-muted">{day.weekday}</span>
            <span className="font-display text-base font-black leading-tight">{day.dayNumber}</span>
          </div>
          <ul className="flex flex-1 flex-col justify-center gap-1">
            {day.slots.map((slot) => (
              <CartSlotItem key={slot.id} slot={slot} cart={cart} extra={renderSlotExtra?.(slot)} />
            ))}
          </ul>
        </div>
      ))}

      {group.canRepeat ? <RepeatToggle group={group} cart={cart} /> : null}

      {payNote ? (
        <p className="border-t border-line pt-2.5 text-[11px] leading-relaxed text-[#8a8a8a]">{payNote}</p>
      ) : null}
    </section>
  );
}

function CartSlotItem({ slot, cart, extra }: { slot: BookableSlot; cart: BookingCart; extra: ReactNode }) {
  const { policy } = cart;
  const eligibility = cart.eligibilityFor(slot.id);
  const blocked = policy.showsPayLinks && eligibility?.covered === false;
  const action = blocked && eligibility.reason ? BOOKING_ERROR_ACTIONS[eligibility.reason]?.(slot) : null;
  const coverage = policy.coverage(slot, eligibility);
  // Either action navigates away and loses the rest of the cart (component state) too —
  // remember every batch slot, not just this one, so the whole pick can be restored.
  // The slot being paid stays in the list: it only leaves once the API confirms its
  // booking, so a pending or rejected payment does not lose it either.
  const onLeaveToPay =
    action && policy.restoresSavedPick
      ? () =>
          savePendingSlotIntent({
            surface: "bookings",
            userId: cart.userId,
            payingSlotId: eligibility?.reason === REASON_SPOKEN_BY_ITS_ACTION ? slot.id : null,
            slots: cart.groups
              .filter((g) => policy.inBatch(g.service))
              .flatMap((g) => g.slots)
              .map((s) => ({ slotId: s.id, service: s.service, startsAt: s.startsAt })),
          })
      : undefined;

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 font-display text-sm font-extrabold">
        <span className="flex min-w-0 items-center gap-2">
          {/* Marks which item is holding the confirm button back. */}
          {blocked ? <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[#e3262f]" /> : null}
          <span className="truncate">{slotTimeRange(slot)}</span>
        </span>
        <button
          type="button"
          onClick={() => cart.removeSlot(slot)}
          aria-label={`Quitar ${cartItemLabel(slot)}`}
          className="grid size-8 place-items-center rounded text-muted hover:text-danger active:text-danger"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      {coverage ? (
        <span className={cn("text-[11px] leading-snug", COVERAGE_TONE_CLASS[coverage.tone])}>{coverage.text}</span>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          onClick={onLeaveToPay}
          className="w-fit text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e3262f] underline-offset-4 hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
      {extra}
    </li>
  );
}

function RepeatToggle({ group, cart }: { group: ServiceCartGroup; cart: BookingCart }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold">Repetir cada semana</span>
          {group.repeatUntil ? (
            <span className="text-[11px] text-muted">Hasta el {shortDateLabel(group.repeatUntil)}</span>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={group.isRepeating}
          aria-label="Repetir cada semana"
          onClick={() => void cart.setRepeating(group.service, !group.isRepeating)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full border border-line transition-colors",
            group.isRepeating ? "bg-success" : "bg-soft",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 block h-4.5 w-4.5 rounded-full bg-white transition-all",
              group.isRepeating ? "left-[22px]" : "left-0.5",
            )}
          />
        </button>
      </div>
      {group.phrase ? <p className="text-[12px] leading-relaxed text-muted">{group.phrase}</p> : null}
    </div>
  );
}

/** Screen-reader-only note on a service tab that already has picked slots. */
export function PickedMark() {
  return <span className="sr-only"> con turnos elegidos</span>;
}
