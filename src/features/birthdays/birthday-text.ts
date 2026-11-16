import { BUSINESS_TIME_ZONE } from "@/features/checkout/business-time";

export const BIRTHDAY_MESSAGE_MAX_LENGTH = 500;

const FIRST_SEND_HOUR = 6;
const LAST_SEND_HOUR = 22;
export const BIRTHDAY_SEND_HOURS: readonly number[] = Array.from(
  { length: LAST_SEND_HOUR - FIRST_SEND_HOUR + 1 },
  (_, index) => FIRST_SEND_HOUR + index,
);

const timeFormat = new Intl.DateTimeFormat("es-UY", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BUSINESS_TIME_ZONE,
});
// Plain "es", not "es-UY", like the announcements dates; a business date is read at UTC midnight.
const headingFormat = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function partsOf(format: Intl.DateTimeFormat, date: Date): Record<string, string> {
  return Object.fromEntries(format.formatToParts(date).map(({ type, value }) => [type, value]));
}

// The same greeting the mail's subject uses, then the staff's message.
export function birthdayWhatsappText(firstName: string, message: string): string {
  return `¡Feliz cumple, ${firstName}! 🎉\n${message}`;
}

export function formatSendHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

// HH:MM in Montevideo.
export function formatTimeOfDay(iso: string): string {
  const { hour, minute } = partsOf(timeFormat, new Date(iso));
  return `${hour}:${minute}`;
}

// "miércoles 4 de noviembre".
export function formatTodayHeading(date: string): string {
  const { weekday, day, month } = partsOf(headingFormat, new Date(`${date}T00:00:00Z`));
  return `${weekday} ${day} de ${month}`;
}
