import type { BookingResponse } from "@/lib/api/types";

import { toUpcomingRows, type UpcomingBookingRow } from "./present-upcoming-bookings";

export const TODAY = "2026-10-23";

export function booking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: "b1",
    timeSlotId: "s1",
    service: "recovery",
    startsAt: "2026-10-24T13:30:00Z",
    endsAt: "2026-10-24T14:15:00Z",
    durationMinutes: 45,
    label: "Sesión Recovery · 45 min",
    status: "confirmed",
    source: "plan",
    canCancel: true,
    cancelledAt: null,
    ...overrides,
  };
}

export function rowOf(overrides: Partial<BookingResponse> = {}): UpcomingBookingRow {
  return toUpcomingRows([booking(overrides)], TODAY)[0];
}
