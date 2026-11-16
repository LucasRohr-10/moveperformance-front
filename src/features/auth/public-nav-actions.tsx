import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { HOME_BY_ROLE, ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES, type UserRole } from "@/config/constants/user-roles.constants";
import {
  type AuthenticatedUser,
  getCurrentUser,
  SessionUnavailableError,
} from "@/lib/session";

import { AvatarMenu } from "./avatar-menu";

// Each role's way back into its own area from the public nav's account menu.
const ACCOUNT_LINK_LABEL_BY_ROLE: Record<UserRole, string> = {
  [USER_ROLES.CLIENT]: "Mi perfil",
  [USER_ROLES.STAFF]: "Ir a Staff",
};

// Navbar actions for public pages: guests get the sign-in CTA, signed-in
// visitors get the account menu instead of being told to log in again.
export function PublicNavActions() {
  return (
    <Suspense fallback={<GuestActions />}>
      <PublicNavActionsContent />
    </Suspense>
  );
}

// "Ingresar" goes to the bare login on purpose: whoever signs in from a public page
// lands in their own area, not back on the page they were reading.
function GuestActions() {
  return (
    <>
      <Link
        href={ROUTES.LOGIN}
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        Ingresar
      </Link>
      <Link
        href={ROUTES.RESERVE}
        className={buttonVariants({ variant: "primary", size: "sm" })}
      >
        Reservar
      </Link>
    </>
  );
}

export async function PublicNavActionsContent() {
  let user: AuthenticatedUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // A down backend is not a reason to hide the nav — fall back to guest actions.
    if (!(error instanceof SessionUnavailableError)) throw error;
    user = null;
  }

  if (!user) return <GuestActions />;

  return (
    <AvatarMenu
      user={user}
      links={[
        { label: ACCOUNT_LINK_LABEL_BY_ROLE[user.role], href: HOME_BY_ROLE[user.role] },
      ]}
    />
  );
}
