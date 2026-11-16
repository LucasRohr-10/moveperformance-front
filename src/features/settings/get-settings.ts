import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { StaffSettingsDto } from "@/lib/api/types";

// Server-side only: it forwards the staff member's cookies.
export async function getSettings(): Promise<StaffSettingsDto> {
  const response = await apiFetchServer("/api/v1/staff/settings");
  return parseJsonOrThrow<StaffSettingsDto>(response);
}
