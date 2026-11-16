import Link from "next/link";
import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { todayBusinessDate } from "@/features/bookings/slots";
import { DayEditorPanel } from "@/features/day-editor/day-editor-panel";
import { EDIT_WINDOW_DAYS, formatEditDayLabel, parseEditDayParams } from "@/features/day-editor/edit-day-params";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<{
  date?: string;
  to?: string;
}>;

const TITLE = "Editar día";
const BREADCRUMB = [{ label: "Asistencias", href: ROUTES.STAFF_SCHEDULE }];

export default function StaffEditDayPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <StaffPage className="px-5 py-7 md:px-6 md:py-16">
      <Suspense fallback={<StaffPageLoading title={TITLE} breadcrumb={BREADCRUMB} />}>
        <StaffEditDayContent searchParams={searchParams} />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffEditDayContent({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(USER_ROLES.STAFF);
  const { date, to } = await searchParams;
  const days = parseEditDayParams(date, to, todayBusinessDate());

  if (!days) {
    return (
      <>
        <StaffPageHeader title={TITLE} breadcrumb={BREADCRUMB} />
        <Card padding="none">
          <EmptyState
            title="Ese día no se puede editar"
            description={`Se pueden editar los días desde hoy hasta dentro de ${EDIT_WINDOW_DAYS} días.`}
            action={
              <Link href={ROUTES.STAFF_SCHEDULE} className={buttonVariants({ variant: "secondary" })}>
                Volver a turnos y asistencia
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  // The phone has its own title block inside the editor, so this header is desktop only.
  return (
    <>
      <div className="hidden md:block">
        <StaffPageHeader title={TITLE} breadcrumb={BREADCRUMB} description={formatEditDayLabel(days.from, days.to)} />
      </div>
      <DayEditorPanel from={days.from} to={days.to} />
    </>
  );
}
