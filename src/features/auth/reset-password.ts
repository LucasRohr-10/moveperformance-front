import { type AuthActionResult, requestAuth } from "./auth-request";

const RESET_PASSWORD_PATH = "/api/auth/reset-password";

export const RESET_PASSWORD_ERRORS = {
  INVALID_TOKEN: "INVALID_TOKEN",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type ResetPasswordError =
  (typeof RESET_PASSWORD_ERRORS)[keyof typeof RESET_PASSWORD_ERRORS];

export type ResetPasswordResult = AuthActionResult<ResetPasswordError>;

export interface ResetPasswordInput {
  newPassword: string;
  token: string;
}

async function toResetPasswordError(
  response: Response,
): Promise<ResetPasswordError> {
  if (response.status === 400) {
    try {
      const body = (await response.json()) as { code?: string };
      if (body.code === "INVALID_TOKEN") {
        return RESET_PASSWORD_ERRORS.INVALID_TOKEN;
      }
      if (body.code === "PASSWORD_TOO_SHORT" || body.code === "PASSWORD_TOO_LONG") {
        return RESET_PASSWORD_ERRORS.PASSWORD_TOO_SHORT;
      }
    } catch {
      // not a JSON body we recognize — falls through to UNAVAILABLE below
    }
  }
  return RESET_PASSWORD_ERRORS.UNAVAILABLE;
}

export function resetPassword(
  input: ResetPasswordInput,
): Promise<ResetPasswordResult> {
  return requestAuth(
    RESET_PASSWORD_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    toResetPasswordError,
    RESET_PASSWORD_ERRORS.UNAVAILABLE,
  );
}
