import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { AutoDebitCheckoutDto, AutoDebitDto, SimulatedDebitAction } from "@/lib/api/types";

const AUTO_DEBITS_PATH = "/api/v1/me/auto-debits";
const JSON_HEADERS = { "Content-Type": "application/json" };

function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiFetchClient(path, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  }).then(parseJsonOrThrow<T>);
}

export function startAutoDebit(planId: string): Promise<AutoDebitCheckoutDto> {
  return postJson(AUTO_DEBITS_PATH, { planId });
}

export function getAutoDebitStatus(externalReference: string): Promise<AutoDebitDto> {
  return apiFetchClient(`${AUTO_DEBITS_PATH}/${encodeURIComponent(externalReference)}`).then(
    parseJsonOrThrow<AutoDebitDto>,
  );
}

export function listMyAutoDebits(): Promise<AutoDebitDto[]> {
  return apiFetchClient(AUTO_DEBITS_PATH).then(parseJsonOrThrow<AutoDebitDto[]>);
}

export function cancelAutoDebit(id: string): Promise<AutoDebitDto> {
  return apiFetchClient(`${AUTO_DEBITS_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" }).then(
    parseJsonOrThrow<AutoDebitDto>,
  );
}

export function simulateAutoDebit(externalReference: string, action: SimulatedDebitAction): Promise<AutoDebitDto> {
  return postJson("/api/v1/payments/dev/simulate-auto-debit", { externalReference, action });
}
