import { redirect } from "next/navigation";
import { cache } from "react";

import { HOME_BY_ROLE, ROUTES } from "@/config/constants/routes.constants";
import type { UserRole } from "@/config/constants/user-roles.constants";
import { parseJsonOrThrow } from "@/lib/api/client";
import { ACCOUNT_DEACTIVATED_CODE } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";
import type { AuthenticatedUser } from "@/lib/api/types";
import { buildCompleteProfileHref } from "@/lib/complete-profile-href";
import { hasIncompleteProfile } from "@/lib/incomplete-profile";
import { buildLoginHref } from "@/lib/login-href";

export type { AuthenticatedUser };

export class SessionUnavailableError extends Error {
  constructor() {
    super("Could not verify the session with the API.");
    this.name = "SessionUnavailableError";
  }
}

// The API refused a session that is still alive because its client was deactivated.
// It is a SessionUnavailableError so that slots that tolerate a failing API keep working.
export class AccountDeactivatedError extends SessionUnavailableError {
  constructor() {
    super();
    this.name = "AccountDeactivatedError";
  }
}

// No redirectTo: a deactivated account cannot go back to any page.
export const DEACTIVATED_LOGIN_HREF = `${ROUTES.LOGIN}?error=${ACCOUNT_DEACTIVATED_CODE}`;

async function isDeactivatedResponse(response: Response): Promise<boolean> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && "code" in body && body.code === ACCOUNT_DEACTIVATED_CODE;
  } catch {
    return false;
  }
}

export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    let response: Response;
    try {
      response = await apiFetchServer("/api/v1/users/me");
    } catch {
      throw new SessionUnavailableError();
    }

    if (response.status === 401) return null;
    if (response.status === 403 && (await isDeactivatedResponse(response))) {
      throw new AccountDeactivatedError();
    }
    if (!response.ok) throw new SessionUnavailableError();
    return parseJsonOrThrow<AuthenticatedUser>(response);
  },
);

// The redirect happens outside any try/catch, which would swallow Next's redirect signal.
async function getUserOrRedirectIfDeactivated(): Promise<AuthenticatedUser | null> {
  let isDeactivated = false;
  let user: AuthenticatedUser | null = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof AccountDeactivatedError)) throw error;
    isDeactivated = true;
  }
  if (isDeactivated) redirect(DEACTIVATED_LOGIN_HREF);
  return user;
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getUserOrRedirectIfDeactivated();
  if (!user) redirect(await buildLoginHref());
  // The phone (and a client's birth date) is mandatory: nobody uses the app until they add it.
  if (hasIncompleteProfile(user)) redirect(await buildCompleteProfileHref());
  return user;
}

// Only for the page that asks for what is missing; anyone with a complete profile goes home.
export async function requireIncompleteProfile(): Promise<AuthenticatedUser> {
  const user = await getUserOrRedirectIfDeactivated();
  if (!user) redirect(await buildLoginHref());
  if (!hasIncompleteProfile(user)) redirect(HOME_BY_ROLE[user.role]);
  return user;
}

// Only decides which screen to show: the API enforces each role's permissions.
export async function requireRole(role: UserRole): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(HOME_BY_ROLE[user.role]);
  return user;
}
