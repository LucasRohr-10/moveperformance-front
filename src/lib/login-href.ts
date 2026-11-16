import { headers } from "next/headers";

import { ROUTES } from "@/config/constants/routes.constants";
import { CURRENT_PATH_HEADER } from "@/lib/current-path-header";
import { safeRedirectPath } from "@/lib/redirect-path";

// Where an anonymous visitor should be sent to sign in, carrying the page
// they were on (set by proxy.ts) so LoginForm can send them back after a
// successful sign-in. Server-only: reads the current request's headers.
export async function buildLoginHref(): Promise<string> {
  const path = safeRedirectPath((await headers()).get(CURRENT_PATH_HEADER));
  return path ? `${ROUTES.LOGIN}?redirectTo=${encodeURIComponent(path)}` : ROUTES.LOGIN;
}
