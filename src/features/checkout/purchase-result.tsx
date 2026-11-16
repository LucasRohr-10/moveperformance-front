"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/config/constants/routes.constants";
import {
  type PendingSlotIntentState,
  readPendingSlotIntentState,
  settlePaidSlotIntent,
} from "@/features/bookings/pending-slot-intent";
import type { PurchaseStatus, PurchaseStatusDto } from "@/lib/api/types";

import { fetchOfflineOptions } from "./checkout-api";
import { CheckoutMessageCard } from "./checkout-message-card";
import { isPurchaseByHand, type PendingSelection, presentPurchaseResult } from "./present-purchase-result";
import { CONSULTING_PAYMENT_MESSAGE, PurchaseResultView } from "./purchase-result-view";
import { type PurchaseStatusState, usePurchaseStatus } from "./use-purchase-status";

// The presenter has copy only for these; anything else the API sends falls back to the error card.
const KNOWN_STATUSES: Record<PurchaseStatus, true> = {
  pending: true,
  approved: true,
  rejected: true,
  cancelled: true,
  expired: true,
  waived: true,
};

function isKnownStatus(status: string): boolean {
  return Object.hasOwn(KNOWN_STATUSES, status);
}

function NotFoundCard(): React.JSX.Element {
  return (
    <CheckoutMessageCard
      title="No encontramos la operación"
      body="Revisá el link o contactá a MOVE."
      action={{ label: "Ir a mi perfil", href: ROUTES.DASHBOARD }}
    />
  );
}

function LoadingCard(): React.JSX.Element {
  return (
    <Card aria-busy="true">
      <p className="text-sm text-muted">{CONSULTING_PAYMENT_MESSAGE}</p>
    </Card>
  );
}

function ReadErrorCard({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <CheckoutMessageCard
      title="No pudimos consultar tu pago."
      body="Probá de nuevo en unos minutos."
      action={null}
      isAlert
    >
      <Button type="button" variant="secondary" onClick={onRetry} touchTarget className="mt-6">
        Reintentar
      </Button>
    </CheckoutMessageCard>
  );
}

// The cap is a staff setting that the purchase does not carry: a plan bought by hand reads it to say how many
// things can be left unpaid. Without it the screen simply leaves that sentence out.
function useUnpaidLimit(purchase: PurchaseStatusDto): number | null {
  const needsLimit = purchase.kind === "plan" && purchase.status === "pending" && isPurchaseByHand(purchase);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => {
    if (!needsLimit) return;
    let isActive = true;
    fetchOfflineOptions().then(
      (options) => {
        if (isActive) setLimit(options.unpaid.limit);
      },
      () => undefined,
    );
    return () => {
      isActive = false;
    };
  }, [needsLimit]);

  return limit;
}

function LoadedResult({
  purchase,
  timedOut,
  providerSaysRejected,
  selection,
  recheck,
}: {
  purchase: PurchaseStatusDto;
  timedOut: boolean;
  providerSaysRejected: boolean;
  selection: PendingSlotIntentState;
  recheck: () => void;
}): React.JSX.Element {
  const unpaidLimit = useUnpaidLimit(purchase);
  if (!isKnownStatus(purchase.status)) return <ReadErrorCard onRetry={recheck} />;

  const model = presentPurchaseResult({
    purchase,
    unpaidLimit,
    timedOut,
    providerSaysRejected,
    pendingSelection: toPendingSelection(selection),
    selectionExpired: selection.status === "expired",
  });
  return <PurchaseResultView model={model} onRecheck={recheck} />;
}

// A selection with nothing left in it (the paid slot was its only member) is nothing to
// resume — the purchase already settled it.
function toPendingSelection(state: PendingSlotIntentState): PendingSelection | null {
  if (state.status !== "ready" || state.intent.slots.length === 0) return null;
  return { surface: state.intent.surface, service: state.intent.slots[0].service };
}

/**
 * The pick the user left behind, read once on arrival. A booking purchase the API reports
 * as approved is a confirmed reservation, so its slot leaves the selection here — and only
 * here: while the payment is pending or rejected the slot stays, so it is never lost.
 */
function usePendingSelection(externalReference: string, state: PurchaseStatusState): PendingSlotIntentState {
  const [selection, setSelection] = useState<PendingSlotIntentState>(() => readPendingSlotIntentState());
  // A booking bought by hand is confirmed at once, even while its payment is still to be made at MOVE.
  const isConfirmedBooking =
    state.phase === "loaded" &&
    state.purchase.kind === "booking" &&
    (state.purchase.status === "approved" || (state.purchase.status === "pending" && isPurchaseByHand(state.purchase)));
  const [settledFor, setSettledFor] = useState<string | null>(null);

  // Settling is idempotent, so running it once per externalReference — computed during
  // render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // — is safe even if this render is discarded or replayed.
  if (isConfirmedBooking && settledFor !== externalReference) {
    setSettledFor(externalReference);
    settlePaidSlotIntent(externalReference);
    setSelection(readPendingSlotIntentState());
  }

  return selection;
}

function PurchaseStatusContent({
  externalReference,
  providerSaysRejected,
}: {
  externalReference: string;
  providerSaysRejected: boolean;
}): React.JSX.Element {
  const { state, recheck } = usePurchaseStatus(externalReference);
  // Read before the early returns below: hooks cannot sit behind a condition.
  const selection = usePendingSelection(externalReference, state);

  if (state.phase === "loading") return <LoadingCard />;
  if (state.phase === "not-found") return <NotFoundCard />;
  if (state.phase === "error") return <ReadErrorCard onRetry={recheck} />;
  return (
    <LoadedResult
      purchase={state.purchase}
      timedOut={state.timedOut}
      providerSaysRejected={providerSaysRejected}
      selection={selection}
      recheck={recheck}
    />
  );
}

/** The live region exists from the first render, so screen readers announce the change from pending to approved. */
export function PurchaseResult({
  externalReference,
  providerSaysRejected,
}: {
  externalReference: string | null;
  providerSaysRejected: boolean;
}): React.JSX.Element {
  return (
    <div role="status" aria-live="polite">
      {externalReference ? (
        <PurchaseStatusContent externalReference={externalReference} providerSaysRejected={providerSaysRejected} />
      ) : (
        <NotFoundCard />
      )}
    </div>
  );
}
