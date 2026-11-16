import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { CancelBookingResponse } from "@/lib/api/types";

export async function cancelBooking(id: string): Promise<CancelBookingResponse> {
  const response = await apiFetchClient(`/api/v1/bookings/${id}/cancel`, { method: "POST" });
  return parseJsonOrThrow<CancelBookingResponse>(response);
}
