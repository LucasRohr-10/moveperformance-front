import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/api/types";

export interface MissingProfileFields {
  phone: boolean;
  // Only clients are greeted on their birthday, so staff is never asked for it.
  birthDate: boolean;
}

export function missingProfileFields(user: AuthenticatedUser): MissingProfileFields {
  return {
    phone: !user.phone,
    birthDate: user.role === USER_ROLES.CLIENT && !user.birthDate,
  };
}

export function hasIncompleteProfile(user: AuthenticatedUser): boolean {
  const missing = missingProfileFields(user);
  return missing.phone || missing.birthDate;
}
