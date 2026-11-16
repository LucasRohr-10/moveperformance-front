import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type {
  AttendanceStatus,
  CancelBookingResultDto,
  DailySlot,
  RosterItem,
} from "@/lib/api/types";

export function listDailySlots(date: string): Promise<DailySlot[]> {
  return apiFetchClient(`/api/v1/staff/time-slots?date=${date}`).then(
    parseJsonOrThrow<DailySlot[]>,
  );
}

export function getRoster(timeSlotId: string): Promise<RosterItem[]> {
  return apiFetchClient(`/api/v1/staff/time-slots/${timeSlotId}/roster`).then(
    parseJsonOrThrow<RosterItem[]>,
  );
}

export function markAttendance(
  bookingId: string,
  status: AttendanceStatus,
): Promise<RosterItem> {
  return apiFetchClient(`/api/v1/staff/bookings/${bookingId}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).then(parseJsonOrThrow<RosterItem>);
}

/** Staff cancels one booking; the reason reaches the client. The backend answers what happened to what they paid. */
export function cancelBooking(bookingId: string, reason: string): Promise<CancelBookingResultDto> {
  return apiFetchClient(`/api/v1/staff/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  }).then(parseJsonOrThrow<CancelBookingResultDto>);
}
