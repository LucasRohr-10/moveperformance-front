import { parseJsonOrThrow } from "@/lib/api/client";
import { apiFetchServer } from "@/lib/api/server";
import type { MyAttendancePageDto } from "@/lib/api/types";

// Server-side only: apiFetchServer forwards the client's session cookies.
// The API answers the client's own past sessions, newest first, 20 per page.
export async function getMyAttendance(page: number): Promise<MyAttendancePageDto> {
  const response = await apiFetchServer(`/api/v1/me/attendance-history?${new URLSearchParams({ page: String(page) })}`);
  return parseJsonOrThrow<MyAttendancePageDto>(response);
}
