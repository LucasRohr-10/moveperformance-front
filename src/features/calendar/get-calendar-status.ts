import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { CalendarStatus } from "@/lib/api/types";

// Server-side only: it forwards the staff member's cookies (same pattern as
// features/settings/get-settings.ts). Used to render the initial panel state
// from the staff settings page. Kept in its own file, separate from
// calendar-api.ts, so a "use client" importer (CalendarConnectionPanel) never
// pulls `next/headers` (via apiFetchServer) into the client bundle.
export async function getCalendarStatus(): Promise<CalendarStatus> {
  const response = await apiFetchServer("/api/v1/staff/calendar");
  return parseJsonOrThrow<CalendarStatus>(response);
}
