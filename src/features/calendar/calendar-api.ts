import { apiFetchClient, parseJsonOrThrow, throwIfError } from "@/lib/api/client";
import type { CalendarOption, CalendarStatus, ProfessionalCalendarStatus } from "@/lib/api/types";

// All functions here run client-side, triggered by panel interactions, so they
// use the browser fetch wrapper (session cookie travels via
// `credentials: "include"`). `getCalendarStatus` (server-side, forwards
// cookies via `next/headers`) lives in its own file, get-calendar-status.ts,
// so this file stays safe to import from a "use client" component.

export function listCalendarOptions(professionalId: string): Promise<CalendarOption[]> {
  return apiFetchClient(`/api/v1/staff/calendar/${professionalId}/calendars`).then(
    parseJsonOrThrow<CalendarOption[]>,
  );
}

export function connectCalendar(professionalId: string): Promise<{ authUrl: string }> {
  return apiFetchClient(`/api/v1/staff/calendar/${professionalId}/connect`, {
    method: "POST",
  }).then(parseJsonOrThrow<{ authUrl: string }>);
}

export function selectCalendar(
  professionalId: string,
  calendarId: string,
): Promise<ProfessionalCalendarStatus> {
  return apiFetchClient(`/api/v1/staff/calendar/${professionalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarId }),
  }).then(parseJsonOrThrow<ProfessionalCalendarStatus>);
}

export function syncCalendarNow(professionalId: string): Promise<CalendarStatus> {
  return apiFetchClient(`/api/v1/staff/calendar/${professionalId}/sync`, {
    method: "POST",
  }).then(parseJsonOrThrow<CalendarStatus>);
}

export function disconnectCalendar(professionalId: string): Promise<void> {
  return apiFetchClient(`/api/v1/staff/calendar/${professionalId}`, {
    method: "DELETE",
  }).then(throwIfError);
}

// v4 — the only manual path to release blocks; never called automatically.
export function releaseBlocks(professionalId: string): Promise<void> {
  return apiFetchClient(`/api/v1/staff/calendar/${professionalId}/release-blocks`, {
    method: "POST",
  }).then(throwIfError);
}
