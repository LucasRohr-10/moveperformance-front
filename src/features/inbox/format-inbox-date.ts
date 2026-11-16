const INBOX_TIME_ZONE = "America/Montevideo";
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: INBOX_TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat("es-UY", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: INBOX_TIME_ZONE,
});
const shortDateFormat = new Intl.DateTimeFormat("es-UY", {
  day: "numeric",
  month: "short",
  timeZone: INBOX_TIME_ZONE,
});

function dayKey(date: Date): string {
  return dayKeyFormat.format(date);
}

// 'Hoy · 10:42', 'Ayer · 18:30' or '27 oct', by the Montevideo calendar.
export function formatInboxDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const key = dayKey(date);
  if (key === dayKey(now)) return `Hoy · ${timeFormat.format(date)}`;
  if (key === dayKey(new Date(now.getTime() - DAY_MS))) return `Ayer · ${timeFormat.format(date)}`;
  return shortDateFormat.format(date).replace(".", "");
}
