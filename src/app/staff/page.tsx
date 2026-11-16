import { Suspense } from "react";

import { StaffPage, StaffPageLoading } from "@/components/layout/staff-page";
import { Skeleton } from "@/components/ui/skeleton";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { DashboardHeader } from "@/features/dashboard/staff/dashboard-header";
import { DASHBOARD_VIEWS, parseDashboardParams } from "@/features/dashboard/staff/dashboard-params";
import { DashboardViewSwitch } from "@/features/dashboard/staff/dashboard-view-switch";
import { HoyView } from "@/features/dashboard/staff/hoy/hoy-view";
import { NegocioView } from "@/features/dashboard/staff/negocio/negocio-view";
import { PendingViewSwitch } from "@/features/dashboard/staff/hoy/pending-view-switch";
import { TodayLine } from "@/features/dashboard/staff/hoy/today-line";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function StaffHomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Panel Staff" />}>
        <StaffHomeContent searchParams={searchParams} />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffHomeContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole(USER_ROLES.STAFF);
  const params = parseDashboardParams(await searchParams);

  // The header carries today's date, which StaffPageHeader doesn't support. The line under the greeting and
  // the Hoy badge come from their own request, so each has its own boundary: the page does not wait for them.
  return (
    <>
      <DashboardHeader userName={user.name}>
        <Suspense fallback={<Skeleton className="h-[22px] w-64 bg-card" />}>
          <TodayLine />
        </Suspense>
      </DashboardHeader>
      <Suspense fallback={<DashboardViewSwitch params={params} pendingCount={null} />}>
        <PendingViewSwitch params={params} />
      </Suspense>
      {params.view === DASHBOARD_VIEWS.HOY ? <HoyView /> : <NegocioView params={params} />}
    </>
  );
}
