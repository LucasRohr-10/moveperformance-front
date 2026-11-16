import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import {
  type CheckoutResponseDto,
  type OfflineOptionsDto,
  PAYMENT_METHODS,
  type PaymentMethod,
  type PurchaseStatusDto,
  type SimulateOutcome,
  type SimulatePaymentResponseDto,
} from "@/lib/api/types";

import { PAYMENT_MODES, type CheckoutPaymentMode } from "./constants";

const JSON_HEADERS = { "Content-Type": "application/json" };

function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiFetchClient(path, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  }).then(parseJsonOrThrow<T>);
}

const PAYMENT_METHODS_BY_MODE: Record<CheckoutPaymentMode, PaymentMethod> = {
  [PAYMENT_MODES.ONE_TIME]: PAYMENT_METHODS.MERCADO_PAGO,
  [PAYMENT_MODES.CASH]: PAYMENT_METHODS.CASH,
  [PAYMENT_MODES.TRANSFER]: PAYMENT_METHODS.TRANSFER,
};

// Without a mode the body is what it always was: the API then charges with Mercado Pago.
const methodField = (mode: CheckoutPaymentMode | undefined) =>
  mode === undefined ? {} : { paymentMethod: PAYMENT_METHODS_BY_MODE[mode] };

export function startPlanCheckout(planId: string, method?: CheckoutPaymentMode): Promise<CheckoutResponseDto> {
  return postJson("/api/v1/checkout/plan", { planId, ...methodField(method) });
}

export function startBookingCheckout(
  planId: string,
  timeSlotId: string,
  method?: CheckoutPaymentMode,
): Promise<CheckoutResponseDto> {
  return postJson("/api/v1/checkout/booking", { planId, timeSlotId, ...methodField(method) });
}

export function fetchOfflineOptions(): Promise<OfflineOptionsDto> {
  return apiFetchClient("/api/v1/checkout/offline-options").then(parseJsonOrThrow<OfflineOptionsDto>);
}

export function getPurchaseStatus(externalReference: string): Promise<PurchaseStatusDto> {
  return apiFetchClient(`/api/v1/checkout/purchases/${encodeURIComponent(externalReference)}`).then(
    parseJsonOrThrow<PurchaseStatusDto>,
  );
}

export function simulatePayment(
  externalReference: string,
  outcome: SimulateOutcome,
): Promise<SimulatePaymentResponseDto> {
  return postJson("/api/v1/payments/dev/simulate", { externalReference, outcome });
}
