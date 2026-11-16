import { Suspense } from "react";

import { StaffPage, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { StaffAnnouncementsPanel } from "@/features/announcements";
import { requireRole } from "@/lib/session";

export default function StaffAnnouncementsPage() {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Comunicados" />}>
        <StaffAnnouncementsContent />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffAnnouncementsContent() {
  await requireRole(USER_ROLES.STAFF);

  // The header lives in the panel, next to the form it introduces.
  return <StaffAnnouncementsPanel />;
}
