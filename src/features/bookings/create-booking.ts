import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { BookingResponse } from "@/lib/api/types";

export async function createBooking(timeSlotId: string): Promise<BookingResponse> {
  const response = await apiFetchClient("/api/v1/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeSlotId }),
  });
  return parseJsonOrThrow<BookingResponse>(response);
}
