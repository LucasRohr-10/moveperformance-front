import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { FollowupPanel, isAlertType } from "@/features/followup";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<{ tipo?: string; riesgo?: string }>;

const DESCRIPTION =
  "Alertas automáticas sobre situaciones que requieren revisión del equipo. Cada alerta permite contactar al cliente y registrar el resultado del seguimiento.";

export default function StaffFollowUpPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Seguimiento y retención" />}>
        <StaffFollowUpContent searchParams={searchParams} />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffFollowUpContent({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(USER_ROLES.STAFF);
  const { tipo, riesgo } = await searchParams;
  // The risk filter covers several types, so it wins over a single type.
  const riskOnly = riesgo === "true";

  return (
    <>
      <StaffPageHeader title="Seguimiento y retención" description={DESCRIPTION} />
      <FollowupPanel type={!riskOnly && isAlertType(tipo) ? tipo : null} riskOnly={riskOnly} />
    </>
  );
}
