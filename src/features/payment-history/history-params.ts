import { ROUTES } from "@/config/constants/routes.constants";
// By path: the staff payments feature's index also exports its client panel.
import { isPaymentOrigin, parsePage } from "@/features/payments/staff/staff-payments-labels";
import type { PaymentOrigin } from "@/lib/api/types";

export type HistoryTab = "asistencia" | "pagos";

// The payments tab is the only one named in the URL: Asistencia is the bare /history.
export const PAYMENTS_TAB_PARAM = "pagos";

export interface HistoryParams {
  tab: HistoryTab;
  origin: PaymentOrigin | undefined;
  page: number;
}

// The URL is the client's to edit: an unknown tab or origin, or a page that is not a positive integer, is ignored.
export function parseHistoryParams(params: { tab?: string; origin?: string; page?: string }): HistoryParams {
  return {
    tab: params.tab === PAYMENTS_TAB_PARAM ? "pagos" : "asistencia",
    origin: isPaymentOrigin(params.origin) ? params.origin : undefined,
    page: parsePage(params.page),
  };
}

// Every link names the payments tab, or it would land on Asistencia. The first page is the bare URL,
// so a filter or a way back never carries a page number it does not need.
export function historyHref(origin: PaymentOrigin | undefined, page: number): string {
  const params = new URLSearchParams({ tab: PAYMENTS_TAB_PARAM });
  if (origin) params.set("origin", origin);
  if (page > 1) params.set("page", String(page));
  return `${ROUTES.HISTORY}?${params}`;
}
