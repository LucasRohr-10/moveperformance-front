import { Suspense } from "react";

import { StaffPage, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { StaffPlansPanel } from "@/features/plans/staff/staff-plans-panel";
import { requireRole } from "@/lib/session";

export default function StaffPlansPage() {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Planes" />}>
        <StaffPlansContent />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffPlansContent() {
  await requireRole(USER_ROLES.STAFF);

  // The header lives in the panel, not here: its description is the live
  // plan count ("4 planes · 3 activos"), which only the client component has.
  return <StaffPlansPanel />;
}
