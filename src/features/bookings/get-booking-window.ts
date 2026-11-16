import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { BookingWindowDto } from "@/lib/api/types";

export async function getBookingWindow(): Promise<BookingWindowDto> {
  const response = await apiFetchClient("/api/v1/bookings/window");
  return parseJsonOrThrow<BookingWindowDto>(response);
}
