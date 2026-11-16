import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { DayDraftDto, DayEditorDto, DayImpactDto } from "@/lib/api/types";

const DAYS_PATH = "/api/v1/staff/days";
const JSON_HEADERS = { "Content-Type": "application/json" };

export function getDayEditor(from: string, to?: string): Promise<DayEditorDto> {
  const params = new URLSearchParams({ from });
  if (to) params.set("to", to);
  return apiFetchClient(`${DAYS_PATH}?${params}`).then(parseJsonOrThrow<DayEditorDto>);
}

/** Writes nothing: tells what the draft would cancel, create and change. */
export function previewDay(draft: DayDraftDto): Promise<DayImpactDto> {
  return apiFetchClient(`${DAYS_PATH}/preview`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(draft),
  }).then(parseJsonOrThrow<DayImpactDto>);
}

/** `expectedAffectedBookings` is what the preview said; the backend answers DAY_EDIT_STALE if it moved. */
export function applyDay(draft: DayDraftDto, expectedAffectedBookings: number): Promise<DayImpactDto> {
  return apiFetchClient(`${DAYS_PATH}/apply`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ ...draft, expectedAffectedBookings }),
  }).then(parseJsonOrThrow<DayImpactDto>);
}
