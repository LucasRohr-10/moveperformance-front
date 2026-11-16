import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { EditPlanPanel } from "@/features/plans/staff/edit-plan-panel";
import { requireRole } from "@/lib/session";

const BREADCRUMB = [{ label: "Planes", href: ROUTES.STAFF_PLANS }];

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Editar plan" breadcrumb={BREADCRUMB} />}>
        <EditPlanContent planId={id} />
      </Suspense>
    </StaffPage>
  );
}

export async function EditPlanContent({ planId }: { planId: string }) {
  await requireRole(USER_ROLES.STAFF);

  return (
    <>
      <StaffPageHeader title="Editar plan" breadcrumb={BREADCRUMB} />
      <EditPlanPanel planId={planId} />
    </>
  );
}
