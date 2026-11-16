import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { AutoDebitDto } from "@/lib/api/types";

// Server-side only: apiFetchServer forwards the client's session cookies.
export async function getMyAutoDebits(): Promise<AutoDebitDto[]> {
  const response = await apiFetchServer("/api/v1/me/auto-debits");
  return parseJsonOrThrow<AutoDebitDto[]>(response);
}
