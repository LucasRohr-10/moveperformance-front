import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { ReceiptLinkDto } from "@/lib/api/types";

/** The client's own receipt: a short-lived signed link, open it right away and never keep it. */
export async function getMyReceiptLink(purchaseId: string): Promise<ReceiptLinkDto> {
  const response = await apiFetchClient(`/api/v1/me/payments/${encodeURIComponent(purchaseId)}/receipt`);
  return parseJsonOrThrow<ReceiptLinkDto>(response);
}
