import type { MySubscriptionsDto, ServiceType } from "@/lib/api/types";

export interface RepeatLimit {
  untilDate: string;
  // null = no cap on the number of slots.
  maxSlots: number | null;
}

type LimitRule = (subs: MySubscriptionsDto, lastBookableDate: string) => RepeatLimit | null;

function earliest(dates: string[]): string {
  return dates.reduce((min, date) => (date < min ? date : min));
}

function latest(dates: string[]): string {
  return dates.reduce((max, date) => (date > max ? date : max));
}

const performanceRule: LimitRule = (subs, lastBookableDate) => {
  const plans = [...(subs.performance ? [subs.performance] : []), ...subs.upcomingPerformances];
  if (plans.length === 0) return null;
  return { untilDate: earliest([latest(plans.map((p) => p.endsOn)), lastBookableDate]), maxSlots: null };
};

const recoveryRule: LimitRule = (subs, lastBookableDate) => {
  const packs = subs.recoveryPacks.filter((pack) => pack.sessionsLeft > 0);
  if (packs.length === 0) return null;
  return {
    untilDate: earliest([latest(packs.map((p) => p.endsOn)), lastBookableDate]),
    maxSlots: packs.reduce((total, pack) => total + pack.sessionsLeft, 0),
  };
};

const RULES: Record<ServiceType, LimitRule | null> = {
  performance: performanceRule,
  recovery: recoveryRule,
  rehab: null,
};

// null = the client can't repeat weekly (Rehab, no plan, or no sessions left).
export function repeatLimitFor(
  service: ServiceType,
  subs: MySubscriptionsDto | null,
  lastBookableDate: string,
): RepeatLimit | null {
  const rule = RULES[service];
  if (!rule || !subs) return null;
  return rule(subs, lastBookableDate);
}
