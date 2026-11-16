import { SERVICE_OPTIONS } from "@/features/bookings/service-options";
import { dayInfo, formatSlotTime, toBusinessDate, type DayInfo } from "@/features/bookings/slots";
import type { BookingResponse, ServiceType } from "@/lib/api/types";

/** How many bookings the profile card lists before "Ver todas". */
export const PREVIEW_LIMIT = 4;

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

export interface UpcomingBookingRow {
  id: string;
  service: ServiceType;
  serviceLabel: string;
  /** The label the API builds, e.g. "Sesión Recovery · 45 min". */
  title: string;
  day: DayInfo;
  /** "YYYY-MM" of the business date. */
  monthKey: string;
  /** "HH:mm" in the business time zone. */
  time: string;
  durationMinutes: number;
  isPendingPayment: boolean;
  canCancel: boolean;
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

export function toUpcomingRows(bookings: BookingResponse[], today: string): UpcomingBookingRow[] {
  return bookings.map((booking) => {
    const date = toBusinessDate(booking.startsAt);
    return {
      id: booking.id,
      service: booking.service,
      serviceLabel: SERVICE_OPTIONS.find((option) => option.value === booking.service)?.label ?? booking.service,
      title: booking.label,
      day: dayInfo(date, today),
      monthKey: date.slice(0, 7),
      time: formatSlotTime(booking.startsAt),
      durationMinutes: booking.durationMinutes,
      isPendingPayment: booking.status === "pending_payment",
      canCancel: booking.canCancel,
    };
  });
}

function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** The months the dialog can show: from the first booking's month to the last one's. */
export function browsableMonths(rows: UpcomingBookingRow[], currentMonthKey: string): string[] {
  if (rows.length === 0) return [currentMonthKey];
  const keys = rows.map((row) => row.monthKey).sort();
  const months = [keys[0]];
  while (months[months.length - 1] < keys[keys.length - 1]) {
    months.push(nextMonthKey(months[months.length - 1]));
  }
  return months;
}

export function rowsForMonth(
  rows: UpcomingBookingRow[],
  monthKey: string,
  service: ServiceType | "all",
): UpcomingBookingRow[] {
  return rows.filter((row) => row.monthKey === monthKey && (service === "all" || row.service === service));
}

export function monthName(monthKey: string): string {
  return MONTH_NAMES[Number(monthKey.split("-")[1]) - 1];
}

export function monthTitle(monthKey: string): string {
  return `${capitalize(monthName(monthKey))} ${monthKey.split("-")[0]}`;
}

/** "Sáb 24 Oct · 10:30" */
export function shortWhen(row: UpcomingBookingRow): string {
  return `${capitalize(row.day.dow)} ${row.day.dayNumber} ${capitalize(row.day.month)} · ${row.time}`;
}

export function bookingCountLabel(count: number): string {
  return `${count} ${count === 1 ? "reserva" : "reservas"}`;
}
