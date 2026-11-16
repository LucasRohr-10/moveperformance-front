import { SERVICE_OPTIONS } from "@/features/bookings/service-options";
import { dayInfo, formatSlotTime, toBusinessDate } from "@/features/bookings/slots";
import type { AttendanceHistoryState, MyAttendancePageDto } from "@/lib/api/types";

type BadgeTone = "success" | "neutral" | "danger" | "warning";

// Present and absent keep the labels and colors the staff sees on the client's file.
export const ATTENDANCE_STATE_BADGE: Record<AttendanceHistoryState, { label: string; tone: BadgeTone }> = {
  present: { label: "Presente", tone: "success" },
  absent: { label: "Ausente", tone: "neutral" },
  unmarked: { label: "Sin marcar", tone: "warning" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-10" → "octubre". */
export function monthLabel(monthKey: string): string {
  return MONTH_NAMES[Number(monthKey.slice(5, 7)) - 1];
}

export interface AttendanceRow {
  id: string;
  /** "Performance — 18:00". */
  title: string;
  /** The label the API builds, e.g. "Sesión Recovery · 45 min". */
  description: string;
  dow: string;
  dayNumber: number;
  state: AttendanceHistoryState;
}

export interface AttendanceMonthGroup {
  monthKey: string;
  /** "OCTUBRE 2026". */
  heading: string;
  /** "8 asistencias". */
  attendedLabel: string;
  rows: AttendanceRow[];
}

const attendedLabel = (attended: number): string => `${attended} ${attended === 1 ? "asistencia" : "asistencias"}`;

/** Groups the page's rows under their Montevideo month; the month's attended count is the API's, for the whole month. */
export function groupAttendanceByMonth(page: MyAttendancePageDto, today: string): AttendanceMonthGroup[] {
  const groups: AttendanceMonthGroup[] = [];
  for (const item of page.items) {
    const date = toBusinessDate(item.startsAt);
    const monthKey = date.slice(0, 7);
    const day = dayInfo(date, today);
    const row: AttendanceRow = {
      id: item.bookingId,
      title: `${SERVICE_OPTIONS.find((option) => option.value === item.service)?.label ?? item.service} — ${formatSlotTime(item.startsAt)}`,
      description: item.label,
      dow: day.dow,
      dayNumber: day.dayNumber,
      state: item.state,
    };
    const current = groups.find((group) => group.monthKey === monthKey);
    if (current) {
      current.rows.push(row);
      continue;
    }
    const attended = page.months.find((month) => month.month === monthKey)?.attended ?? 0;
    groups.push({
      monthKey,
      heading: `${monthLabel(monthKey).toUpperCase()} ${monthKey.slice(0, 4)}`,
      attendedLabel: attendedLabel(attended),
      rows: [row],
    });
  }
  return groups;
}
