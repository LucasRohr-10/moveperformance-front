import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { MyPaymentPageDto, PaymentOrigin } from "@/lib/api/types";

// Server-side only: apiFetchServer forwards the client's session cookies.
// The API answers the client's own purchases, newest first, 20 per page.
export async function getMyPayments(
  origin: PaymentOrigin | undefined,
  page: number,
): Promise<MyPaymentPageDto> {
  const params = new URLSearchParams({ page: String(page) });
  if (origin) params.set("origin", origin);
  const response = await apiFetchServer(`/api/v1/me/payments?${params}`);
  return parseJsonOrThrow<MyPaymentPageDto>(response);
}
