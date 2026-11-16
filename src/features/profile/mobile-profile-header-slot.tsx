import { Suspense } from "react";

import type { NavLink } from "@/components/layout/mobile-nav";
import {
  type AuthenticatedUser,
  getCurrentUser,
  SessionUnavailableError,
} from "@/lib/session";

import { MobileProfileHeader } from "./mobile-profile-header";

export interface MobileProfileHeaderSlotProps {
  links: NavLink[];
  showPlan?: boolean;
  settingsHref?: string;
  showNotifications?: boolean;
}

export function MobileProfileHeaderSlot({
  links,
  showPlan,
  settingsHref,
  showNotifications,
}: MobileProfileHeaderSlotProps) {
  return (
    <Suspense fallback={<MobileProfileHeaderPlaceholder />}>
      <MobileProfileHeaderSlotContent
        links={links}
        showPlan={showPlan}
        settingsHref={settingsHref}
        showNotifications={showNotifications}
      />
    </Suspense>
  );
}

function MobileProfileHeaderPlaceholder() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2">
      <div className="h-10 w-[84px] animate-pulse rounded-full bg-card" />
      <div className="h-10 w-10 animate-pulse rounded-full bg-card" />
    </div>
  );
}

export async function MobileProfileHeaderSlotContent({
  links,
  showPlan,
  settingsHref,
  showNotifications,
}: MobileProfileHeaderSlotProps) {
  let user: AuthenticatedUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof SessionUnavailableError)) throw error;
    user = null;
  }

  if (!user) return <MobileProfileHeaderPlaceholder />;

  return (
    <MobileProfileHeader
      user={user}
      links={links}
      showPlan={showPlan}
      settingsHref={settingsHref}
      showNotifications={showNotifications}
    />
  );
}
