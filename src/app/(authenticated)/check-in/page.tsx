import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { CheckinForm, NoPendingCheckin } from "@/features/checkins";
// By path: the checkins index must stay free of server-only code (next/headers).
import { getPendingCheckin } from "@/features/checkins/checkins-server-api";
import { requireRole } from "@/lib/session";

export default function CheckInPage() {
  return (
    <PageContainer>
      <SectionLabel>Check-in</SectionLabel>
      <Suspense fallback={<CheckInSkeleton />}>
        <CheckInContent />
      </Suspense>
    </PageContainer>
  );
}

function CheckInSkeleton() {
  return (
    <p aria-busy="true" className="mt-9 text-sm text-muted">
      Cargando tu check-in…
    </p>
  );
}

export async function CheckInContent() {
  await requireRole(USER_ROLES.CLIENT);
  const { checkin } = await getPendingCheckin();
  if (checkin === null) return <NoPendingCheckin />;

  return (
    <>
      <Heading as="h1" size="lg" className="mt-3">
        ¿Cómo venís, {checkin.firstName}?
      </Heading>
      <p className="mt-3 text-sm text-muted">Check-in mensual · te toma 1 minuto y nos ayuda a acompañarte mejor.</p>
      <CheckinForm checkin={checkin} />
    </>
  );
}
