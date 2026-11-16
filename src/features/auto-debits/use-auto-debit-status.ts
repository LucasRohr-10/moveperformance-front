import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { AUTO_DEBIT_STATUSES, type AutoDebitDto } from "@/lib/api/types";

import { getAutoDebitStatus } from "./auto-debits-api";
import type { AutoDebitResultState } from "./present-auto-debit-result";

export const POLL_INTERVAL_MS = 3000;
export const MAX_POLL_ATTEMPTS = 20;

type StatusAnswer = { ok: true; debit: AutoDebitDto } | { ok: false; error: unknown };

const LOADING: AutoDebitResultState = { kind: "loading" };

function requestStatus(externalReference: string): Promise<StatusAnswer> {
  return getAutoDebitStatus(externalReference).then(
    (debit) => ({ ok: true, debit }),
    (error: unknown) => ({ ok: false, error }),
  );
}

function isDebitNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.body.code === "AUTO_DEBIT_NOT_FOUND";
}

/**
 * Reads the debit while the API says `pending`, as usePurchaseStatus does for a payment.
 * Every answer, success or error, counts as one attempt, so persistent errors also end the
 * polling. The next request is scheduled after the previous one finished, so they never overlap.
 */
export function useAutoDebitStatus(externalReference: string): {
  state: AutoDebitResultState;
  recheck: () => void;
} {
  const [state, setState] = useState<AutoDebitResultState>(LOADING);
  const [stateReference, setStateReference] = useState(externalReference);
  const [round, setRound] = useState(0);
  // An error after data keeps the last known debit, also across rechecks, but never across references.
  const lastDebitRef = useRef<{ reference: string; debit: AutoDebitDto } | null>(null);

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
      if (answer.ok) lastDebitRef.current = { reference: externalReference, debit: answer.debit };
      const debit = lastDebitRef.current?.reference === externalReference ? lastDebitRef.current.debit : null;
      if (debit === null) {
        setState({ kind: !answer.ok && isDebitNotFound(answer.error) ? "not-found" : "error" });
        return;
      }

      const isPending = debit.status === AUTO_DEBIT_STATUSES.PENDING;
      const timedOut = isPending && attempts >= MAX_POLL_ATTEMPTS;
      setState({ kind: "loaded", debit, timedOut });
      if (isPending && !timedOut) timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    }

    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [externalReference, round]);

  const recheck = useCallback(() => {
    setState((current) => (current.kind === "loaded" ? { ...current, timedOut: false } : LOADING));
    setRound((value) => value + 1);
  }, []);

  return { state, recheck };
}
