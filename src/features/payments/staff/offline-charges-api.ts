import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type {
  OfflineChargeDetailDto,
  OfflineChargeListDto,
  OfflinePaymentMethod,
  ReceiptLinkDto,
  ReceiptUploadDto,
} from "@/lib/api/types";


const BASE_PATH = "/api/v1/staff/offline-charges";

export interface RecordOfflinePaymentInput {
  method: OfflinePaymentMethod;
  amount: number;
  /** YYYY-MM-DD business date, not in the future. */
  paidOn: string;
  note: string | null;
  receipt: File | null;
}

export interface OpenOfflineChargesFilter {
  clientId?: string;
  bookingIds?: string[];
  /** Only the charges of a slot that already started on an earlier day. */
  overdue?: boolean;
  /** Only the charges of a slot on today's date (Montevideo). */
  today?: boolean;
}

// Nothing was asked, so nothing says what the limit is: whoever asks for no bookings does not read it.
const EMPTY_LIST: OfflineChargeListDto = { items: [], total: 0, limitPerClient: 0 };

/** The charges still to collect, already in the order the backend wants them shown. */
export async function listOpenOfflineCharges(filter: OpenOfflineChargesFilter): Promise<OfflineChargeListDto> {
  if (filter.bookingIds?.length === 0) return EMPTY_LIST;
  const params = new URLSearchParams();
  if (filter.clientId) params.set("clientId", filter.clientId);
  if (filter.bookingIds) params.set("bookingIds", filter.bookingIds.join(","));
  if (filter.overdue) params.set("overdue", "true");
  if (filter.today) params.set("today", "true");
  const query = params.toString();
  const response = await apiFetchClient(query ? `${BASE_PATH}?${query}` : BASE_PATH);
  return parseJsonOrThrow<OfflineChargeListDto>(response);
}

export async function getReceiptUpload(): Promise<ReceiptUploadDto> {
  const response = await apiFetchClient(`${BASE_PATH}/receipt-upload`);
  return parseJsonOrThrow<ReceiptUploadDto>(response);
}

function paymentBody(input: RecordOfflinePaymentInput): { body: string | FormData; headers?: HeadersInit } {
  const { receipt, note } = input;
  if (!receipt) {
    const json = { method: input.method, amount: input.amount, paidOn: input.paidOn, ...(note ? { note } : {}) };
    return { body: JSON.stringify(json), headers: { "Content-Type": "application/json" } };
  }
  // No Content-Type on purpose: the browser adds the multipart one with its boundary.
  const form = new FormData();
  form.append("method", input.method);
  form.append("amount", String(input.amount));
  form.append("paidOn", input.paidOn);
  if (note) form.append("note", note);
  form.append("receipt", receipt);
  return { body: form };
}

export async function recordOfflinePayment(
  chargeId: string,
  input: RecordOfflinePaymentInput,
): Promise<OfflineChargeDetailDto> {
  const { body, headers } = paymentBody(input);
  const response = await apiFetchClient(`${BASE_PATH}/${encodeURIComponent(chargeId)}/payment`, {
    method: "POST",
    ...(headers ? { headers } : {}),
    body,
  });
  return parseJsonOrThrow<OfflineChargeDetailDto>(response);
}

/** A short-lived signed link: open it right away, never keep it. */
export async function getStaffReceiptLink(chargeId: string, paymentId: string): Promise<ReceiptLinkDto> {
  const response = await apiFetchClient(
    `${BASE_PATH}/${encodeURIComponent(chargeId)}/payments/${encodeURIComponent(paymentId)}/receipt`,
  );
  return parseJsonOrThrow<ReceiptLinkDto>(response);
}

export async function getOfflineCharge(id: string): Promise<OfflineChargeDetailDto> {
  const response = await apiFetchClient(`${BASE_PATH}/${encodeURIComponent(id)}`);
  return parseJsonOrThrow<OfflineChargeDetailDto>(response);
}

async function postReason(path: string, reason: string): Promise<OfflineChargeDetailDto> {
  const response = await apiFetchClient(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return parseJsonOrThrow<OfflineChargeDetailDto>(response);
}

export function waiveOfflineCharge(id: string, reason: string): Promise<OfflineChargeDetailDto> {
  return postReason(`${BASE_PATH}/${encodeURIComponent(id)}/waive`, reason);
}
