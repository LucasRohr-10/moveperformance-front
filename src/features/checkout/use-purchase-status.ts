import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import type { PurchaseStatusDto } from "@/lib/api/types";

import { getPurchaseStatus } from "./checkout-api";
import { isPurchaseByHand } from "./present-purchase-result";

export const POLL_INTERVAL_MS = 3000;
export const MAX_POLL_ATTEMPTS = 20;

export type PurchaseStatusState =
  | { phase: "loading" }
  | { phase: "not-found" }
  | { phase: "error" }
  | { phase: "loaded"; purchase: PurchaseStatusDto; timedOut: boolean };

type StatusAnswer = { ok: true; purchase: PurchaseStatusDto } | { ok: false; error: unknown };

const LOADING: PurchaseStatusState = { phase: "loading" };

function requestStatus(externalReference: string): Promise<StatusAnswer> {
  return getPurchaseStatus(externalReference).then(
    (purchase) => ({ ok: true, purchase }),
    (error: unknown) => ({ ok: false, error }),
  );
}

function isPurchaseNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.body.code === "PURCHASE_NOT_FOUND";
}

/**
 * Reads the purchase while the API says `pending` (D10). Every answer, success or error,
 * counts as one attempt, so persistent errors also end the polling. The next request is
 * scheduled after the previous one finished, so requests never overlap.
 */
export function usePurchaseStatus(externalReference: string): {
  state: PurchaseStatusState;
  recheck: () => void;
} {
  const [state, setState] = useState<PurchaseStatusState>(LOADING);
  const [stateReference, setStateReference] = useState(externalReference);
  const [round, setRound] = useState(0);
  // An error after data keeps the last known purchase, also across rechecks, but never across references.
  const lastPurchaseRef = useRef<{ reference: string; purchase: PurchaseStatusDto } | null>(null);

  if (stateReference !== externalReference) {
    setStateReference(externalReference);
    setState(LOADING);
  }

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function poll(): Promise<void> {
      const answer = await requestStatus(externalReference);
      if (!active) return;

      attempts += 1;
      if (answer.ok) lastPurchaseRef.current = { reference: externalReference, purchase: answer.purchase };
      const purchase =
        lastPurchaseRef.current?.reference === externalReference ? lastPurchaseRef.current.purchase : null;
      if (purchase === null) {
        setState({ phase: !answer.ok && isPurchaseNotFound(answer.error) ? "not-found" : "error" });
        return;
      }

      // Cash or transfer pending is final for the client: it waits for staff, not for a provider.
      // A rejected last payment is final for this screen: the purchase stays pending so the client can try
      // another card, but nothing is left to wait for.
      const isPending =
        purchase.status === "pending" && !isPurchaseByHand(purchase) && purchase.paymentStatus !== "rejected";
      const timedOut = isPending && attempts >= MAX_POLL_ATTEMPTS;
      setState({ phase: "loaded", purchase, timedOut });
      if (isPending && !timedOut) timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    }

    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [externalReference, round]);

  const recheck = useCallback(() => {
    setState((current) => (current.phase === "loaded" ? { ...current, timedOut: false } : LOADING));
    setRound((value) => value + 1);
  }, []);

  return { state, recheck };
}
