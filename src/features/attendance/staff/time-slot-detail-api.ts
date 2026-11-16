import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { DailySlot } from "@/lib/api/types";

// Server Components only: forwards the request's cookies, unlike attendance-api's
// client-side calls. Used by the [slotId] page to title itself with this slot's
// time, service and professional instead of a generic "Asistencia del turno".
export function getTimeSlotDetail(id: string): Promise<DailySlot> {
  return apiFetchServer(`/api/v1/staff/time-slots/${id}`).then(parseJsonOrThrow<DailySlot>);
}

// Server Components only: fetch the day's slots for navigation purposes.
export function listDailySlots(date: string): Promise<DailySlot[]> {
  return apiFetchServer(`/api/v1/staff/time-slots?date=${date}`).then(
    parseJsonOrThrow<DailySlot[]>,
  );
}
