import { redirect } from "next/navigation";

import type { TodaySummaryDto } from "@/lib/api/types";

// Shared by the Hoy tests. A busy day: everything pending.
export const SUMMARY: TodaySummaryDto = {
  bookingsToday: { bookings: 14, slots: 6 },
  attendanceUnmarked: { bookings: 6, slots: 2 },
  paymentsToReview: { purchases: 2 },
  expiringSoon: { clients: 4, endingTomorrow: 1, windowDays: 10 },
  overdueCharges: { charges: 3, total: 4500, withoutAmount: 1 },
  clientsAtRisk: { clients: 23, urgent: 7 },
};

// A day with nothing to do.
export const EMPTY_SUMMARY: TodaySummaryDto = {
  bookingsToday: { bookings: 0, slots: 0 },
  attendanceUnmarked: { bookings: 0, slots: 0 },
  paymentsToReview: { purchases: 0 },
  expiringSoon: { clients: 0, endingTomorrow: 0, windowDays: 10 },
  overdueCharges: { charges: 0, total: 0, withoutAmount: 0 },
  clientsAtRisk: { clients: 0, urgent: 0 },
};

/** The error `redirect()` throws: one of the Next errors that a loader must let through instead of swallowing. */
export function nextRedirectError(): unknown {
  try {
    redirect("/login");
  } catch (error) {
    return error;
  }
  throw new Error("redirect() did not throw");
}
