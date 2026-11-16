"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useErrorSnackbar } from "@/components/ui/snackbar";
import type { ServiceType } from "@/lib/api/types";

import { AutoDebitBlock } from "./auto-debit-block";
import { CheckoutTotal } from "./checkout-total";
import { startBookingCheckout, startPlanCheckout } from "./checkout-api";
import { bookingsHref } from "./checkout-routes";
import { AUTO_DEBIT_ACTIVE_CODE, isOfflineMode, PAYMENT_MODES, type PaymentMode } from "./constants";
import { PaymentModeField } from "./payment-mode";
import type { PaymentModeOption } from "./present-checkout";
import { useStartAutoDebit } from "./use-start-auto-debit";
import { useStartCheckout } from "./use-start-checkout";

const IDLE_LABEL = "Pagar con Mercado Pago";
const DEBIT_IDLE_LABEL = "Activar débito automático";
const BUSY_LABEL = "Te llevamos a Mercado Pago…";
const CONFIRM_LABEL = "Confirmar";
const CONFIRM_BUSY_LABEL = "Confirmando…";
const FOOTNOTE =
  "Vas a pagar en Mercado Pago. Tu compra se confirma cuando Mercado Pago nos avisa que el pago se acreditó.";
const DEBIT_FOOTNOTE =
  "Vas a autorizar el débito en Mercado Pago. Tu débito se activa cuando Mercado Pago nos avisa que lo autorizaste.";
const PICK_ANOTHER_SLOT_LABEL = "Elegir otro horario";
const SLOT_ERROR_CODES: readonly string[] = ["SLOT_FULL", "SLOT_NOT_BOOKABLE", "SLOT_NOT_FOUND", "ALREADY_BOOKED"];

// aria-hidden: decorative only, the accessible name is still just the button label.
function CtaArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

// The plan-checkout page's CTA styling: a taller button with an arrow that nudges
// on hover. Opt-in and kept local to the plan-checkout flow — BookingPayButton's
// rendering is unchanged.
function CtaButtonContent({ label }: { label: string }) {
  return (
    <>
      {label}
      <CtaArrowIcon className="transition-transform duration-300 ease-out group-hover:translate-x-[3px] group-hover:-translate-y-[3px]" />
    </>
  );
}

interface PayButtonProps {
  start: () => ReturnType<typeof startPlanCheckout>;
  service?: ServiceType;
  // Whether AUTO_DEBIT_ACTIVE means "manage it in your profile" (Performance) or is an error like any other.
  blocksOnActiveDebit?: boolean;
  emphasized?: boolean;
  // Cash or transfer: the client confirms the purchase here and pays at MOVE, nothing goes to Mercado Pago.
  isOffline?: boolean;
}

function PayButton({ start, service, blocksOnActiveDebit = false, emphasized = false, isOffline = false }: PayButtonProps) {
  const { isRedirecting, error, pay } = useStartCheckout(start, { byHand: isOffline });
  const offersAnotherSlot = service !== undefined && error?.code != null && SLOT_ERROR_CODES.includes(error.code);

  const isBlocked = blocksOnActiveDebit && error?.code === AUTO_DEBIT_ACTIVE_CODE;
  useErrorSnackbar(isBlocked ? null : error?.message);

  if (isBlocked) return <AutoDebitBlock />;

  const idleLabel = isOffline ? CONFIRM_LABEL : IDLE_LABEL;
  const busyLabel = isOffline ? CONFIRM_BUSY_LABEL : BUSY_LABEL;

  return (
    <div className="space-y-3">
      {offersAnotherSlot ? (
        <Link
          href={bookingsHref(service)}
          className={buttonVariants({ variant: "secondary", fullWidth: true, touchTarget: true })}
        >
          {PICK_ANOTHER_SLOT_LABEL}
        </Link>
      ) : null}
      <Button
        fullWidth
        touchTarget
        disabled={isRedirecting || offersAnotherSlot}
        onClick={pay}
        className={emphasized ? "group h-[52px] gap-3" : undefined}
      >
        {emphasized ? <CtaButtonContent label={isRedirecting ? busyLabel : idleLabel} /> : isRedirecting ? busyLabel : idleLabel}
      </Button>
      {isOffline ? null : (
        <p className={emphasized ? "text-xs leading-relaxed text-muted" : "text-xs text-muted"}>{FOOTNOTE}</p>
      )}
    </div>
  );
}

function AutoDebitPayButton({
  planId,
  blocksOnActiveDebit,
  emphasized = false,
}: {
  planId: string;
  blocksOnActiveDebit: boolean;
  emphasized?: boolean;
}) {
  const { start, isStarting, error, isBlocked } = useStartAutoDebit(planId);
  useErrorSnackbar(isBlocked && blocksOnActiveDebit ? null : error);

  if (isBlocked && blocksOnActiveDebit) return <AutoDebitBlock />;

  return (
    <div className="space-y-3">
      <Button
        fullWidth
        touchTarget
        disabled={isStarting}
        onClick={start}
        className={emphasized ? "group h-[52px] gap-3" : undefined}
      >
        {emphasized ? <CtaButtonContent label={isStarting ? BUSY_LABEL : DEBIT_IDLE_LABEL} /> : isStarting ? BUSY_LABEL : DEBIT_IDLE_LABEL}
      </Button>
      <p className={emphasized ? "text-xs leading-relaxed text-muted" : "text-xs text-muted"}>{DEBIT_FOOTNOTE}</p>
    </div>
  );
}

// Next keeps this route alive and reuses it for another slot, so a mode chosen before can be gone or disabled now
// (the client reached the cap meanwhile): that is not a choice anymore, and the single payment takes over.
function usableMode(paymentModes: PaymentModeOption[], mode: PaymentMode): PaymentMode {
  const option = paymentModes.find((candidate) => candidate.value === mode);
  return option !== undefined && option.disabledReason === null ? mode : PAYMENT_MODES.ONE_TIME;
}

// The options, the total that follows the chosen one, and whatever the pay button sits under.
function PaymentChoice({
  paymentModes,
  mode,
  onModeChange,
  price,
  notices,
  children,
}: {
  paymentModes: PaymentModeOption[];
  mode: PaymentMode;
  onModeChange: (mode: PaymentMode) => void;
  price: string;
  notices: ReactNode;
  children: ReactNode;
}) {
  const chosen = paymentModes.find((option) => option.value === mode);

  return (
    <div className="space-y-6">
      {paymentModes.length > 0 ? <PaymentModeField options={paymentModes} value={mode} onChange={onModeChange} /> : null}
      <CheckoutTotal price={price} offer={chosen?.priceLine ?? null} />
      {notices}
      {children}
    </div>
  );
}

export function PlanPayButton({
  planId,
  service,
  paymentModes,
  price,
}: {
  planId: string;
  service: ServiceType;
  paymentModes: PaymentModeOption[];
  price: string;
}) {
  const [chosenMode, setMode] = useState<PaymentMode>(PAYMENT_MODES.ONE_TIME);
  const mode = usableMode(paymentModes, chosenMode);
  // The block talks about Performance, so only a Performance plan can show it.
  const blocksOnActiveDebit = service === "performance";

  return (
    <PaymentChoice
      paymentModes={paymentModes}
      mode={mode}
      onModeChange={setMode}
      price={price}
      notices={null}
    >
      {mode === PAYMENT_MODES.AUTO_DEBIT ? (
        <AutoDebitPayButton planId={planId} blocksOnActiveDebit={blocksOnActiveDebit} emphasized />
      ) : (
        <PayButton
          start={() => (isOfflineMode(mode) ? startPlanCheckout(planId, mode) : startPlanCheckout(planId))}
          blocksOnActiveDebit={blocksOnActiveDebit}
          emphasized
          isOffline={isOfflineMode(mode)}
        />
      )}
    </PaymentChoice>
  );
}

export function BookingPayButton({
  planId,
  timeSlotId,
  service,
  paymentModes,
  price,
  holdNotice = null,
  emphasized = false,
}: {
  planId: string;
  timeSlotId: string;
  service: ServiceType;
  paymentModes: PaymentModeOption[];
  price: string;
  // The slot is held for a while only while the client pays with Mercado Pago.
  holdNotice?: string | null;
  emphasized?: boolean;
}) {
  const [chosenMode, setMode] = useState<PaymentMode>(PAYMENT_MODES.ONE_TIME);
  const mode = usableMode(paymentModes, chosenMode);
  const notices =
    mode === PAYMENT_MODES.ONE_TIME && holdNotice ? <Notice tone="warning">{holdNotice}</Notice> : null;

  // Keyed by slot: Next reuses this route (kept alive, hidden) when the client comes back
  // with another slot, and an error about the old slot must not carry over to the new one.
  return (
    <PaymentChoice
      key={timeSlotId}
      paymentModes={paymentModes}
      mode={mode}
      onModeChange={setMode}
      price={price}
      notices={notices}
    >
      <PayButton
        start={() =>
          isOfflineMode(mode)
            ? startBookingCheckout(planId, timeSlotId, mode)
            : startBookingCheckout(planId, timeSlotId)
        }
        service={service}
        emphasized={emphasized}
        isOffline={isOfflineMode(mode)}
      />
    </PaymentChoice>
  );
}
