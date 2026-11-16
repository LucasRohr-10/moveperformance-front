import { apiFetchClient, parseJsonOrThrow, throwIfError } from "@/lib/api/client";
import type { AnnouncementDto, StaffAnnouncementsDto } from "@/lib/api/types";

const ANNOUNCEMENTS_PATH = "/api/v1/staff/announcements";
const JSON_HEADERS = { "Content-Type": "application/json" };

export function listStaffAnnouncements(): Promise<StaffAnnouncementsDto> {
  return apiFetchClient(ANNOUNCEMENTS_PATH).then(parseJsonOrThrow<StaffAnnouncementsDto>);
}

export function publishAnnouncement(input: { body: string; visibleUntil: string }): Promise<AnnouncementDto> {
  return apiFetchClient(ANNOUNCEMENTS_PATH, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  }).then(parseJsonOrThrow<AnnouncementDto>);
}

export function editAnnouncement(
  id: string,
  patch: { body?: string; visibleUntil?: string },
): Promise<AnnouncementDto> {
  return apiFetchClient(`${ANNOUNCEMENTS_PATH}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  }).then(parseJsonOrThrow<AnnouncementDto>);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const response = await apiFetchClient(`${ANNOUNCEMENTS_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" });
  await throwIfError(response);
}
