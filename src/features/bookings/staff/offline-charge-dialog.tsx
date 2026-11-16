"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Notice } from "@/components/ui/notice";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PAYMENT_METHOD_LABELS } from "@/features/payments/staff/offline-charge-labels";
import type { BookableSlot, BookingPaymentChoice, RehabKind } from "@/lib/api/types";
import { formatExactPrice } from "@/lib/money";

import { offlinePriceFor, type OfflinePrices } from "./offline-price";
import { offlineSlotTitle } from "./staff-cart-copy";
import type { OfflineChargeDetails } from "./staff-booking-input";

const PAYMENT_CHOICES: BookingPaymentChoice[] = ["cash", "transfer", "undecided"];
const PAYMENT_OPTIONS = PAYMENT_CHOICES.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }));
const PAYMENT_LABEL = "¿Cómo va a pagar?";
const PREVIEW_FAILED_TEXT = "No pudimos ver qué cubre su plan. Si algún turno lo cubre, no se cobra.";
const PRICE_HELP = "Precio de Configuración.";
const NO_PRICE_HELP = "Sin precio en Configuración. El monto se carga al registrar el pago.";

export interface OfflineChargeDialogProps {
  /** Only the slots the plan does not cover. */
  slots: BookableSlot[];
  kindOf(slotId: string): RehabKind;
  prices: OfflinePrices;
  /** The preview of what the plan covers could not be read. */
  previewFailed: boolean;
  isBusy: boolean;
  onConfirm(details: OfflineChargeDetails): void;
  onCancel(): void;
}

function dialogTitle(count: number): string {
  return count === 1 ? "1 reserva se cobra por fuera" : `${count} reservas se cobran por fuera`;
}

/** Asks how the client will pay, and shows the fixed price Configuración gives each slot. */
export function OfflineChargeDialog({
  slots,
  kindOf,
  prices,
  previewFailed,
  isBusy,
  onConfirm,
  onCancel,
}: OfflineChargeDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentChoice>("undecided");

  return (
    <ConfirmDialog
      title={dialogTitle(slots.length)}
      description="Al cliente le llega el mail de reserva confirmada igual."
      confirmLabel={isBusy ? "Reservando…" : "Reservar"}
      cancelLabel="Volver"
      isBusy={isBusy}
      onConfirm={() => onConfirm({ paymentMethod })}
      onCancel={onCancel}
    >
      <div className="mt-4 flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted">{PAYMENT_LABEL}</span>
        <SegmentedControl
          aria-label={PAYMENT_LABEL}
          options={PAYMENT_OPTIONS}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
      </div>
      <ul className="mt-2 flex flex-col">
        {slots.map((slot) => (
          <OfflineSlotRow key={slot.id} slot={slot} kindOf={kindOf} prices={prices} />
        ))}
      </ul>
      {previewFailed ? (
        <Notice tone="warning" className="mt-4">
          {PREVIEW_FAILED_TEXT}
        </Notice>
      ) : null}
    </ConfirmDialog>
  );
}

function OfflineSlotRow({
  slot,
  kindOf,
  prices,
}: {
  slot: BookableSlot;
  kindOf(slotId: string): RehabKind;
  prices: OfflinePrices;
}) {
  const rehabKind = slot.service === "rehab" ? kindOf(slot.id) : null;
  const price = offlinePriceFor(prices, slot.service, rehabKind);

  return (
    <li className="mt-2.5 rounded border border-line px-3 py-2.5">
      <p className="text-[13px] font-semibold">{offlineSlotTitle(slot, rehabKind)}</p>
      {price === null ? (
        <p className="mt-1 text-[11px] leading-snug text-muted">{NO_PRICE_HELP}</p>
      ) : (
        <>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted">Monto</span>
            <span className="text-lg font-bold">{formatExactPrice(price)}</span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted">{PRICE_HELP}</p>
        </>
      )}
    </li>
  );
}
