import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type {
  PaymentOrigin,
  PurchaseKind,
  PurchaseStatus,
  StaffPaymentDto,
  StaffPaymentPageDto,
} from "@/lib/api/types";

export interface StaffPaymentsFilter {
  status?: PurchaseStatus;
  kind?: PurchaseKind;
  origin?: PaymentOrigin;
  needsAttention?: boolean;
  clientId?: string;
  q?: string;
}

const PAYMENTS_PATH = "/api/v1/staff/payments";

export function listStaffPayments(
  filter: StaffPaymentsFilter,
  page: number,
  pageSize?: number,
): Promise<StaffPaymentPageDto> {
  const params = new URLSearchParams({ page: String(page) });
  if (pageSize) params.set("pageSize", String(pageSize));
  if (filter.status) params.set("status", filter.status);
  if (filter.kind) params.set("kind", filter.kind);
  if (filter.origin) params.set("origin", filter.origin);
  if (filter.needsAttention) params.set("needsAttention", "true");
  if (filter.clientId) params.set("clientId", filter.clientId);
  if (filter.q) params.set("q", filter.q);

  return apiFetchClient(`${PAYMENTS_PATH}?${params}`).then(
    parseJsonOrThrow<StaffPaymentPageDto>,
  );
}

/** Clears `needsAttention` once staff has manually handled whatever it flagged; never changes `status`. */
export function resolvePayment(purchaseId: string): Promise<StaffPaymentDto> {
  return apiFetchClient(`${PAYMENTS_PATH}/${encodeURIComponent(purchaseId)}/review`, {
    method: "POST",
  }).then(parseJsonOrThrow<StaffPaymentDto>);
}
