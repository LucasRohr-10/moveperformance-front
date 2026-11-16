"use client";

import { type PointerEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { BookableSlot } from "@/lib/api/types";

import { turnsCount } from "./booking-cart";
import { BookingCartContent, confirmLabel } from "./booking-cart-content";
import type { BookingCart } from "./use-booking-cart";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// How far a finger has to travel to open or close the sheet.
const SWIPE_PX = 40;

export interface BookingCartTrayProps {
  cart: BookingCart;
  onConfirm: () => void;
  renderSlotExtra?: (slot: BookableSlot) => ReactNode;
}

/** Mobile only: the cart floats at the bottom as a small card and opens into a sheet. */
export function BookingCartTray({ cart, onConfirm, renderSlotExtra }: BookingCartTrayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const swipeStartY = useRef<number | null>(null);

  // Emptied with the sheet open: next time the card shows up, it shows up closed.
  if (cart.count === 0 && isOpen) setIsOpen(false);
  if (cart.count === 0) return null;

  function close() {
    if (cart.submitting) return;
    setIsOpen(false);
    openerRef.current?.focus();
  }

  // `touch-none` on the swipe areas keeps the browser from turning the drag into a page
  // scroll (which would cancel the pointer); capture keeps the pointer ours until it is lifted.
  // Only for fingers: capturing a mouse would send its click to the container instead of the buttons.
  function startSwipe(event: PointerEvent) {
    swipeStartY.current = event.clientY;
    if (event.pointerType === "touch") event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function cancelSwipe() {
    swipeStartY.current = null;
  }

  // Positive when the finger went down.
  function endSwipe(event: PointerEvent): number {
    const start = swipeStartY.current;
    swipeStartY.current = null;
    return start === null ? 0 : event.clientY - start;
  }

  return (
    <>
      <div
        onPointerDown={startSwipe}
        onPointerUp={(event) => {
          if (endSwipe(event) < -SWIPE_PX) setIsOpen(true);
        }}
        onPointerCancel={cancelSwipe}
        className="fixed inset-x-2.5 bottom-3 z-40 touch-none rounded-xl border border-line bg-raised px-3 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_14px_34px_rgba(0,0,0,.85)] lg:hidden"
      >
        <span aria-hidden="true" className="mx-auto mb-2.5 block h-1 w-9 rounded-full bg-line-strong" />
        <div className="flex items-center gap-3">
          <button
            ref={openerRef}
            type="button"
            aria-label="Ver tu reserva"
            onClick={() => setIsOpen(true)}
            className="min-w-0 flex-1 text-left"
          >
            <ul className="flex flex-col gap-1">
              {cart.groups.map((group) => (
                <li key={group.service} className="flex items-center gap-2">
                  <span className="min-w-[54px] font-display text-[13px] font-extrabold">
                    {turnsCount(group.slots.length)}
                  </span>
                  <span className="truncate text-[10px] uppercase tracking-[0.12em] text-muted">{group.label}</span>
                  {cart.policy.inBatch(group.service) ? null : <PaysLaterMark />}
                </li>
              ))}
            </ul>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cart.submitting || cart.hasBlockingIssue}
            className="h-[42px] shrink-0 rounded-md bg-white px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-black disabled:opacity-50"
          >
            {cart.submitting ? "Reservando…" : "Confirmar"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <CartSheet
          cart={cart}
          onConfirm={onConfirm}
          renderSlotExtra={renderSlotExtra}
          onClose={close}
          onHandlePointerDown={startSwipe}
          onHandlePointerCancel={cancelSwipe}
          onHandlePointerUp={(event) => {
            if (endSwipe(event) > SWIPE_PX) close();
          }}
        />
      ) : null}
    </>
  );
}

function PaysLaterMark() {
  return (
    <span
      role="img"
      aria-label="Se paga al confirmar"
      className="grid size-4 shrink-0 place-items-center rounded-full bg-warning text-[10px] font-bold text-black"
    >
      <span aria-hidden="true">!</span>
    </span>
  );
}

function CartSheet({
  cart,
  onConfirm,
  renderSlotExtra,
  onClose,
  onHandlePointerDown,
  onHandlePointerUp,
  onHandlePointerCancel,
}: {
  cart: BookingCart;
  onConfirm: () => void;
  renderSlotExtra?: (slot: BookableSlot) => ReactNode;
  onClose: () => void;
  onHandlePointerDown: (event: PointerEvent) => void;
  onHandlePointerUp: (event: PointerEvent) => void;
  onHandlePointerCancel: () => void;
}) {
  const id = useId();
  const blockingNotice = cart.policy.blockingNotice(cart);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  // Same handling as ConfirmDialog: Escape closes, Tab cycles inside.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
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
  }, [onClose]);

  return (
    <>
      <div
        data-testid="booking-sheet-backdrop"
        aria-hidden="true"
        onPointerDown={onClose}
        className="fixed inset-0 z-50 bg-black/60 lg:hidden"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="fixed inset-x-0 bottom-0 z-50 flex h-[86dvh] flex-col rounded-t-2xl border-t border-line bg-soft motion-safe:animate-sheet-in lg:hidden"
      >
        <div
          data-swipe-handle
          onPointerDown={onHandlePointerDown}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
          className="touch-none border-b border-line px-4 pt-2 pb-3.5"
        >
          <span aria-hidden="true" className="mx-auto mb-2.5 block h-1 w-9 rounded-full bg-line-strong" />
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${id}-title`} className="font-display text-[17px] font-black uppercase">
              {cart.policy.title} · {turnsCount(cart.count)}
            </h2>
            <button
              data-autofocus
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="grid size-8 place-items-center text-base text-muted hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3.5 py-3">
          <BookingCartContent cart={cart} renderSlotExtra={renderSlotExtra} />
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          {blockingNotice ? <Notice tone="warning">{blockingNotice}</Notice> : null}
          <Button fullWidth disabled={cart.submitting || cart.hasBlockingIssue} onClick={onConfirm}>
            {cart.submitting ? "Reservando…" : confirmLabel(cart)}
          </Button>
        </div>
      </div>
    </>
  );
}
