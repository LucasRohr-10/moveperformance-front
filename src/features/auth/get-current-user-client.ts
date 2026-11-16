import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { AuthenticatedUser } from "@/lib/api/types";

// Client-side counterpart to lib/session's getCurrentUser (server-only):
// needed right after an inline sign-in/sign-up, before the next navigation
// would otherwise re-run the server-side session check.
export async function getCurrentUserClient(): Promise<AuthenticatedUser | null> {
  const response = await apiFetchClient("/api/v1/users/me");
  if (response.status === 401) return null;
  return parseJsonOrThrow<AuthenticatedUser>(response);
}
