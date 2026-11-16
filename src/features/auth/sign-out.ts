import { type AuthActionResult, requestAuth } from "./auth-request";

const SIGN_OUT_PATH = "/api/auth/sign-out";

export const SIGN_OUT_ERRORS = {
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type SignOutError = (typeof SIGN_OUT_ERRORS)[keyof typeof SIGN_OUT_ERRORS];

export type SignOutResult = AuthActionResult<SignOutError>;

export function signOut(): Promise<SignOutResult> {
  return requestAuth(
    SIGN_OUT_PATH,
    { method: "POST" },
    () => SIGN_OUT_ERRORS.UNAVAILABLE,
    SIGN_OUT_ERRORS.UNAVAILABLE,
  );
}
