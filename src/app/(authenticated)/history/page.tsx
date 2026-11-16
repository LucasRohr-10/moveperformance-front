import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { AttendanceHistorySection } from "@/features/attendance-history";
import { parseHistoryParams, PaymentHistorySection } from "@/features/payment-history";
import { requireRole } from "@/lib/session";

import { attendanceHref, HistoryTabs } from "./history-tabs";

type SearchParams = Promise<{ tab?: string; origin?: string; page?: string }>;

const TITLE = "Actividad";

export default function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <SectionLabel>{TITLE}</SectionLabel>
      <Suspense
        fallback={
          <>
            <HistoryHeading />
            <Card aria-busy="true" className="mt-9 max-w-[796px]">
              <p className="text-sm text-muted">Cargando…</p>
            </Card>
          </>
        }
      >
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

function HistoryHeading() {
  return (
    <Heading as="h1" size="lg" className="mt-3">
      {TITLE}
    </Heading>
  );
}

export async function HistoryContent({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(USER_ROLES.CLIENT);
  const { tab, origin, page } = parseHistoryParams(await searchParams);

  return (
    <>
      <HistoryHeading />
      <HistoryTabs active={tab} />
      <div className="mt-6 max-w-[796px]">
        {tab === "pagos" ? (
          <PaymentHistorySection origin={origin} page={page} />
        ) : (
          <AttendanceHistorySection page={page} hrefForPage={attendanceHref} />
        )}
      </div>
    </>
  );
}
