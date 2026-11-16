import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { BookableSlot } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { BookingCartContent, confirmLabel } from "./booking-cart-content";
import type { BookingCart } from "./use-booking-cart";

export interface BookingCartCardProps {
  cart: BookingCart;
  onConfirm: () => void;
  className?: string;
  renderSlotExtra?: (slot: BookableSlot) => ReactNode;
}

// The desktop cart, next to the grid; the mobile sheet shows the same content.
export function BookingCartCard({ cart, onConfirm, className, renderSlotExtra }: BookingCartCardProps) {
  const blockingNotice = cart.policy.blockingNotice(cart);

  return (
    <div className={cn("flex flex-col gap-5 rounded border border-line bg-card p-6", className)}>
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted">{cart.policy.title}</span>
      {cart.count === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted">Elegí uno o más horarios de la grilla.</p>
      ) : (
        <BookingCartContent cart={cart} renderSlotExtra={renderSlotExtra} />
      )}
      {blockingNotice ? <Notice tone="warning">{blockingNotice}</Notice> : null}
      <Button fullWidth disabled={cart.count === 0 || cart.submitting || cart.hasBlockingIssue} onClick={onConfirm}>
        {cart.submitting ? "Reservando…" : confirmLabel(cart)}
      </Button>
    </div>
  );
}
