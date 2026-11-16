import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { MySubscriptionsDto } from "@/lib/api/types";

// Server-side only: apiFetchServer forwards the client's session cookies.
export async function getMySubscriptions(): Promise<MySubscriptionsDto> {
  const response = await apiFetchServer("/api/v1/me/subscriptions");
  return parseJsonOrThrow<MySubscriptionsDto>(response);
}
