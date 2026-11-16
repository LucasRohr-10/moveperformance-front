import { type ReactNode, Suspense } from "react";

import { Navbar } from "@/components/layout/navbar";
import { RoleGatedShell } from "@/components/layout/role-gated-shell";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { AvatarSlot } from "@/features/auth";
import { BirthdaySlot } from "@/features/birthday-celebration";
import { DesktopInboxControl, InboxProvider } from "@/features/inbox";
import { MobileProfileHeaderSlot } from "@/features/profile";

const AUTHENTICATED_LINKS = [
  { label: "Mi perfil", href: ROUTES.DASHBOARD },
  { label: "Reservar", href: ROUTES.BOOKINGS },
  { label: "Planes", href: ROUTES.PLANS },
  { label: "Actividad", href: ROUTES.HISTORY },
];

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <>
      <InboxProvider>
        <Navbar
          links={AUTHENTICATED_LINKS}
          actions={
            <>
              <DesktopInboxControl />
              <AvatarSlot />
            </>
          }
          mobileHeader={<MobileProfileHeaderSlot links={AUTHENTICATED_LINKS} showPlan={false} />}
        />
      </InboxProvider>
      <main className="flex-1">{children}</main>
      <Suspense fallback={null}>
        <BirthdaySlot />
      </Suspense>
    </>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGatedShell role={USER_ROLES.CLIENT} shell={(content) => <AuthenticatedShell>{content}</AuthenticatedShell>}>
      {children}
    </RoleGatedShell>
  );
}
