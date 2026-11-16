import type { BookableSlot } from "@/lib/api/types";

export const BUSINESS_TZ = "America/Montevideo";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const TIME_FORMATTER = new Intl.DateTimeFormat("es-UY", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BUSINESS_TZ,
});

const HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: BUSINESS_TZ,
});

export function todayBusinessDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(new Date());
}

export function toBusinessDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(new Date(iso));
}

// 1 = Monday … 7 = Sunday.
export function isoWeekday(date: string): number {
  return ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

export function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

function toUtcDay(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

export function mondayOf(date: string): string {
  const isoWeekday = (new Date(toUtcDay(date)).getUTCDay() + 6) % 7;
  return addDaysToDate(date, -isoWeekday);
}

export interface DayInfo {
  date: string;
  dow: string;
  dayNumber: number;
  month: string;
  isToday: boolean;
}

export function dayInfo(date: string, today: string): DayInfo {
  const d = new Date(`${date}T12:00:00`);
  return {
    date,
    dow: DOW[d.getDay()],
    dayNumber: d.getDate(),
    month: MONTHS[d.getMonth()],
    isToday: date === today,
  };
}

export function formatSlotTime(iso: string): string {
  return TIME_FORMATTER.format(new Date(iso));
}

function localHour(iso: string): number {
  return Number(HOUR_FORMATTER.format(new Date(iso)));
}

export function isPastSlot(slot: BookableSlot): boolean {
  return new Date(slot.startsAt).getTime() <= Date.now();
}

export function isSlotSelectable(slot: BookableSlot): boolean {
  return !isPastSlot(slot) && !slot.isFull && !slot.alreadyBooked;
}

export function slotLabel(slot: BookableSlot): string {
  if (isPastSlot(slot)) return "Finalizado";
  if (slot.alreadyBooked) return "Ya reservado";
  if (slot.isFull) return "Completo";
  if (slot.capacity === 1) return "Disponible";
  if (slot.available === 1) return "Último lugar";
  return `${slot.available} lugares`;
}

export type OccupancyLevel = "low" | "medium" | "high" | "full";

// OCCUPANCY_MEDIUM_FROM is an assumption pending confirmation: the client only said "yellow up to 75%".
export const OCCUPANCY_MEDIUM_FROM = 0.5;
export const OCCUPANCY_HIGH_FROM = 0.76;

export function occupancyLevel(slot: BookableSlot): OccupancyLevel {
  if (slot.isFull) return "full";
  const occupied = slot.capacity > 0 ? 1 - slot.available / slot.capacity : 1;
  if (occupied >= OCCUPANCY_HIGH_FROM) return "high";
  if (occupied >= OCCUPANCY_MEDIUM_FROM) return "medium";
  return "low";
}

// Minutes shared by every slot, or null when they differ (or there are none).
export function commonDuration(slots: BookableSlot[]): number | null {
  const durations = new Set(slots.map((slot) => slot.durationMinutes));
  return durations.size === 1 ? Array.from(durations)[0] : null;
}

export interface DaySummary extends DayInfo {
  isClosed: boolean;
  freeCount: number;
  totalCount: number;
}

export function summarizeDay(date: string, today: string, slots: BookableSlot[]): DaySummary {
  const bookable = slots.filter((s) => !isPastSlot(s));
  return {
    ...dayInfo(date, today),
    isClosed: slots.length === 0,
    freeCount: bookable.filter((s) => isSlotSelectable(s)).length,
    totalCount: bookable.length,
  };
}

export interface SlotGroup {
  label: string;
  slots: BookableSlot[];
}

const DAYPARTS: { label: string; test: (hour: number) => boolean }[] = [
  { label: "Mañana", test: (h) => h < 12 },
  { label: "Tarde", test: (h) => h >= 12 && h < 18 },
  { label: "Noche", test: (h) => h >= 18 },
];

export function groupByDaypart(slots: BookableSlot[]): SlotGroup[] {
  return DAYPARTS.map(({ label, test }) => ({
    label,
    slots: slots.filter((s) => test(localHour(s.startsAt))),
  })).filter((group) => group.slots.length > 0);
}

export interface SlotCell {
  slot: BookableSlot;
  label: string;
  isSelectable: boolean;
  // Independent of `label` (which only describes capacity/occupancy): whether the user's
  // plan would cover this slot, in its own words — never overwrites the occupancy text.
  coverageLabel: string | null;
}

export interface SlotRow {
  time: string;
  cells: (SlotCell | null)[];
}

// Rehab is never entitlement-based — any slot of that service is always pay-per-visit.
const PAYS_PER_VISIT = "Pagás esta sesión";

/** What the user's plan says about a slot, independent of whether it has room (that's
 *  `label`/`isSelectable`'s job). Null when there is no eligibility data — an anonymous
 *  visitor on /reservar — which must read as "unknown", never "not covered". Shared by the
 *  slot grid (via `coverageLabel`) and the booking cart, so the wording never drifts. */
export function coverageText(eligibility: { covered: boolean | null; reason: string | null } | null | undefined): string | null {
  if (!eligibility) return null;
  if (eligibility.reason === "NOT_APPLICABLE") return PAYS_PER_VISIT;
  if (eligibility.covered) return "Incluido en tu plan";
  if (eligibility.reason === "PACKAGE_REQUIRED") return PAYS_PER_VISIT;
  if (eligibility.reason === "PLAN_REQUIRED") return "Requiere un plan";
  return null;
}

export function coverageLabel(slot: BookableSlot): string | null {
  return coverageText(slot.eligibility);
}

export function buildDesktopRows(
  weekSlots: BookableSlot[][],
  labelFor: (slot: BookableSlot) => string = slotLabel,
  hintFor: (slot: BookableSlot) => string | null = coverageLabel,
): SlotRow[] {
  const times = new Set<string>();
  weekSlots.forEach((daySlots) => daySlots.forEach((slot) => times.add(formatSlotTime(slot.startsAt))));
  return Array.from(times)
    .sort()
    .map((time) => ({
      time,
      cells: weekSlots.map((daySlots) => {
        const slot = daySlots.find((s) => formatSlotTime(s.startsAt) === time);
        if (!slot) return null;
        return {
          slot,
          label: labelFor(slot),
          isSelectable: isSlotSelectable(slot),
          coverageLabel: hintFor(slot),
        };
      }),
    }));
}
