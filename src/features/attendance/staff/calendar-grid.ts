// Pure date math for the day-navigation calendar popover: Monday-first month
// grid, padded with the leading/trailing days of the neighboring months so
// every row has 7 cells.

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isOutside: boolean;
}

export const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const DAY_MS = 86_400_000;

function toIsoDate(utcDate: Date): string {
  return utcDate.toISOString().slice(0, 10);
}

export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-UY", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildCalendarWeeks(monthKey: string): CalendarDay[][] {
  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // Intl/JS weekdays are 0=Sun..6=Sat; the grid is Monday-first.
  const leadingDays = (firstOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const days: CalendarDay[] = [];
  for (let i = leadingDays; i > 0; i--) {
    const d = new Date(firstOfMonth.getTime() - i * DAY_MS);
    days.push({ date: toIsoDate(d), dayNumber: d.getUTCDate(), isOutside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      date: toIsoDate(new Date(Date.UTC(year, month - 1, day))),
      dayNumber: day,
      isOutside: false,
    });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    const next = new Date(new Date(`${last.date}T00:00:00.000Z`).getTime() + DAY_MS);
    days.push({ date: toIsoDate(next), dayNumber: next.getUTCDate(), isOutside: true });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
