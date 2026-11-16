import { type AuthActionResult, requestAuth } from "./auth-request";

const SEND_VERIFICATION_EMAIL_PATH = "/api/auth/send-verification-email";

export const SEND_VERIFICATION_EMAIL_ERRORS = {
  COOLDOWN: "COOLDOWN",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type SendVerificationEmailError =
  (typeof SEND_VERIFICATION_EMAIL_ERRORS)[keyof typeof SEND_VERIFICATION_EMAIL_ERRORS];

export type SendVerificationEmailResult =
  AuthActionResult<SendVerificationEmailError>;

export interface SendVerificationEmailInput {
  email: string;
  callbackURL: string;
}

// The API allows one email per minute per address and answers 429 before
// that. Otherwise it answers 200 whether or not the account exists (no
// account enumeration), so there is no "unknown email" error to map.
function toSendVerificationEmailError(
  response: Response,
): SendVerificationEmailError {
  if (response.status === 429) return SEND_VERIFICATION_EMAIL_ERRORS.COOLDOWN;
  return SEND_VERIFICATION_EMAIL_ERRORS.UNAVAILABLE;
}

export function sendVerificationEmail(
  input: SendVerificationEmailInput,
): Promise<SendVerificationEmailResult> {
  return requestAuth(
    SEND_VERIFICATION_EMAIL_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    toSendVerificationEmailError,
    SEND_VERIFICATION_EMAIL_ERRORS.UNAVAILABLE,
  );
}
