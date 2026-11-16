import type { ReactNode } from "react";

import { RoleGatedShell } from "@/components/layout/role-gated-shell";
import { STAFF_LINKS, StaffSidebar } from "@/components/layout/staff-sidebar";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { AvatarSlot } from "@/features/auth";
import { MobileProfileHeaderSlot } from "@/features/profile";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGatedShell
      role={USER_ROLES.STAFF}
      shell={(content) => (
        <StaffSidebar
          actions={<AvatarSlot variant="sidebar" />}
          mobileHeader={
            <MobileProfileHeaderSlot links={STAFF_LINKS} showPlan={false} showNotifications={false} />
          }
        >
          {content}
        </StaffSidebar>
      )}
    >
      {children}
    </RoleGatedShell>
  );
}
