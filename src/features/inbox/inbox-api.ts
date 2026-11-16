import { apiFetchClient, parseJsonOrThrow, throwIfError } from "@/lib/api/client";
import type { InboxDto, UnreadCountDto } from "@/lib/api/types";

const INBOX_PATH = "/api/v1/me/inbox";

export function getUnreadCount(): Promise<number> {
  return apiFetchClient(`${INBOX_PATH}/unread-count`)
    .then(parseJsonOrThrow<UnreadCountDto>)
    .then((dto) => dto.unreadCount);
}

export function listInbox(): Promise<InboxDto> {
  return apiFetchClient(INBOX_PATH).then(parseJsonOrThrow<InboxDto>);
}

export function markInboxItemRead(id: string): Promise<void> {
  return apiFetchClient(`${INBOX_PATH}/${encodeURIComponent(id)}/read`, { method: "POST" }).then(
    throwIfError,
  );
}
