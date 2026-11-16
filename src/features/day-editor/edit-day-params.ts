import { addDaysToDate } from "@/features/bookings/slots";

// How far ahead slots exist at most: `bookingWindowDays` goes up to 30. The backend checks the real limit.
export const EDIT_WINDOW_DAYS = 30;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string | undefined): value is string {
  if (!value || !DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export interface EditDayParams {
  from: string;
  /** Only when it is after `from`. */
  to?: string;
}

/** The URL's `date` and `to`, or null when they do not name days that can be edited. */
export function parseEditDayParams(
  date: string | undefined,
  to: string | undefined,
  today: string,
): EditDayParams | null {
  const last = addDaysToDate(today, EDIT_WINDOW_DAYS);
  if (!isRealDate(date) || date < today || date > last) return null;
  if (to === undefined || to === date) return { from: date };
  if (!isRealDate(to) || to < date || to > last) return null;
  return { from: date, to };
}

function utcNoon(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Miércoles 12 de noviembre", or "Del miércoles 12 de noviembre al sábado 15 de noviembre". */
export function formatEditDayLabel(from: string, to?: string): string {
  const format = (date: string) =>
    utcNoon(date)
      .toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
      .replace(",", "");
  return to ? `Del ${format(from)} al ${format(to)}` : capitalized(format(from));
}

/** "Miércoles 12/11", or "Del 12/11 al 15/11": what the summary calls the days a change is about. */
export function formatEditDayScope(from: string, to?: string): string {
  const dayMonth = (date: string) => date.slice(8, 10) + "/" + date.slice(5, 7);
  if (to) return `Del ${dayMonth(from)} al ${dayMonth(to)}`;
  const weekday = utcNoon(from).toLocaleDateString("es-UY", { weekday: "long", timeZone: "UTC" });
  return `${capitalized(weekday)} ${dayMonth(from)}`;
}

/** "mié. 12/11", or "12/11 al 15/11". */
export function formatEditDayShort(from: string, to?: string): string {
  const dayMonth = (date: string) => date.slice(8, 10) + "/" + date.slice(5, 7);
  if (to) return `${dayMonth(from)} al ${dayMonth(to)}`;
  const weekday = utcNoon(from).toLocaleDateString("es-UY", { weekday: "short", timeZone: "UTC" });
  return `${weekday} ${dayMonth(from)}`;
}
