import type { MyPaymentPageDto } from "@/lib/api/types";

import { failure, type FakeResponse, UNAUTHENTICATED_RESPONSE } from "./fake-checkout";
import { E2E_PAYMENTS } from "./payment-history-fixtures";
import { type PaymentHistoryScenario } from "./scenarios";

const PAYMENTS_PATH = "/api/v1/me/payments";
const PAGE_SIZE = 20;
const ORIGINS: readonly string[] = ["one_time", "auto_debit"];

export const PAYMENT_HISTORY_SCENARIOS: readonly string[] = [
  "payments",
  "payments-empty",
] satisfies PaymentHistoryScenario[];

const VALIDATION_FAILED = failure(400, "VALIDATION_FAILED", "Los datos enviados no son válidos.");

// The history the API answers: the fixtures for `payments`, nothing for any other signed-in scenario.
export function createPaymentHistoryStore() {
  return {
    async handle(method: string, url: URL, scenario: string | null): Promise<FakeResponse | null> {
      if (method !== "GET" || url.pathname !== PAYMENTS_PATH) return null;
      if (!scenario) return UNAUTHENTICATED_RESPONSE;

      const origin = url.searchParams.get("origin");
      const page = Number(url.searchParams.get("page") ?? 1);
      if ((origin !== null && !ORIGINS.includes(origin)) || !Number.isInteger(page) || page < 1) {
        return VALIDATION_FAILED;
      }

      const all = scenario === "payments" ? E2E_PAYMENTS : [];
      const matching = origin === null ? all : all.filter((payment) => payment.origin === origin);
      const body: MyPaymentPageDto = {
        items: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        total: matching.length,
        page,
        pageSize: PAGE_SIZE,
      };
      return { status: 200, body };
    },
  };
}
