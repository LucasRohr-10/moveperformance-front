import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { ActivitySummaryDto } from "@/lib/api/types";

// Server-side only: apiFetchServer forwards the client's session cookies.
export async function getMyActivitySummary(): Promise<ActivitySummaryDto> {
  const response = await apiFetchServer("/api/v1/me/activity-summary");
  return parseJsonOrThrow<ActivitySummaryDto>(response);
}
