import { type AuthActionResult, requestAuth } from "./auth-request";
import { INVALID_PROFILE_INPUT_CODE } from "./constants";

const SIGN_UP_PATH = "/api/auth/sign-up/email";

export const SIGN_UP_ERRORS = {
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  INVALID_PROFILE: "INVALID_PROFILE",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type SignUpError = (typeof SIGN_UP_ERRORS)[keyof typeof SIGN_UP_ERRORS];

export type SignUpResult = AuthActionResult<SignUpError>;

export interface SignUpCredentials {
  // First name only; the last name goes apart.
  name: string;
  lastName: string;
  // YYYY-MM-DD.
  birthDate: string;
  email: string;
  // E.164, e.g. "+59899123456".
  phone: string;
  password: string;
  // Where the confirmation link sends the user back to (a page of this site).
  callbackURL: string;
}

// A duplicate email answers 200 like a fresh sign-up (no account enumeration) —
// there is no "email taken" error to map here anymore.
async function toSignUpError(response: Response): Promise<SignUpError> {
  if (response.status === 400) {
    try {
      const body = (await response.json()) as { code?: string };
      if (body.code === "PASSWORD_TOO_SHORT") {
        return SIGN_UP_ERRORS.PASSWORD_TOO_SHORT;
      }
      if (body.code === INVALID_PROFILE_INPUT_CODE) {
        return SIGN_UP_ERRORS.INVALID_PROFILE;
      }
    } catch {
      // not a JSON body we recognize — falls through to UNAVAILABLE below
    }
  }
  return SIGN_UP_ERRORS.UNAVAILABLE;
}

export function signUpWithEmail(
  credentials: SignUpCredentials,
): Promise<SignUpResult> {
  // Sign-up no longer logs the user in: email confirmation is required first.
  return requestAuth(
    SIGN_UP_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    },
    toSignUpError,
    SIGN_UP_ERRORS.UNAVAILABLE,
  );
}
