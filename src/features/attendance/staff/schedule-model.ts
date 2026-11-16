import { formatSlotTime } from "@/features/bookings/slots";
import type { DailySlot, ServiceType } from "@/lib/api/types";

export type LoadStatus = "loading" | "ready" | "error";
export type ServiceFilter = "all" | ServiceType;
export type ScheduleView = "grid" | "list";

// The grid always shows the three services as columns, in this order.
export const SERVICE_ORDER: ServiceType[] = ["performance", "rehab", "recovery"];

export const SERVICE_LABEL: Record<ServiceType, string> = {
  performance: "Performance",
  rehab: "Rehab",
  recovery: "Recovery",
};

export const SERVICE_FILTERS: { value: ServiceFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  ...SERVICE_ORDER.map((service) => ({ value: service, label: SERVICE_LABEL[service] })),
];

export interface ScheduleRow {
  time: string;
  // A slot of the row is in progress right now / every slot of the row already ended.
  isNow: boolean;
  isPast: boolean;
  slots: DailySlot[];
}

/** What the two views (desktop and mobile) share: the data and the actions on it. */
export interface DailySlotsViewProps {
  date: string;
  onChangeDate(date: string): void;
  filter: ServiceFilter;
  onChangeFilter(filter: ServiceFilter): void;
  rows: ScheduleRow[];
  status: LoadStatus;
  onRetry(): void;
}

export function visibleServices(filter: ServiceFilter): ServiceType[] {
  return filter === "all" ? SERVICE_ORDER : [filter];
}

/**
 * Slots grouped by start time, earliest first. `now` is only passed for today:
 * on any other day nothing is "now" and nothing is dimmed as past.
 */
export function buildScheduleRows(slots: DailySlot[], filter: ServiceFilter, now: number | null): ScheduleRow[] {
  const services = visibleServices(filter);
  const sorted = slots
    .filter((slot) => services.includes(slot.service))
    .sort(
      (a, b) =>
        Date.parse(a.startsAt) - Date.parse(b.startsAt) || SERVICE_ORDER.indexOf(a.service) - SERVICE_ORDER.indexOf(b.service),
    );

  const byTime = new Map<string, DailySlot[]>();
  for (const slot of sorted) {
    const time = formatSlotTime(slot.startsAt);
    byTime.set(time, [...(byTime.get(time) ?? []), slot]);
  }

  return Array.from(byTime, ([time, rowSlots]) => {
    const isNow =
      now !== null && rowSlots.some((slot) => Date.parse(slot.startsAt) <= now && now < Date.parse(slot.endsAt));
    const isPast = now !== null && !isNow && rowSlots.every((slot) => Date.parse(slot.endsAt) <= now);
    return { time, isNow, isPast, slots: rowSlots };
  });
}

export function occupancyPercent(slot: DailySlot): number {
  return slot.capacity > 0 ? Math.min(100, Math.round((slot.booked / slot.capacity) * 100)) : 0;
}

// A professional other than the template's, and only if staff set it: a template edit can also leave them apart.
export function coversSomeone(slot: DailySlot): boolean {
  return Boolean(
    slot.staffEditedAt && slot.templateProfessionalName && slot.professionalName !== slot.templateProfessionalName,
  );
}

/** Whether the slot reads as "taken" (solid card, filled bar) rather than empty (dashed). */
export function isBookedSlot(slot: DailySlot): boolean {
  return slot.booked > 0 && !slot.cancelledAt;
}

export function countLabel(slot: DailySlot): string {
  return slot.booked > 0 || slot.cancelledAt ? `${slot.booked}/${slot.capacity}` : "Sin reservas";
}
