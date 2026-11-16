import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { type AuthenticatedUser, getCurrentUser, SessionUnavailableError } from "@/lib/session";

import { BirthdayCelebration } from "./birthday-celebration";

// Reads the session only to decide whether a client may be celebrated; each page guards its own access.
export async function BirthdaySlot() {
  let user: AuthenticatedUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // A down backend is no reason to break the layout.
    if (!(error instanceof SessionUnavailableError)) throw error;
    return null;
  }
  if (!user || user.role !== USER_ROLES.CLIENT || !user.birthDate) return null;

  return <BirthdayCelebration userId={user.id} firstName={user.name} birthDate={user.birthDate} />;
}
