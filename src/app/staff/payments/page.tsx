import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import {
  isPaymentOrigin,
  isPaymentsView,
  isPurchaseKind,
  isPurchaseStatus,
  PAYMENTS_VIEWS,
  parsePage,
  StaffPaymentsPanel,
  type StaffPaymentsFilter,
} from "@/features/payments/staff";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<{
  status?: string;
  kind?: string;
  origin?: string;
  needsAttention?: string;
  clientId?: string;
  q?: string;
  page?: string;
  view?: string;
  atrasados?: string;
  dia?: string;
}>;

const DESCRIPTION =
  "Conciliación de pagos de planes y reservas. Los pagos marcados con atención requerida necesitan revisión manual antes de darlos por resueltos.";

export default function StaffPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <StaffPage>
      <Suspense fallback={<StaffPageLoading title="Pagos" />}>
        <StaffPaymentsContent searchParams={searchParams} />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffPaymentsContent({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(USER_ROLES.STAFF);
  const params = await searchParams;

  const filter: StaffPaymentsFilter = {
    status: isPurchaseStatus(params.status) ? params.status : undefined,
    kind: isPurchaseKind(params.kind) ? params.kind : undefined,
    origin: isPaymentOrigin(params.origin) ? params.origin : undefined,
    needsAttention: params.needsAttention === "true" ? true : undefined,
    clientId: params.clientId || undefined,
    q: params.q || undefined,
  };

  const view = isPaymentsView(params.view) ? params.view : PAYMENTS_VIEWS.ALL;
  // Disjoint filters: a URL that asks for both keeps the overdue one (the back would answer an empty list).
  const overdueOnly = params.atrasados === "true";
  const todayOnly = params.dia === "hoy" && !overdueOnly;

  return (
    <>
      <StaffPageHeader title="Pagos" description={DESCRIPTION} />
      {/* The key remounts the panel on a view change, so the table never shows the other view's stale rows. */}
      <StaffPaymentsPanel
        key={view}
        filter={filter}
        page={parsePage(params.page)}
        view={view}
        overdueOnly={overdueOnly ? true : undefined}
        todayOnly={todayOnly ? true : undefined}
      />
    </>
  );
}
