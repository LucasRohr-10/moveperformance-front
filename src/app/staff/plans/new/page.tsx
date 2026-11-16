import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { NewPlanPanel } from "@/features/plans/staff/new-plan-panel";
import { requireRole } from "@/lib/session";

const BREADCRUMB = [{ label: "Planes", href: ROUTES.STAFF_PLANS }];

export default function NewPlanPage() {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Nuevo plan" breadcrumb={BREADCRUMB} />}>
        <NewPlanContent />
      </Suspense>
    </StaffPage>
  );
}

export async function NewPlanContent() {
  await requireRole(USER_ROLES.STAFF);

  return (
    <>
      <StaffPageHeader title="Nuevo plan" breadcrumb={BREADCRUMB} />
      <NewPlanPanel />
    </>
  );
}
