export const BUSINESS_TIME_ZONE = "America/Montevideo";

const businessDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE });

const slotFormat = new Intl.DateTimeFormat("es-UY", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BUSINESS_TIME_ZONE,
});

export function businessDateOf(iso: string): string {
  return businessDateFormat.format(new Date(iso));
}

// "lunes 10/11, 19:00": the way the unpaid-cap notice names a turn.
export function formatSlotDayTime(iso: string): string {
  const parts = Object.fromEntries(
    slotFormat.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]),
  );
  return `${parts.weekday} ${parts.day}/${parts.month}, ${parts.hour}:${parts.minute}`;
}

// Built from the parts so the text does not depend on the punctuation ICU picks.
export function formatSlotDateTime(iso: string): string {
  const parts = Object.fromEntries(
    slotFormat.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]),
  );
  return `${parts.weekday} ${parts.day}/${parts.month} · ${parts.hour}:${parts.minute} hs`;
}
