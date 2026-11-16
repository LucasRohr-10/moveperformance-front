import { ROUTES } from "@/config/constants/routes.constants";
import { formatPrice } from "@/lib/money";
import type {
  AutoDebitDto,
  MySubscriptionsDto,
  OfflineOptionsDto,
  PerformanceSubscriptionDto,
  RecoveryPackDto,
  SubscriptionStatus,
} from "@/lib/api/types";

export type BadgeTone = "success" | "warning" | "danger" | "info";

export interface StatusBadgeModel {
  label: string;
  tone: BadgeTone;
}

// The current period of an active plan: the days left as the card's headline, and the bar between its two dates.
export interface PeriodProgressModel {
  percent: number;
  label: string;
  valueText: string;
  daysLeftValue: string;
  daysLeftCaption: string;
  // The days turn yellow when the plan is about to expire.
  daysLeftTone: "default" | "warning";
  startText: string;
  endText: string;
}

// A plan that is not current (scheduled or expired) shows a period line instead of the bar.
export interface PeriodLineModel {
  lead: string;
  emphasis: string;
}

export interface PerformancePlanModel {
  title: string;
  badge: StatusBadgeModel;
  progress: PeriodProgressModel | null;
  periodLine: PeriodLineModel | null;
  // Only a plan the API flags as about to expire offers to renew.
  renewal: RenewalModel | null;
  // Only an expired plan says what to do next; the link is optional so the copy can stand alone.
  expiredCta: ExpiredCtaModel | null;
  // Only a plan bought with cash or transfer and not paid yet says how to pay it.
  unpaidLine: string | null;
  // The raw business date, for the debit line, which formats it its own way.
  endsOn: string;
}

export interface UpcomingPlanModel {
  id: string;
  title: string;
  badge: StatusBadgeModel;
  periodText: string;
}

// One segment per session of the pack: the first `used` ones are filled, the rest are still to use.
export interface SessionSegmentsModel {
  total: number;
  used: number;
  label: string;
  valueText: string;
}

export interface RenewalModel {
  label: string;
  href: string;
}

export interface ExpiredCtaModel {
  text: string;
  link: RenewalModel | null;
}

export interface RecoveryPackModel {
  id: string;
  title: string;
  // Only an exception gets a badge: a pack with sessions left is the normal case.
  badge: StatusBadgeModel | null;
  sessionsLeftValue: string;
  sessionsTotalText: string;
  sessionsCaption: string;
  segments: SessionSegmentsModel;
  startText: string;
  // The days left and the date, in one line: it turns yellow when the pack is about to expire.
  endText: string;
  expiryTone: "default" | "warning";
  // Only a pack the API flags as about to expire offers to renew.
  renewal: RenewalModel | null;
  unpaidLine: string | null;
  endsOn: string;
}

export interface SubscriptionsModel {
  performance: PerformancePlanModel | null;
  upcoming: UpcomingPlanModel[];
  recoveryPacks: RecoveryPackModel[];
  isEmpty: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PLAN_NAME_PREFIX = "Plan";

// A plan in the queue was bought already: it starts on its own when the current one ends.
const UPCOMING_BADGE: StatusBadgeModel = { label: "Ya pagado", tone: "info" };

// The first queued plan waits for the current one; each later one waits for the plan queued before it.
const STARTS_AFTER_CURRENT = "cuando termina tu plan actual";
const STARTS_AFTER_PREVIOUS = "cuando termina el plan anterior";

const STATUS_BADGES: Record<SubscriptionStatus, StatusBadgeModel> = {
  active: { label: "Activo", tone: "success" },
  scheduled: { label: "Próximo", tone: "warning" },
  expired: { label: "Vencido", tone: "danger" },
};

// A plan or pack taken in cash or transfer is already usable, but it is not paid: it outranks the other badges.
const UNPAID_BADGE: StatusBadgeModel = { label: "Sin pagar", tone: "warning" };

const EXHAUSTED_PACK_BADGE: StatusBadgeModel = { label: "Sin sesiones", tone: "danger" };
const EXPIRING_BADGE: StatusBadgeModel = { label: "Por vencer", tone: "warning" };

const RENEWAL: RenewalModel = { label: "Renovar plan", href: ROUTES.PLANS };

const EXPIRED_CTA: ExpiredCtaModel = {
  text: "Tu plan venció. Elegí uno nuevo para seguir reservando.",
  link: { label: "Ver planes", href: ROUTES.PLANS },
};

// The lead text of the period line of a plan that is not current. The emphasised end date follows it.
const PERIOD_LEADS: Record<Exclude<SubscriptionStatus, "active">, (plan: PerformanceSubscriptionDto) => string> = {
  scheduled: (plan) => `Empieza el ${formatBusinessDate(plan.startsOn)} · vence el `,
  expired: () => "Venció el ",
};

// Contract dates are business dates in Montevideo: split the string instead of
// building a Date, which would read it in UTC or in the server's time zone.
export function formatBusinessDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

// The business date after `date`; Date.UTC keeps it independent of any time zone or daylight saving.
export function dayAfter(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function daysLeftText(daysLeft: number): string {
  if (daysLeft === 0) return "Vence hoy";
  if (daysLeft === 1) return "1 día restante";
  return `${daysLeft} días restantes`;
}

// The same count split in a big value and its caption, for the card's headline.
export function daysLeftHeadline(daysLeft: number): { value: string; caption: string } {
  if (daysLeft === 0) return { value: "Hoy", caption: "último día" };
  if (daysLeft === 1) return { value: "1", caption: "día restante" };
  return { value: String(daysLeft), caption: "días restantes" };
}

export function packExpiryText(daysLeft: number, endsOn: string): string {
  const date = formatBusinessDate(endsOn);
  if (daysLeft === 0) return `Vence hoy · ${date}`;
  if (daysLeft === 1) return `Vence en 1 día · ${date}`;
  return `Vence en ${daysLeft} días · ${date}`;
}

const clampPercent = (percent: number): number => Math.min(100, Math.max(0, percent));

// Date.UTC keeps the day count independent of any time zone or daylight saving.
const utcDay = (date: string): number => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

export function periodProgressPercent(startsOn: string, endsOn: string, daysLeft: number): number {
  const totalDays = Math.round((utcDay(endsOn) - utcDay(startsOn)) / MS_PER_DAY) + 1;
  const elapsedDays = totalDays - daysLeft;
  return clampPercent(Math.round((elapsedDays / totalDays) * 100));
}

// The catalog names period plans "Mensual", "Trimestral", "Semestral"; a name that
// already starts with "Plan" is shown as it is.
const planDisplayName = (planName: string): string =>
  planName.startsWith(PLAN_NAME_PREFIX) ? planName : `${PLAN_NAME_PREFIX} ${planName}`;

type UnpaidSummary = OfflineOptionsDto["unpaid"];

const pluralTurns = (count: number): string => `${count} ${count === 1 ? "turno" : "turnos"}`;

const turnsLeftText = ({ count, limit }: UnpaidSummary): string => {
  const left = limit - count;
  return left > 0 ? `podés reservar ${pluralTurns(left)} más` : "no podés reservar más turnos";
};

// The amount comes from the unpaid item of the same purchase; the turns left come from the cap. A plan that is not
// current (it already expired, or has not started) cannot book anything, so it promises no turns.
const presentUnpaidLine = (
  item: { purchaseId: string | null; awaitingPayment: boolean },
  unpaid: UnpaidSummary | undefined,
  canBook: boolean,
): string | null => {
  if (!item.awaitingPayment) return null;
  if (!unpaid) return "Pagalo en MOVE.";
  const amount = unpaid.items.find(({ kind, purchaseId }) => kind === "plan" && purchaseId === item.purchaseId)?.amount;
  const payLine = amount == null ? "Pagalo en MOVE." : `Pagalo en MOVE (${formatPrice(amount)}).`;
  return canBook ? `${payLine} Mientras tanto, ${turnsLeftText(unpaid)}.` : payLine;
};

const presentUpcoming = (plan: PerformanceSubscriptionDto, index: number): UpcomingPlanModel => ({
  id: plan.id,
  title: planDisplayName(plan.planName),
  badge: plan.awaitingPayment ? UNPAID_BADGE : UPCOMING_BADGE,
  periodText: `Empieza el ${formatBusinessDate(plan.startsOn)}, ${index === 0 ? STARTS_AFTER_CURRENT : STARTS_AFTER_PREVIOUS} · hasta ${formatBusinessDate(plan.endsOn)}`,
});

const presentProgress = (plan: PerformanceSubscriptionDto): PeriodProgressModel => {
  const headline = daysLeftHeadline(plan.daysLeft);
  return {
    percent: periodProgressPercent(plan.startsOn, plan.endsOn, plan.daysLeft),
    label: "Progreso del período",
    valueText: daysLeftText(plan.daysLeft),
    daysLeftValue: headline.value,
    daysLeftCaption: headline.caption,
    daysLeftTone: plan.expiringSoon ? "warning" : "default",
    startText: `Inicio ${formatBusinessDate(plan.startsOn)}`,
    endText: `Vence ${formatBusinessDate(plan.endsOn)}`,
  };
};

const renewalOf = (plan: PerformanceSubscriptionDto): RenewalModel | null =>
  plan.expiringSoon ? RENEWAL : null;

// "Sin pagar" outranks "Por vencer", but not what a plan is: an expired or not yet started plan keeps its own badge.
const performanceBadge = (plan: PerformanceSubscriptionDto): StatusBadgeModel =>
  plan.awaitingPayment && plan.status === "active" ? UNPAID_BADGE : plan.expiringSoon ? EXPIRING_BADGE : STATUS_BADGES[plan.status];

const presentPerformance = (
  plan: PerformanceSubscriptionDto,
  unpaid: UnpaidSummary | undefined,
): PerformancePlanModel => ({
  title: planDisplayName(plan.planName),
  badge: performanceBadge(plan),
  progress: plan.status === "active" ? presentProgress(plan) : null,
  periodLine:
    plan.status === "active"
      ? null
      : { lead: PERIOD_LEADS[plan.status](plan), emphasis: formatBusinessDate(plan.endsOn) },
  renewal: renewalOf(plan),
  expiredCta: plan.status === "expired" ? EXPIRED_CTA : null,
  unpaidLine: presentUnpaidLine(plan, unpaid, plan.status === "active"),
  endsOn: plan.endsOn,
});

// The expiring warning outranks "Sin sesiones": the API never flags a pack without sessions.
const packBadge = (pack: RecoveryPackDto, sessionsLeft: number): StatusBadgeModel | null => {
  if (pack.awaitingPayment) return UNPAID_BADGE;
  if (pack.expiringSoon) return EXPIRING_BADGE;
  return sessionsLeft > 0 ? null : EXHAUSTED_PACK_BADGE;
};

const presentPack = (pack: RecoveryPackDto, unpaid: UnpaidSummary | undefined): RecoveryPackModel => {
  // Caps old data where more sessions were used than the pack includes.
  const sessionsLeft = Math.min(Math.max(pack.sessionsLeft, 0), pack.sessionsTotal);
  const sessionsUsed = pack.sessionsTotal - sessionsLeft;
  return {
    id: pack.id,
    title: pack.planName,
    badge: packBadge(pack, sessionsLeft),
    sessionsLeftValue: String(sessionsLeft),
    sessionsTotalText: `de ${pack.sessionsTotal}`,
    sessionsCaption: sessionsLeft === 1 ? "sesión disponible" : "sesiones disponibles",
    segments: {
      total: pack.sessionsTotal,
      used: sessionsUsed,
      label: "Sesiones usadas",
      valueText: `${sessionsUsed} de ${pack.sessionsTotal} sesiones usadas`,
    },
    startText: `Comprado ${formatBusinessDate(pack.startsOn)}`,
    endText: packExpiryText(pack.daysLeft, pack.endsOn),
    expiryTone: pack.expiringSoon ? "warning" : "default",
    renewal: pack.expiringSoon ? RENEWAL : null,
    unpaidLine: presentUnpaidLine(pack, unpaid, true),
    endsOn: pack.endsOn,
  };
};

// A service an authorized debit renews on its own has nothing to warn about, whatever the back flags.
const withoutWarning = <T extends { expiringSoon: boolean }>(item: T): T => ({ ...item, expiringSoon: false });

// The checkout rejects a second Performance purchase while a debit is authorized, so an expired plan points nowhere.
const withoutExpiredCta = (model: PerformancePlanModel): PerformancePlanModel => ({ ...model, expiredCta: null });

export function presentSubscriptions(
  dto: MySubscriptionsDto,
  renewedByDebit: ReadonlySet<AutoDebitDto["service"]> = new Set(),
  unpaid?: UnpaidSummary,
): SubscriptionsModel {
  const performance = dto.performance && renewedByDebit.has("performance") ? withoutWarning(dto.performance) : dto.performance;
  const recoveryPacks = renewedByDebit.has("recovery") ? dto.recoveryPacks.map(withoutWarning) : dto.recoveryPacks;
  const performanceModel = performance ? presentPerformance(performance, unpaid) : null;
  return {
    performance: performanceModel && renewedByDebit.has("performance") ? withoutExpiredCta(performanceModel) : performanceModel,
    upcoming: dto.upcomingPerformances.map(presentUpcoming),
    recoveryPacks: recoveryPacks.map((pack) => presentPack(pack, unpaid)),
    isEmpty: dto.performance === null && dto.recoveryPacks.length === 0,
  };
}
