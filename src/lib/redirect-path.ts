import { ROUTES } from "@/config/constants/routes.constants";

// Looping back to an auth screen after signing in would undo what the user
// just did or do nothing useful — never offer one as a return destination.
const AUTH_ROUTES: readonly string[] = [
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_EMAIL,
  ROUTES.COMPLETE_PROFILE,
];

// Browsers drop tabs and line breaks (and treat "\" as "/") when parsing a URL,
// so "/\t/evil.com" ends up as "//evil.com". Any of these means the value is
// not the plain path it looks like.
const UNSAFE_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

// Only accepts a same-origin path: rejects anything that could be read as an
// absolute or protocol-relative URL (open redirect) and the auth pages
// themselves (redirect loop). Pure and environment-agnostic so it can be
// imported from both client components (LoginForm) and server code.
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || UNSAFE_CHARACTERS.test(value)) return null;

  const path = value.split(/[?#]/)[0];
  if (AUTH_ROUTES.includes(path)) return null;

  return value;
}
