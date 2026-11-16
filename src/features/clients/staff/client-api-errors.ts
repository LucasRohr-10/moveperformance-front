import { ApiError } from "@/lib/api/errors";

export const CLIENT_ERROR_CODES = {
  EMAIL_TAKEN: "CLIENT_EMAIL_TAKEN",
  EMAIL_UNCONFIRMED: "CLIENT_EMAIL_UNCONFIRMED",
  ALREADY_DEACTIVATED: "CLIENT_ALREADY_DEACTIVATED",
  NOT_DEACTIVATED: "CLIENT_NOT_DEACTIVATED",
  PAYMENT_PROVIDER_ERROR: "PAYMENT_PROVIDER_ERROR",
} as const;

// Set by apiFetchClient's body parser when the response was not JSON (a proxy, a timeout).
const NON_JSON_CODE = "UNKNOWN";

export function clientErrorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.body.code : null;
}

/** The backend's message when it sent one; otherwise `fallback`. */
export function clientErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError) || error.body.code === NON_JSON_CODE) return fallback;
  return error.body.message || fallback;
}

/** First message of each field the backend rejected, keyed by field name. */
export function clientFieldErrors(error: unknown): Partial<Record<string, string>> {
  if (!(error instanceof ApiError)) return {};
  const errors: Partial<Record<string, string>> = {};
  for (const { field, messages } of error.body.details ?? []) {
    if (messages[0]) errors[field] = messages[0];
  }
  return errors;
}
