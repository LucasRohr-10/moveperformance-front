import { env } from "@/config/env";
import { ApiError, type ApiErrorBody } from "@/lib/api/errors";

// The backend always answers errors with a JSON body, but infra in front of it
// (a proxy, a timeout) can return a non-JSON body instead; fall back rather than
// letting a parse error hide the real failure.
async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return { statusCode: response.status, code: "UNKNOWN", message: response.statusText || "Request failed" };
  }
}

// Shared by any fetch wrapper (server-side today, browser-side later) that
// needs to turn a Response into either decoded JSON or a thrown ApiError.
export async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(await parseErrorBody(response));
  return (await response.json()) as T;
}

// For endpoints whose success response has no body (e.g. 204 on delete).
export async function throwIfError(response: Response): Promise<void> {
  if (!response.ok) throw new ApiError(await parseErrorBody(response));
}

/** Browser-side fetch: full API URL + the session cookie. Server Components use apiFetchServer instead. */
export function apiFetchClient(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(path, env.NEXT_PUBLIC_API_URL).toString();
  return fetch(url, { ...init, credentials: "include" });
}
