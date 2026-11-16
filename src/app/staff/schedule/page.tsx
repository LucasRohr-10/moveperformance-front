import { Suspense } from "react";

import { StaffPage, StaffPageLoading } from "@/components/layout/staff-page";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { DailySlotsPanel } from "@/features/attendance/staff/daily-slots-panel";
import { todayBusinessDate } from "@/features/bookings/slots";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<{
  date?: string;
}>;

export default function StaffSchedulePage({ searchParams }: { searchParams: SearchParams }) {
  // On mobile the day bar and the current-row highlight run edge to edge, so the container drops its
  // side padding there and the title brings its own.
  return (
    <StaffPage className="px-0 py-8 md:px-6 md:py-16">
      <Suspense
        fallback={
          <div className="px-5 md:px-0">
            <StaffPageLoading title="Asistencias" />
          </div>
        }
      >
        <StaffScheduleContent searchParams={searchParams} />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffScheduleContent({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(USER_ROLES.STAFF);
  const params = await searchParams;
  // Default to today if no date is provided.
  const date = params.date || todayBusinessDate();

  return (
    <>
      <h1 className="px-5 font-display text-[26px] leading-none font-black tracking-[-0.02em] uppercase md:px-0 md:text-[36px] md:leading-[normal]">
        Asistencias
      </h1>

      <DailySlotsPanel initialDate={date} />
    </>
  );
}
