import { ACCOUNT_DEACTIVATED_CODE } from "@/lib/api/errors";

import { type AuthActionResult, requestAuth } from "./auth-request";

const SIGN_IN_PATH = "/api/auth/sign-in/email";

export const SIGN_IN_ERRORS = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type SignInError = (typeof SIGN_IN_ERRORS)[keyof typeof SIGN_IN_ERRORS];

export type SignInResult = AuthActionResult<SignInError>;

export interface SignInCredentials {
  email: string;
  password: string;
}

// Better Auth answers 403 both for an unconfirmed email and for a deactivated
// account; only the `code` in the body tells them apart.
async function toForbiddenSignInError(response: Response): Promise<SignInError> {
  try {
    const body: unknown = await response.json();
    const code = typeof body === "object" && body !== null && "code" in body ? body.code : null;
    if (code === ACCOUNT_DEACTIVATED_CODE) return SIGN_IN_ERRORS.ACCOUNT_DEACTIVATED;
  } catch {
    // Not JSON: treated as before.
  }
  return SIGN_IN_ERRORS.EMAIL_NOT_VERIFIED;
}

async function toSignInError(response: Response): Promise<SignInError> {
  if (response.status === 401) return SIGN_IN_ERRORS.INVALID_CREDENTIALS;
  if (response.status === 429) return SIGN_IN_ERRORS.TOO_MANY_ATTEMPTS;
  if (response.status === 403) return toForbiddenSignInError(response);
  return SIGN_IN_ERRORS.UNAVAILABLE;
}

export function signInWithEmail(
  credentials: SignInCredentials,
): Promise<SignInResult> {
  // credentials: "include" (added by requestAuth) lets the browser store the
  // API's session cookie.
  return requestAuth(
    SIGN_IN_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    },
    toSignInError,
    SIGN_IN_ERRORS.UNAVAILABLE,
  );
}
