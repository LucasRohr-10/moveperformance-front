import { env } from "@/config/env";

const SOCIAL_SIGN_IN_PATH = "/api/auth/sign-in/social";

export const GOOGLE_SIGN_IN_ERRORS = {
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type GoogleSignInError =
  (typeof GOOGLE_SIGN_IN_ERRORS)[keyof typeof GOOGLE_SIGN_IN_ERRORS];

export type GoogleSignInResult =
  | { ok: true; url: string }
  | { ok: false; error: GoogleSignInError };

export interface GoogleSignInUrls {
  // Where the API sends the browser after a successful Google login.
  callbackURL: string;
  // Where it sends the browser, with ?error=<code>, when the login fails.
  errorCallbackURL: string;
}

const UNAVAILABLE_RESULT: GoogleSignInResult = {
  ok: false,
  error: GOOGLE_SIGN_IN_ERRORS.UNAVAILABLE,
};

// Unlike the other auth calls this one needs the response body: the API
// answers with the Google URL the browser has to go to. credentials: "include"
// lets the browser keep the cookie the API uses to check Google's answer.
export async function signInWithGoogle(
  urls: GoogleSignInUrls,
): Promise<GoogleSignInResult> {
  const url = new URL(SOCIAL_SIGN_IN_PATH, env.NEXT_PUBLIC_API_URL).toString();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ provider: "google", ...urls }),
    });
    if (!response.ok) return UNAVAILABLE_RESULT;

    const body = (await response.json()) as { url?: unknown };
    if (typeof body.url !== "string") return UNAVAILABLE_RESULT;
    return { ok: true, url: body.url };
  } catch {
    return UNAVAILABLE_RESULT;
  }
}
