// By path: this module is for server code and tests, and the auto-debits index is for client code.
import { frequencyLabel } from "@/features/auto-debits/frequency-label";
import { presentPlan } from "@/features/plans";
// Deep import on purpose: the subscriptions index also exports server-only code (next/headers).
// This module is for server code and tests only (it reaches the plans index); client
// components import `checkout-routes` and `business-time` by path instead.
import { dayAfter, formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import {
  AUTO_DEBIT_STATUSES,
  type AutoDebitDto,
  type BookableSlot,
  type FrequencyType,
  type MySubscriptionsDto,
  type OfflineOptionsDto,
  type PerformanceSubscriptionDto,
  type PlanDto,
  type PlanKind,
  type ServiceType,
} from "@/lib/api/types";
import { formatPrice } from "@/lib/money";

import { formatSlotDateTime } from "./business-time";
import { PAYMENT_MODES, type PaymentMode } from "./constants";
import { discountedPrice } from "./offline-price";

export { businessDateOf, formatSlotDateTime } from "./business-time";

export interface SummaryRow {
  label: string;
  value: string;
}

// The warning that the client already has a Performance plan: the new one starts the day after it ends.
export interface RenewalNoticeModel {
  title: string;
  rows: SummaryRow[];
}

export interface CheckoutSummaryModel {
  eyebrow: string;
  title: string | null;
  price: string;
  rows: SummaryRow[];
  features: string[];
  renewalNotice: RenewalNoticeModel | null;
  notes: string[];
  // The pending-payment hold of a paid booking; the minutes are a staff setting the client can't read.
  holdNotice: string | null;
}

// The price of a cash or transfer option: crossed out and discounted when staff has a discount on.
export interface OfflinePriceLine {
  full: string;
  discounted: string | null;
  percent: number | null;
}

export interface PaymentModeOption {
  value: PaymentMode;
  label: string;
  description: string | null;
  priceLine: OfflinePriceLine | null;
  // How the client pays: the second point of a cash or transfer option.
  howTo: string | null;
  transferDetails: string | null;
  // Why the option cannot be chosen right now. Null when it can.
  disabledReason: string | null;
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  performance: "Performance",
  rehab: "Rehab",
  recovery: "Recovery",
};

const PURCHASABLE_KINDS: readonly PlanKind[] = ["period_plan", "session_pack"];
const BOOKING_PLAN_KIND: Partial<Record<ServiceType, PlanKind>> = {
  rehab: "evaluation",
  recovery: "single_session",
};

const PACK_NOTE = "Las sesiones no usadas vencen al final del período.";
const HOLD_NOTICE = "Guardamos tu horario unos minutos mientras completás el pago.";

export function isPurchasablePlan(plan: PlanDto): boolean {
  return PURCHASABLE_KINDS.includes(plan.kind);
}

export function isSlotBookable(slot: BookableSlot, nowMs: number): boolean {
  return !slot.isFull && !slot.alreadyBooked && new Date(slot.startsAt).getTime() > nowMs;
}

export function pickBookingPlan(plans: PlanDto[], service: ServiceType): PlanDto | null {
  const kind = BOOKING_PLAN_KIND[service];
  return plans.find((plan) => plan.kind === kind) ?? null;
}

// A row whose number is null is left out.
function row(label: string, value: string | null): SummaryRow[] {
  return value === null ? [] : [{ label, value }];
}

// One entry per kind that can be bought as a plan; booking kinds have no plan rows.
const PLAN_ROWS: Record<PlanKind, (plan: PlanDto) => SummaryRow[]> = {
  period_plan: () => [],
  session_pack: (plan) => [
    ...row("Sesiones", plan.sessionsIncluded === null ? null : String(plan.sessionsIncluded)),
    ...row("Vigencia del paquete", plan.periodDays === null ? null : `${plan.periodDays} días`),
  ],
  single_session: () => [],
  evaluation: () => [],
};

// The Performance plan the client still has or is about to start: the last one queued, which is when a new one
// would begin; an expired one does not count.
function currentPerformance(subscriptions: MySubscriptionsDto | null): PerformanceSubscriptionDto | null {
  if (subscriptions === null) return null;

  const { upcomingPerformances, performance } = subscriptions;
  return upcomingPerformances.at(-1) ?? (performance?.status === "expired" ? null : performance);
}

function renewalNotice(plan: PlanDto, subscriptions: MySubscriptionsDto | null, planTitle: string): RenewalNoticeModel | null {
  if (plan.kind !== "period_plan") return null;

  const current = currentPerformance(subscriptions);
  if (current === null) return null;

  return {
    title: "Ya tenés un plan de Performance activo. El nuevo arranca cuando termina el actual, sin perder días.",
    rows: [
      { label: "Plan actual hasta", value: formatBusinessDate(current.endsOn) },
      { label: `${planTitle} desde`, value: formatBusinessDate(dayAfter(current.endsOn)) },
    ],
  };
}

const planNotes = (plan: PlanDto): string[] => (plan.kind === "session_pack" ? [PACK_NOTE] : []);

export function presentPlanCheckout(plan: PlanDto, subscriptions: MySubscriptionsDto | null): CheckoutSummaryModel {
  const card = presentPlan(plan);
  return {
    eyebrow: SERVICE_LABELS[plan.service],
    title: card.name,
    price: formatPrice(plan.price),
    rows: PLAN_ROWS[plan.kind](plan),
    features: plan.features,
    renewalNotice: renewalNotice(plan, subscriptions, card.name),
    notes: planNotes(plan),
    holdNotice: null,
  };
}

const DEBIT_FIRST_CHARGE_NOTE = "El primer cobro se hace cuando termina el último plan que ya pagaste.";

// How often the debit charges is the length of the plan: months for a period plan, days for a pack.
const PLAN_FREQUENCIES: Record<PlanKind, (plan: PlanDto) => { frequency: number | null; type: FrequencyType }> = {
  period_plan: (plan) => ({ frequency: plan.periodMonths, type: "months" }),
  session_pack: (plan) => ({ frequency: plan.periodDays, type: "days" }),
  single_session: () => ({ frequency: null, type: "days" }),
  evaluation: () => ({ frequency: null, type: "days" }),
};

function debitDescription(plan: PlanDto, subscriptions: MySubscriptionsDto | null): string {
  const { frequency, type } = PLAN_FREQUENCIES[plan.kind](plan);
  const cadence = frequency === null ? "" : ` ${frequencyLabel(frequency, type)}`;
  const waitsForCurrentPlan = plan.kind === "period_plan" && currentPerformance(subscriptions) !== null;

  return [
    `Se cobra automáticamente${cadence} con Mercado Pago. Podés cancelarlo cuando quieras desde tu perfil.`,
    ...(waitsForCurrentPlan ? [DEBIT_FIRST_CHARGE_NOTE] : []),
  ].join(" ");
}

const CASH_HOW_TO = "Pagás en MOVE";
// Also the line above the transfer details on the success screen.
export const TRANSFER_HOW_TO = "Transferís y mandás el comprobante a:";
// Disabled, the details are not shown, so there is nothing to point at.
const TRANSFER_DISABLED_HOW_TO = "Transferís y mandás el comprobante";

const mercadoPagoOption = (
  value: PaymentMode,
  label: string,
  description: string | null,
): PaymentModeOption => ({ value, label, description, priceLine: null, howTo: null, transferDetails: null, disabledReason: null });

// "1 cosa" / "2 cosas": the cap goes from 1 to 20.
export const unpaidThings = (count: number): string => (count === 1 ? "1 cosa" : `${count} cosas`);

const FULL_DISCOUNT = 100;

// With a 100 % discount a purchase costs nothing and the API settles it on the spot, so it is not a thing left unpaid.
function unpaidCapReason({ unpaid, discountPercent }: OfflineOptionsDto): string | null {
  if (discountPercent === FULL_DISCOUNT || unpaid.count < unpaid.limit) return null;

  return `Tenés ${unpaidThings(unpaid.count)} sin pagar en MOVE, que es el máximo. Pagalas en MOVE para volver a usar efectivo o transferencia.`;
}

function priceLine(price: number, discountPercent: number | null): OfflinePriceLine {
  return {
    full: formatPrice(price),
    discounted: discountPercent === null ? null : formatPrice(discountedPrice(price, discountPercent)),
    percent: discountPercent,
  };
}

function offlineOptions(price: number, offline: OfflineOptionsDto): PaymentModeOption[] {
  const disabledReason = unpaidCapReason(offline);
  const line = priceLine(price, offline.discountPercent);
  const cash: PaymentModeOption = {
    value: PAYMENT_MODES.CASH,
    label: "Efectivo",
    description: null,
    priceLine: line,
    howTo: CASH_HOW_TO,
    transferDetails: null,
    disabledReason,
  };
  if (offline.transferDetails === null) return [cash];

  const transfer: PaymentModeOption = {
    value: PAYMENT_MODES.TRANSFER,
    label: "Transferencia",
    description: null,
    priceLine: line,
    howTo: disabledReason === null ? TRANSFER_HOW_TO : TRANSFER_DISABLED_HOW_TO,
    transferDetails: disabledReason === null ? offline.transferDetails : null,
    disabledReason,
  };
  return [cash, transfer];
}

const singlePaymentOption = (plan: PlanDto): PaymentModeOption =>
  mercadoPagoOption(PAYMENT_MODES.ONE_TIME, "Pago único", `Con Mercado Pago · ${formatPrice(plan.price)}`);

// Without the offline options (the API failed) the checkout is what it was: the debit choice when the plan has one,
// and otherwise just one payment, so there are no options at all.
export function presentPaymentModes(
  plan: PlanDto,
  subscriptions: MySubscriptionsDto | null,
  offline: OfflineOptionsDto | null = null,
): PaymentModeOption[] {
  const debit = plan.autoDebitEnabled
    ? [mercadoPagoOption(PAYMENT_MODES.AUTO_DEBIT, "Débito automático", debitDescription(plan, subscriptions))]
    : [];

  if (offline === null) {
    return plan.autoDebitEnabled ? [mercadoPagoOption(PAYMENT_MODES.ONE_TIME, "Pago único", null), ...debit] : [];
  }
  return [singlePaymentOption(plan), ...debit, ...offlineOptions(plan.price, offline)];
}

// A paid booking (a loose session or an evaluation) has no debit: Mercado Pago, cash or transfer.
export function presentBookingPaymentModes(plan: PlanDto, offline: OfflineOptionsDto | null): PaymentModeOption[] {
  if (offline === null) return [];
  return [singlePaymentOption(plan), ...offlineOptions(plan.price, offline)];
}

// What the client keeps when buying by hand, and what is counted against the cap.
const OFFLINE_SUBJECTS: Record<PlanKind, { name: string; state: string; countsAsOne: boolean }> = {
  period_plan: { name: "plan", state: "activo", countsAsOne: true },
  session_pack: { name: "paquete", state: "activo", countsAsOne: true },
  single_session: { name: "turno", state: "reservado", countsAsOne: false },
  evaluation: { name: "turno", state: "reservado", countsAsOne: false },
};

/** A piece of a notice's sentence; the strong ones are what the client has to remember. */
export interface NoticeSegment {
  text: string;
  isStrong: boolean;
}

const segment = (text: string, isStrong = false): NoticeSegment => ({ text, isStrong });

// Under the plan, as in the mockup: bought by hand, it is yours at once, but only so many things can be left unpaid.
// Null when there is nothing to warn about: no options, or the client is already at the cap (the reason is shown).
export function presentOfflineNotice(plan: PlanDto, offline: OfflineOptionsDto | null): NoticeSegment[] | null {
  if (offline === null || offline.discountPercent === FULL_DISCOUNT || unpaidCapReason(offline) !== null) return null;

  const { name, state, countsAsOne } = OFFLINE_SUBJECTS[plan.kind];
  const counted = countsAsOne ? ` (el ${name} cuenta como una y cada turno que reserves, como otra)` : "";
  return [
    segment("Si elegís efectivo o transferencia", true),
    segment(`, tu ${name} queda ${state} ya, pero mientras no lo pagues en MOVE solo podés tener `),
    segment(`${unpaidThings(offline.unpaid.limit)} sin pagar`, true),
    segment(`${counted}.`),
  ];
}

const PERFORMANCE: ServiceType = "performance";

// The API refuses a second Performance purchase while a debit is authorized; this only saves the click.
// Recovery is not blocked: a pack can always be bought once, even with a Recovery debit.
export function isAutoDebitBlocked(plan: PlanDto, debits: AutoDebitDto[] | null): boolean {
  if (debits === null || plan.service !== PERFORMANCE) return false;
  return debits.some((debit) => debit.status === AUTO_DEBIT_STATUSES.AUTHORIZED && debit.service === PERFORMANCE);
}

export function presentBookingCheckout(plan: PlanDto, slot: BookableSlot): CheckoutSummaryModel {
  return {
    eyebrow: SERVICE_LABELS[slot.service],
    title: plan.name,
    price: formatPrice(plan.price),
    rows: [
      { label: "Fecha y hora", value: formatSlotDateTime(slot.startsAt) },
      { label: "Duración", value: `${plan.durationMinutes ?? slot.durationMinutes} min` },
    ],
    features: plan.features,
    renewalNotice: null,
    notes: [],
    holdNotice: HOLD_NOTICE,
  };
}
