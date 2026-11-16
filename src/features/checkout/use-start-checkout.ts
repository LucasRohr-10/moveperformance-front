"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { attachPurchaseToPendingSlotIntent } from "@/features/bookings/pending-slot-intent";
import { ApiError } from "@/lib/api/errors";
import type { CheckoutResponseDto } from "@/lib/api/types";

import { resultHref } from "./checkout-routes";
import { redirectToPayment } from "./redirect-to-payment";

const FALLBACK_ERROR_MESSAGE = "No pudimos iniciar el pago. Probá de nuevo en unos minutos.";
// The code the API client gives an error whose body was not JSON (a proxy page, a timeout).
const NON_JSON_ERROR_CODE = "UNKNOWN";
// Refusals that depend on what the screen offered: the options are read again so it shows what the API says now.
const REFRESH_ON_ERROR_CODES: readonly string[] = ["UNPAID_LIMIT_REACHED", "TRANSFER_DISABLED"];
const IDLE: StartCheckoutState = { isRedirecting: false, error: null };
const SECURE_PROTOCOL = "https:";
// Plain http is accepted only on loopback, where the simulator lives in local development.
const LOOPBACK_PROTOCOL = "http:";
const LOOPBACK_HOSTS: readonly string[] = ["localhost", "127.0.0.1"];

export interface StartCheckoutState {
  isRedirecting: boolean;
  error: { code: string | null; message: string } | null;
}

function isPaymentUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const { protocol, hostname } = new URL(value);
    if (protocol === SECURE_PROTOCOL) return true;
    return protocol === LOOPBACK_PROTOCOL && LOOPBACK_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

function toStartError(error: unknown): NonNullable<StartCheckoutState["error"]> {
  if (!(error instanceof ApiError)) return { code: null, message: FALLBACK_ERROR_MESSAGE };

  const { code, message } = error.body;
  const hasUsableMessage = code !== NON_JSON_ERROR_CODE && Boolean(message);
  return { code, message: hasUsableMessage ? message : FALLBACK_ERROR_MESSAGE };
}

export function useStartCheckout(
  start: () => Promise<Pick<CheckoutResponseDto, "redirectUrl" | "externalReference">>,
  // Cash or transfer: the API answers with no payment URL because there is no provider to go to.
  { byHand = false }: { byHand?: boolean } = {},
): StartCheckoutState & { pay: () => void } {
  const router = useRouter();
  const [state, setState] = useState<StartCheckoutState>(IDLE);
  // A ref, not state: two clicks in the same tick both see the same render's state.
  const isStartedRef = useRef(false);

  // Set once a purchase by hand was made: the screen it left behind shows what was true before buying.
  const needsRefreshRef = useRef(false);

  // Next keeps this screen alive, hidden, behind the result page. When it is hidden the purchase is done, so
  // coming back with Back finds the button ready again instead of stuck on "Confirmando…"; and the options and the
  // cap are read again, because a second Confirmar on the old ones would buy a second time over a stale cap.
  useEffect(() => {
    if (needsRefreshRef.current) {
      needsRefreshRef.current = false;
      router.refresh();
    }
    return () => {
      isStartedRef.current = false;
      setState(IDLE);
    };
    // The router never changes in the app; the effect has to run only when the screen is shown, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = useCallback(() => {
    if (isStartedRef.current) return;
    isStartedRef.current = true;
    setState({ isRedirecting: true, error: null });

    start()
      .then(({ redirectUrl, externalReference }) => {
        // Cash and transfer have no provider: the purchase is made, and its result page says what to do next.
        const isByHand = byHand && redirectUrl === null;
        if (!isByHand && !isPaymentUrl(redirectUrl)) throw new Error("The API sent no usable payment URL");
        // Ties any selection saved on the way here to the purchase it is waiting on, so
        // the result page only settles the paid slot against its own purchase.
        if (externalReference) attachPurchaseToPendingSlotIntent(externalReference);
        if (redirectUrl === null) {
          needsRefreshRef.current = true;
          router.push(resultHref(externalReference));
        } else {
          redirectToPayment(redirectUrl);
        }
      })
      .catch((error: unknown) => {
        isStartedRef.current = false;
        const startError = toStartError(error);
        setState({ isRedirecting: false, error: startError });
        if (startError.code !== null && REFRESH_ON_ERROR_CODES.includes(startError.code)) router.refresh();
      });
  }, [start, router, byHand]);

  return { ...state, pay };
}
