import { Suspense } from "react";

import { StaffPage, StaffPageLoading } from "@/components/layout/staff-page";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { ClientDetailPanel } from "@/features/clients/staff/client-detail-panel";
import { requireRole } from "@/lib/session";

const BREADCRUMB = [{ label: "Clientes", href: ROUTES.STAFF_CLIENTS }];

export default function StaffClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <StaffPage>
      <Suspense
        fallback={<StaffPageLoading title="Ficha de cliente" breadcrumb={BREADCRUMB} />}
      >
        <StaffClientDetailFromParams params={params} />
      </Suspense>
    </StaffPage>
  );
}

// Resolves `params` inside the Suspense boundary, so the page shell can navigate instantly.
async function StaffClientDetailFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffClientDetailContent clientId={id} />;
}

export async function StaffClientDetailContent({ clientId }: { clientId: string }) {
  await requireRole(USER_ROLES.STAFF);

  // The panel owns its own header: the client's name is the page's only h1,
  // and it isn't known until the client loads client-side.
  return <ClientDetailPanel clientId={clientId} />;
}
