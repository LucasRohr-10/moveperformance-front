import { type AuthActionResult, requestAuth } from "./auth-request";

const REQUEST_PASSWORD_RESET_PATH = "/api/auth/request-password-reset";

export const REQUEST_PASSWORD_RESET_ERRORS = {
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type RequestPasswordResetError =
  (typeof REQUEST_PASSWORD_RESET_ERRORS)[keyof typeof REQUEST_PASSWORD_RESET_ERRORS];

export type RequestPasswordResetResult =
  AuthActionResult<RequestPasswordResetError>;

export interface RequestPasswordResetInput {
  email: string;
  redirectTo: string;
}

// Better Auth always answers 200 with the same generic body, whether or not
// the email exists (no account enumeration). The only failure this wrapper
// can report is a genuine network/service failure.
function toRequestPasswordResetError(): RequestPasswordResetError {
  return REQUEST_PASSWORD_RESET_ERRORS.UNAVAILABLE;
}

export function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<RequestPasswordResetResult> {
  return requestAuth(
    REQUEST_PASSWORD_RESET_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    toRequestPasswordResetError,
    REQUEST_PASSWORD_RESET_ERRORS.UNAVAILABLE,
  );
}
