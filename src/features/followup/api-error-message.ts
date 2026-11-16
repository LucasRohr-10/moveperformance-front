import { ApiError } from "@/lib/api/errors";

// The code the API client gives an error whose body was not JSON (a proxy page, a timeout).
const NON_JSON_ERROR_CODE = "UNKNOWN";

// The message of the API as it comes; a fixed text for anything that did not come from it (network, proxy).
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.body.code !== NON_JSON_ERROR_CODE) return error.body.message;
  return fallback;
}

// The API names each wrong field in `details`: the first message of each goes under its field.
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const errors: Record<string, string> = {};
  for (const { field, messages } of error.body.details ?? []) {
    if (messages[0]) errors[field] = messages[0];
  }
  return errors;
}
