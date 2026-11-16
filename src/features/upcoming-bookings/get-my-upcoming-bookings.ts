import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { BookingResponse } from "@/lib/api/types";

// Server-side only: apiFetchServer forwards the client's session cookies.
// The API already answers confirmed and pending-payment bookings that have not started, oldest first.
export async function getMyUpcomingBookings(): Promise<BookingResponse[]> {
  const response = await apiFetchServer("/api/v1/me/bookings?scope=upcoming");
  return parseJsonOrThrow<BookingResponse[]>(response);
}
