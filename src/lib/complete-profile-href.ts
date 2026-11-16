import { headers } from "next/headers";

import { ROUTES } from "@/config/constants/routes.constants";
import { CURRENT_PATH_HEADER } from "@/lib/current-path-header";
import { safeRedirectPath } from "@/lib/redirect-path";

// Where a signed-in user with no phone is sent to add it, carrying the page
// they were trying to reach (set by proxy.ts) so CompleteProfileForm can take
// them there once the phone is saved. Server-only: reads the current request's headers.
export async function buildCompleteProfileHref(): Promise<string> {
  const path = safeRedirectPath((await headers()).get(CURRENT_PATH_HEADER));
  return path ? `${ROUTES.COMPLETE_PROFILE}?redirectTo=${encodeURIComponent(path)}` : ROUTES.COMPLETE_PROFILE;
}
