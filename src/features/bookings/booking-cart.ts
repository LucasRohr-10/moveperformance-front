import type { BookableSlot, FailedSlotDto, ServiceType } from "@/lib/api/types";

import type { RepeatLimit } from "./repeat-limit";
import { formatSlotTime, isoWeekday, isPastSlot, toBusinessDate } from "./slots";

const WEEKDAYS_PLURAL = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];
const WEEKDAYS_SHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function weekdayOf(slot: BookableSlot): number {
  return isoWeekday(toBusinessDate(slot.startsAt));
}

export function patternOf(slot: BookableSlot): string {
  return `${weekdayOf(slot)}-${formatSlotTime(slot.startsAt)}`;
}

function byStart(a: BookableSlot, b: BookableSlot): number {
  return a.startsAt.localeCompare(b.startsAt);
}

export function expandRepeat(
  picked: BookableSlot[],
  candidates: BookableSlot[],
  limit: RepeatLimit,
): { slots: BookableSlot[]; skipped: BookableSlot[] } {
  const patterns = new Set(picked.map(patternOf));
  const pickedIds = new Set(picked.map((s) => s.id));
  const matches = candidates.filter(
    (s) =>
      !pickedIds.has(s.id) &&
      patterns.has(patternOf(s)) &&
      toBusinessDate(s.startsAt) <= limit.untilDate &&
      !isPastSlot(s) &&
      !s.alreadyBooked,
  );
  const sorted = [...picked, ...matches.filter((s) => !s.isFull)].sort(byStart);
  return {
    slots: limit.maxSlots === null ? sorted : sorted.slice(0, limit.maxSlots),
    skipped: matches.filter((s) => s.isFull).sort(byStart),
  };
}

function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function hoursLabel(time: string): string {
  const [hours, minutes] = time.split(":");
  return minutes === "00" ? `${Number(hours)} hrs` : `${Number(hours)}:${minutes} hrs`;
}

export function repeatPhrase(picked: BookableSlot[]): string {
  const byTime = new Map<string, Set<number>>();
  [...picked].sort(byStart).forEach((slot) => {
    const time = formatSlotTime(slot.startsAt);
    byTime.set(time, (byTime.get(time) ?? new Set()).add(weekdayOf(slot)));
  });
  const parts = Array.from(byTime, ([time, weekdays]) => {
    const days = joinSpanish(Array.from(weekdays).sort((a, b) => a - b).map((d) => WEEKDAYS_PLURAL[d - 1]));
    return `los ${days} a las ${hoursLabel(time)}`;
  });
  return `Todos ${joinSpanish(parts)}`;
}

// "21 nov"
export function shortDateLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

export function failedSlotMessage(slot: BookableSlot): string {
  const date = toBusinessDate(slot.startsAt);
  return `No se pudo agendar el ${WEEKDAYS_SHORT[isoWeekday(date) - 1]} ${shortDateLabel(date)} a las ${formatSlotTime(slot.startsAt)}`;
}

// "Lun 26 · 15:00–16:00"
export function cartItemLabel(slot: BookableSlot): string {
  const date = toBusinessDate(slot.startsAt);
  const weekday = WEEKDAYS_SHORT[isoWeekday(date) - 1];
  const day = Number(date.split("-")[2]);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} · ${formatSlotTime(slot.startsAt)}–${formatSlotTime(slot.endsAt)}`;
}

export interface DayGroup {
  date: string;
  weekday: string; // "LUN"
  dayNumber: number;
  slots: BookableSlot[];
}

export function groupByDay(slots: BookableSlot[]): DayGroup[] {
  const groups = new Map<string, BookableSlot[]>();
  [...slots].sort(byStart).forEach((slot) => {
    const date = toBusinessDate(slot.startsAt);
    groups.set(date, [...(groups.get(date) ?? []), slot]);
  });
  return Array.from(groups, ([date, daySlots]) => ({
    date,
    weekday: WEEKDAYS_SHORT[isoWeekday(date) - 1].toUpperCase(),
    dayNumber: Number(date.split("-")[2]),
    slots: daySlots,
  }));
}

// "15:00–16:00"
export function slotTimeRange(slot: BookableSlot): string {
  return `${formatSlotTime(slot.startsAt)}–${formatSlotTime(slot.endsAt)}`;
}

export function turnsCount(count: number): string {
  return count === 1 ? "1 turno" : `${count} turnos`;
}

export function rehabPayNote(otherServiceLabels: string[]): string {
  return `Después de confirmar ${joinSpanish(otherServiceLabels)}, te llevamos a pagar este turno.`;
}

export function bookedTitle(count: number): string {
  return count === 1 ? "Turno reservado" : `${count} turnos reservados`;
}

const MAX_SUMMARY_DAYS = 3;

// "Lun 26, mar 27 y mié 28 · Performance"; only the services when there are more days or services.
export function bookedSummary(slots: BookableSlot[], labelOf: (service: ServiceType) => string): string {
  const services = [...new Set(slots.map((s) => s.service))];
  if (services.length > 1) return joinSpanish(services.map(labelOf));
  const days = groupByDay(slots);
  if (days.length > MAX_SUMMARY_DAYS) return labelOf(services[0]);
  const daysText = joinSpanish(days.map((day) => `${day.weekday.toLowerCase()} ${day.dayNumber}`));
  return `${daysText.charAt(0).toUpperCase()}${daysText.slice(1)} · ${labelOf(services[0])}`;
}

export function failedTitle(count: number): string {
  return count === 1 ? "1 turno no se pudo reservar" : `${count} turnos no se pudieron reservar`;
}

const UNKNOWN_TURN_LABEL = "Turno sin identificar";

// "Recovery · Mié 28 · 16:00"
export function failedTurnLabel(slot: BookableSlot, serviceLabel: string): string {
  const date = toBusinessDate(slot.startsAt);
  const weekday = WEEKDAYS_SHORT[isoWeekday(date) - 1];
  const day = Number(date.split("-")[2]);
  return `${serviceLabel} · ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} · ${formatSlotTime(slot.startsAt)}`;
}

export interface FailedGroup {
  code: string;
  reason: string;
  turns: string[];
}

interface FailedTurn {
  label: string;
  startsAt: string | null;
}

// A turn that could not be identified goes after the ones with a start.
function byTurnStart(a: FailedTurn, b: FailedTurn): number {
  if (a.startsAt === null || b.startsAt === null) return Number(a.startsAt === null) - Number(b.startsAt === null);
  return a.startsAt.localeCompare(b.startsAt);
}

// One group per failure code: the reason is told once, the turns are listed under it.
export function groupFailures(
  failed: FailedSlotDto[],
  slotsById: Map<string, BookableSlot>,
  labelOf: (service: ServiceType) => string,
): FailedGroup[] {
  const byCode = new Map<string, { reason: string; turns: FailedTurn[] }>();
  failed.forEach((failure) => {
    const slot = slotsById.get(failure.timeSlotId);
    const turn = slot
      ? { label: failedTurnLabel(slot, labelOf(slot.service)), startsAt: slot.startsAt }
      : { label: UNKNOWN_TURN_LABEL, startsAt: null };
    const group = byCode.get(failure.code) ?? { reason: failure.message, turns: [] };
    group.turns.push(turn);
    byCode.set(failure.code, group);
  });
  const groups = Array.from(byCode, ([code, { reason, turns }]) => ({ code, reason, turns: [...turns].sort(byTurnStart) }));
  return groups
    .sort((a, b) => byTurnStart(a.turns[0], b.turns[0]))
    .map(({ code, reason, turns }) => ({ code, reason, turns: turns.map((turn) => turn.label) }));
}
