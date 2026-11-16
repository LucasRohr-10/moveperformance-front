import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { NewClientForm } from "@/features/clients/staff/new-client-form";
import { requireRole } from "@/lib/session";

const BREADCRUMB = [{ label: "Clientes", href: ROUTES.STAFF_CLIENTS }];

export default function NewClientPage() {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Nuevo cliente" breadcrumb={BREADCRUMB} />}>
        <NewClientContent />
      </Suspense>
    </StaffPage>
  );
}

export async function NewClientContent() {
  await requireRole(USER_ROLES.STAFF);

  return (
    <>
      <StaffPageHeader title="Nuevo cliente" breadcrumb={BREADCRUMB} />
      <NewClientForm />
    </>
  );
}
