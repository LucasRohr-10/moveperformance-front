import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { ProfessionalsPanel } from "@/features/scheduling/staff/professionals-panel";
import { requireRole } from "@/lib/session";

export default function StaffScheduleProfessionalsPage() {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Profesionales" />}>
        <StaffScheduleProfessionalsContent />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffScheduleProfessionalsContent() {
  await requireRole(USER_ROLES.STAFF);

  return (
    <>
      <StaffPageHeader title="Profesionales" />
      <ProfessionalsPanel />
    </>
  );
}
