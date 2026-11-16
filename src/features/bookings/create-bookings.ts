import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { BookingsBatchDto } from "@/lib/api/types";

export async function createBookings(timeSlotIds: string[]): Promise<BookingsBatchDto> {
  const response = await apiFetchClient("/api/v1/bookings/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeSlotIds }),
  });
  return parseJsonOrThrow<BookingsBatchDto>(response);
}
