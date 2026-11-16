import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { MySubscriptionsDto } from "@/lib/api/types";

// Browser-side counterpart of get-my-subscriptions.ts (server-only): used where a client
// component needs the current user's plan/pack status after the page already rendered
// (e.g. right after signing in inline, with no full page reload).
export async function getMySubscriptionsClient(): Promise<MySubscriptionsDto> {
  const response = await apiFetchClient("/api/v1/me/subscriptions");
  return parseJsonOrThrow<MySubscriptionsDto>(response);
}
