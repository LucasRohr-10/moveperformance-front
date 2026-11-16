import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { TemplatesPanel } from "@/features/scheduling/staff/templates-panel";
import { requireRole } from "@/lib/session";

export default function StaffScheduleTemplatesPage() {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Plantillas de turnos" />}>
        <StaffScheduleTemplatesContent />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffScheduleTemplatesContent() {
  await requireRole(USER_ROLES.STAFF);

  return (
    <>
      <StaffPageHeader title="Plantillas de turnos" />
      <TemplatesPanel />
    </>
  );
}
