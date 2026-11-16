import { redirect } from "next/navigation";

import { HOME_BY_ROLE } from "@/config/constants/routes.constants";
import {
  type AuthenticatedUser,
  getCurrentUser,
  SessionUnavailableError,
} from "@/lib/session";

// Login, register and forgot-password make no sense with an open session:
// send the user to their role's area. Renders nothing. A down API is not a
// reason to hide those screens, so then it does nothing and the form shows.
export async function RedirectIfSignedIn(): Promise<null> {
  let user: AuthenticatedUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof SessionUnavailableError)) throw error;
    return null;
  }

  if (user) redirect(HOME_BY_ROLE[user.role]);
  return null;
}
