import type { SnackbarInput } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import type { TemplateDay } from "@/lib/api/types";

export const WEEKDAY_LABELS = [
  { weekday: 1, short: "L", name: "Lunes", abbreviation: "Lun" },
  { weekday: 2, short: "M", name: "Martes", abbreviation: "Mar" },
  { weekday: 3, short: "X", name: "Miércoles", abbreviation: "Mié" },
  { weekday: 4, short: "J", name: "Jueves", abbreviation: "Jue" },
  { weekday: 5, short: "V", name: "Viernes", abbreviation: "Vie" },
  { weekday: 6, short: "S", name: "Sábado", abbreviation: "Sáb" },
  { weekday: 7, short: "D", name: "Domingo", abbreviation: "Dom" },
] as const;

export const DEFAULT_DAY_HOURS = { startTime: "08:00", endTime: "20:00" } as const;

export function formatTemplateDays(days: TemplateDay[]): string {
  return [...days]
    .sort((a, b) => a.weekday - b.weekday)
    .map((day) => {
      const label = WEEKDAY_LABELS.find((item) => item.weekday === day.weekday);
      return `${label?.abbreviation ?? day.weekday} ${day.startTime}–${day.endTime}`;
    })
    .join(" · ");
}

export function templateDayRows(days: TemplateDay[]): { day: string; hours: string }[] {
  return [...days]
    .sort((a, b) => a.weekday - b.weekday)
    .map((day) => ({
      day: WEEKDAY_LABELS.find((item) => item.weekday === day.weekday)?.name ?? String(day.weekday),
      hours: `${day.startTime} – ${day.endTime}`,
    }));
}

// The backend's top-level message is generic; the actual reasons live in
// `details`, one entry per failing field with possibly several messages each.
export function validationMessagesFrom(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  const messages = error.body.details?.flatMap((detail) => detail.messages) ?? [];
  return messages.length > 0 ? messages : [error.message];
}

export const DAYS_DONT_FIT_MESSAGE =
  "El último turno de cada día tiene que terminar justo a la hora de fin: no puede sobrar tiempo libre ni pasarse. Cambiá la hora de fin a una de las que te marcamos.";
const DAY_FIELD = /^days\.([1-7])$/;

/** Weekday (ISO 1 to 7) to the end times ("HH:mm") that would make that day fit. */
export type DaySuggestions = Partial<Record<number, string[]>>;

// The backend answers each day that doesn't close exactly with a `days.<weekday>`
// detail that carries the end times it would accept.
export function daySuggestionsFrom(error: unknown): DaySuggestions {
  if (!(error instanceof ApiError)) return {};
  const entries = (error.body.details ?? []).flatMap((detail) => {
    const weekday = DAY_FIELD.exec(detail.field)?.[1];
    return weekday && detail.suggestions?.length ? [[Number(weekday), detail.suggestions] as const] : [];
  });
  return Object.fromEntries(entries);
}

/** Times that every flagged day accepts; only worth offering as a shared fix when two or more days are flagged. */
export function commonSuggestions(suggestions: DaySuggestions): string[] {
  const lists = Object.values(suggestions).filter((times): times is string[] => times !== undefined);
  if (lists.length < 2) return [];
  return lists[0].filter((time) => lists.every((times) => times.includes(time)));
}

export function withoutDay(suggestions: DaySuggestions, weekday: number): DaySuggestions {
  const next = { ...suggestions };
  delete next[weekday];
  return next;
}

function reviewDaysTitle(count: number): string {
  return count === 1 ? "Revisá 1 día" : `Revisá ${count} días`;
}

export function saveErrorSnackbar(error: unknown, fallback: string): SnackbarInput {
  const flaggedDays = Object.keys(daySuggestionsFrom(error)).length;
  if (flaggedDays > 0) return { tone: "warning", title: reviewDaysTitle(flaggedDays), message: DAYS_DONT_FIT_MESSAGE, persistent: true };
  return messagesSnackbar(validationMessagesFrom(error), fallback);
}

// One message is the title itself; several are listed under the fallback.
export function messagesSnackbar(messages: string[], fallback: string): SnackbarInput {
  if (messages.length === 1) return { tone: "danger", title: messages[0] };
  if (messages.length > 1) return { tone: "danger", title: fallback, items: messages };
  return { tone: "danger", title: fallback };
}

/** "No se crean turnos en 2 días editados a mano: 12/11, 25/12." */
export function skippedDaysText(days: string[]): string {
  const dates = days.map((day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`).join(", ");
  return `No se crean turnos en ${days.length} ${days.length === 1 ? "día editado" : "días editados"} a mano: ${dates}.`;
}

export function bookingsCountText(count: number): string {
  return count === 1 ? "1 reserva" : `${count} reservas`;
}
