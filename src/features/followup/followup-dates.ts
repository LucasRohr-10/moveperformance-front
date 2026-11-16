import { BUSINESS_TIME_ZONE } from "@/features/checkout/business-time";

const instantFormat = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BUSINESS_TIME_ZONE,
});

// Built from the parts so the text does not depend on the punctuation ICU picks.
function partsOf(iso: string): Record<string, string> {
  return Object.fromEntries(instantFormat.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
}

// For instants (createdAt, startedAt, endedAt). The business dates (YYYY-MM-DD) are split as text instead.
export function formatInstantDate(iso: string): string {
  const { day, month, year } = partsOf(iso);
  return `${day}/${month}/${year}`;
}

export function formatInstantDateTime(iso: string): string {
  const { hour, minute } = partsOf(iso);
  return `${formatInstantDate(iso)} ${hour}:${minute}`;
}
