"use client";

import { useCallback } from "react";

import { startAutoDebit } from "@/features/auto-debits";

import { AUTO_DEBIT_ACTIVE_CODE } from "./constants";
import { useStartCheckout } from "./use-start-checkout";

export interface StartAutoDebitState {
  start: () => void;
  isStarting: boolean;
  error: string | null;
  // The API says the client already has an authorized debit (another tab, or an old page).
  isBlocked: boolean;
}

// The same guard against double clicks and the same payment-link check as a one-time payment.
export function useStartAutoDebit(planId: string): StartAutoDebitState {
  const startDebit = useCallback(() => startAutoDebit(planId), [planId]);
  const { isRedirecting, error, pay } = useStartCheckout(startDebit);

  return {
    start: pay,
    isStarting: isRedirecting,
    error: error?.message ?? null,
    isBlocked: error?.code === AUTO_DEBIT_ACTIVE_CODE,
  };
}
