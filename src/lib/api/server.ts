import { cookies } from "next/headers";

import { env } from "@/config/env";

// Thin fetch wrapper for Server Components: builds the full API URL and
// forwards the current request's cookies, the same way getCurrentUser did
// before this file existed.
export async function apiFetchServer(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const cookieStore = await cookies();
  const url = new URL(path, env.NEXT_PUBLIC_API_URL).toString();

  return fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...init?.headers,
      Cookie: cookieStore.toString(),
    },
  });
}
