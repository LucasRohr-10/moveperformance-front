import { env } from "@/config/env";

export type AuthActionResult<TError> =
  | { ok: true }
  | { ok: false; error: TError };

export async function requestAuth<TError>(
  path: string,
  init: RequestInit,
  toError: (response: Response) => TError | Promise<TError>,
  unavailable: TError,
): Promise<AuthActionResult<TError>> {
  const url = new URL(path, env.NEXT_PUBLIC_API_URL).toString();

  let response: Response;
  try {
    response = await fetch(url, { ...init, credentials: "include" });
  } catch {
    return { ok: false, error: unavailable };
  }

  if (response.ok) return { ok: true };
  return { ok: false, error: await toError(response) };
}
