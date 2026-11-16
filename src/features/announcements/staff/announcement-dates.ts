import { BUSINESS_TIME_ZONE } from "@/features/checkout/business-time";

// Built from the parts so the text does not depend on the punctuation ICU picks. Plain "es", not "es-UY":
// the app writes "septiembre" and the Uruguayan data says "setiembre".
const visibleUntilFormat = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("es", { month: "long", timeZone: "UTC" });
const dayMonthFormat = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "2-digit",
  timeZone: BUSINESS_TIME_ZONE,
});

function partsOf(format: Intl.DateTimeFormat, date: Date): Record<string, string> {
  return Object.fromEntries(format.formatToParts(date).map(({ type, value }) => [type, value]));
}

// A business date (YYYY-MM-DD) has no time zone: it is read as UTC midnight so it never slips a day.
export function formatVisibleUntil(businessDate: string): string {
  const { weekday, day, month } = partsOf(visibleUntilFormat, new Date(`${businessDate}T00:00:00Z`));
  return `${weekday} ${day} de ${month}`;
}

// For instants (createdAt, updatedAt).
export function formatDayMonth(iso: string): string {
  const { day, month } = partsOf(dayMonthFormat, new Date(iso));
  return `${day}/${month}`;
}

// "2026-10" → "OCTUBRE 2026", the heading of a month's group.
export function formatMonthHeading(monthKey: string): string {
  const { month } = partsOf(monthFormat, new Date(`${monthKey}-01T00:00:00Z`));
  return `${month.toUpperCase()} ${monthKey.slice(0, 4)}`;
}
