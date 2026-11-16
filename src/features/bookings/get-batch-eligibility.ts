import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { SlotEligibilityDto } from "@/lib/api/types";

/** Non-mutating: previews whether the current plan/pack would cover each requested slot
 *  right now, in the given order (must match the order sent to `createBookings`). */
export async function getBatchEligibility(timeSlotIds: string[]): Promise<SlotEligibilityDto[]> {
  const response = await apiFetchClient("/api/v1/bookings/batch-eligibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeSlotIds }),
  });
  return parseJsonOrThrow<SlotEligibilityDto[]>(response);
}
