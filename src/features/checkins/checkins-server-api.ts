import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { PendingCheckinDto } from "@/lib/api/types";

// Server-side only: apiFetchServer forwards the client's session cookies.
export async function getPendingCheckin(): Promise<PendingCheckinDto> {
  const response = await apiFetchServer("/api/v1/me/checkins/pending");
  return parseJsonOrThrow<PendingCheckinDto>(response);
}
