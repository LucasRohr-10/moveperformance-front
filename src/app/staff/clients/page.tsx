import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { ClientsFilters } from "@/features/clients/staff/clients-filters";
import { clientsListHref, parseClientsListParams } from "@/features/clients/staff/clients-list-params";
import { ClientsListSection } from "@/features/clients/staff/clients-list-section";
import { ClientsListSkeleton } from "@/features/clients/staff/clients-list-view";
import { NewClientLink } from "@/features/clients/staff/new-client-link";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<{
  q?: string | string[];
  page?: string | string[];
  status?: string | string[];
  vence?: string | string[];
}>;

export default function StaffClientsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Clientes" />}>
        <StaffClientsContent searchParams={searchParams} />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffClientsContent({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(USER_ROLES.STAFF);
  const params = parseClientsListParams(await searchParams);

  return (
    <>
      <StaffPageHeader title="Clientes" action={<NewClientLink />} />
      <div className="space-y-6">
        <ClientsFilters params={params} />
        {/* The key brings the skeleton back on every change of filter, search or page. */}
        <Suspense key={clientsListHref(params)} fallback={<ClientsListSkeleton status={params.status} />}>
          <ClientsListSection params={params} />
        </Suspense>
      </div>
    </>
  );
}
