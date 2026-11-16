import { Suspense } from "react";

import { StaffPage, StaffPageLoading } from "@/components/layout/staff-page";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { OfflineChargeDetailPanel } from "@/features/payments/staff/offline-charge-detail-panel";
import { requireRole } from "@/lib/session";

const BREADCRUMB = [{ label: "Pagos", href: ROUTES.STAFF_PAYMENTS }];

export default function StaffOfflineChargeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Cobro por fuera" breadcrumb={BREADCRUMB} />}>
        <StaffOfflineChargeDetailFromParams params={params} />
      </Suspense>
    </StaffPage>
  );
}

// Resolves `params` inside the Suspense boundary, so the page shell can navigate instantly.
async function StaffOfflineChargeDetailFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffOfflineChargeDetailContent chargeId={id} />;
}

export async function StaffOfflineChargeDetailContent({ chargeId }: { chargeId: string }) {
  await requireRole(USER_ROLES.STAFF);

  // The panel owns its own header: the client's name is part of the title and is only known once the charge loads.
  return <OfflineChargeDetailPanel chargeId={chargeId} />;
}
