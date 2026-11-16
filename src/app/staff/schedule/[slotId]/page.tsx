import { Suspense } from "react";

import { StaffPage, StaffPageHeader, StaffPageLoading } from "@/components/layout/staff-page";
import { ROUTES } from "@/config/constants/routes.constants";
import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { AttendanceRosterPanel } from "@/features/attendance/staff/attendance-roster-panel";
import { getTimeSlotDetail, listDailySlots } from "@/features/attendance/staff/time-slot-detail-api";
import { formatSlotTime } from "@/features/bookings/slots";
import type { DailySlot } from "@/lib/api/types";
import { requireRole } from "@/lib/session";

const BREADCRUMB = [{ label: "Asistencias", href: ROUTES.STAFF_SCHEDULE }];
const FALLBACK_TITLE = "Asistencia del turno";

const SERVICE_LABEL: Record<DailySlot["service"], string> = {
  performance: "Performance",
  rehab: "Rehab",
  recovery: "Recovery",
};

function slotTitle(slot: DailySlot): string {
  return `${formatSlotTime(slot.startsAt)} · ${SERVICE_LABEL[slot.service]}`;
}

function slotDescription(slot: DailySlot): string {
  const day = new Date(slot.startsAt).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Montevideo",
  });
  const professional = slot.professionalName ?? "Sin profesional asignado";
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${professional} · ${slot.booked} de ${slot.capacity} reservas`;
}

export default async function StaffShiftRosterPage({
  params,
}: {
  params: Promise<{ slotId: string }>;
}) {
  const { slotId } = await params;
  return (
    <StaffPage>
      <Suspense
        fallback={<StaffPageLoading title={FALLBACK_TITLE} breadcrumb={BREADCRUMB} />}
      >
        <StaffShiftRosterContent timeSlotId={slotId} />
      </Suspense>
    </StaffPage>
  );
}

export async function StaffShiftRosterContent({ timeSlotId }: { timeSlotId: string }) {
  await requireRole(USER_ROLES.STAFF);
  // The slot may be gone or the id malformed; fall back to the generic title
  // rather than fail the whole page over a header.
  const slot = await getTimeSlotDetail(timeSlotId).catch(() => null);
  // Fetch the day's slots to compute previous/next navigation.
  let daySlotsForNav: DailySlot[] = [];
  if (slot) {
    const dayStr = slot.startsAt.split("T")[0];
    daySlotsForNav = await listDailySlots(dayStr).catch(() => []);
  }

  return (
    <>
      <StaffPageHeader
        title={slot ? slotTitle(slot) : FALLBACK_TITLE}
        breadcrumb={BREADCRUMB}
        description={slot ? slotDescription(slot) : undefined}
      />
      <AttendanceRosterPanel timeSlotId={timeSlotId} daySlots={daySlotsForNav} />
    </>
  );
}
