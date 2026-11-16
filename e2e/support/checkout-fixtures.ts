import type {
  BookableSlot,
  PlanDto,
  PurchaseStatusDto,
  ServiceType,
} from "@/lib/api/types";

export const E2E_PLAN_IDS = {
  mensual: "plan-mensual",
  trimestral: "plan-trimestral",
  semestral: "plan-semestral",
  recoverySingle: "plan-recovery-single",
  pack4: "plan-pack-4",
  pack8: "plan-pack-8",
  rehabEvaluation: "plan-rehab-evaluation",
} as const;

const NO_PERIOD = {
  periodMonths: null,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: null,
};

export const E2E_PLANS = [
  {
    id: E2E_PLAN_IDS.mensual,
    slug: "mensual",
    service: "performance",
    kind: "period_plan",
    name: "Mensual",
    description: "Entrená todo el mes con acceso a todas las clases.",
    features: ["Acceso a todas las clases", "Seguimiento mensual"],
    price: 3900,
    featured: false,
    autoDebitEnabled: true,
    ...NO_PERIOD,
    periodMonths: 1,
  },
  {
    id: E2E_PLAN_IDS.trimestral,
    slug: "trimestral",
    service: "performance",
    kind: "period_plan",
    name: "Trimestral",
    description: "Tres meses de entrenamiento con un precio más bajo.",
    features: ["Acceso a todas las clases", "Seguimiento trimestral"],
    price: 10500,
    featured: true,
    autoDebitEnabled: false,
    ...NO_PERIOD,
    periodMonths: 3,
  },
  {
    id: E2E_PLAN_IDS.semestral,
    slug: "semestral",
    service: "performance",
    kind: "period_plan",
    name: "Semestral",
    description: "Seis meses para sostener el hábito y ver resultados.",
    features: ["Acceso a todas las clases", "Seguimiento semestral"],
    price: 19800,
    featured: false,
    autoDebitEnabled: false,
    ...NO_PERIOD,
    periodMonths: 6,
  },
  {
    id: E2E_PLAN_IDS.recoverySingle,
    slug: "recovery-single",
    service: "recovery",
    kind: "single_session",
    name: "Sesión individual",
    description: "Una sesión de recuperación cuando la necesites.",
    features: ["Sesión de 45 minutos", "Sin compromiso de permanencia"],
    price: 900,
    featured: false,
    autoDebitEnabled: false,
    ...NO_PERIOD,
    durationMinutes: 45,
  },
  {
    id: E2E_PLAN_IDS.pack4,
    slug: "pack-4",
    service: "recovery",
    kind: "session_pack",
    name: "Paquete 4 sesiones",
    description: "Cuatro sesiones de recuperación para usar en un mes.",
    features: ["4 sesiones de recuperación", "Vigencia de 30 días"],
    price: 3200,
    featured: true,
    autoDebitEnabled: true,
    ...NO_PERIOD,
    periodDays: 30,
    sessionsIncluded: 4,
  },
  {
    id: E2E_PLAN_IDS.pack8,
    slug: "pack-8",
    service: "recovery",
    kind: "session_pack",
    name: "Paquete 8 sesiones",
    description: "Ocho sesiones de recuperación para usar en un mes.",
    features: ["8 sesiones de recuperación", "Vigencia de 30 días"],
    price: 5900,
    featured: false,
    autoDebitEnabled: false,
    ...NO_PERIOD,
    periodDays: 30,
    sessionsIncluded: 8,
  },
  {
    id: E2E_PLAN_IDS.rehabEvaluation,
    slug: "rehab-evaluation",
    service: "rehab",
    kind: "evaluation",
    name: "Evaluación y Diagnóstico",
    description: "Una evaluación completa para definir tu plan de rehabilitación.",
    features: ["Evaluación de 60 minutos", "Diagnóstico y plan inicial"],
    price: 1800,
    featured: false,
    autoDebitEnabled: false,
    ...NO_PERIOD,
    durationMinutes: 60,
  },
] satisfies PlanDto[];

const SLOT_DURATION_MINUTES = 45;
const SLOT_CAPACITY = 4;
const SLOT_AVAILABLE = 3;
const MS_PER_MINUTE = 60_000;

export const SLOT_SUFFIX_OPEN = "1000";
export const SLOT_SUFFIX_FULL = "1100";

// 10:00 in Montevideo is 13:00 UTC; the full slot starts an hour later.
const SLOT_START_UTC_BY_SUFFIX: Record<string, string> = {
  [SLOT_SUFFIX_OPEN]: "T13:00:00.000Z",
  [SLOT_SUFFIX_FULL]: "T14:00:00.000Z",
};

export function slotStartsAt(date: string, suffix: string): string | null {
  const time = SLOT_START_UTC_BY_SUFFIX[suffix];
  return time ? `${date}${time}` : null;
}

function endsAtOf(startsAt: string): string {
  return new Date(
    new Date(startsAt).getTime() + SLOT_DURATION_MINUTES * MS_PER_MINUTE,
  ).toISOString();
}

export function e2eSlotsFor(service: ServiceType, date: string): BookableSlot[] {
  const openStart = `${date}${SLOT_START_UTC_BY_SUFFIX[SLOT_SUFFIX_OPEN]}`;
  const fullStart = `${date}${SLOT_START_UTC_BY_SUFFIX[SLOT_SUFFIX_FULL]}`;
  return [
    {
      id: `slot-${service}-${date}-${SLOT_SUFFIX_OPEN}`,
      service,
      startsAt: openStart,
      endsAt: endsAtOf(openStart),
      durationMinutes: SLOT_DURATION_MINUTES,
      capacity: SLOT_CAPACITY,
      available: SLOT_AVAILABLE,
      isFull: false,
      alreadyBooked: false,
    },
    {
      id: `slot-${service}-${date}-${SLOT_SUFFIX_FULL}`,
      service,
      startsAt: fullStart,
      endsAt: endsAtOf(fullStart),
      durationMinutes: SLOT_DURATION_MINUTES,
      capacity: SLOT_CAPACITY,
      available: 0,
      isFull: true,
      alreadyBooked: false,
    },
  ] satisfies BookableSlot[];
}

export type SeededRefName =
  | "approvedPlan"
  | "approvedBooking"
  | "needsAttention"
  | "rejectedBooking"
  | "expiredBooking"
  | "pendingPlan"
  | "statusError"
  | "simulatorOff"
  | "unknown";

export const CHECKOUT_REFS: Record<SeededRefName, string> = {
  approvedPlan: "a0000000-0000-4000-8000-000000000001",
  approvedBooking: "a0000000-0000-4000-8000-000000000002",
  needsAttention: "a0000000-0000-4000-8000-000000000003",
  rejectedBooking: "a0000000-0000-4000-8000-000000000004",
  expiredBooking: "a0000000-0000-4000-8000-000000000005",
  pendingPlan: "a0000000-0000-4000-8000-000000000006",
  statusError: "a0000000-0000-4000-8000-000000000007",
  simulatorOff: "a0000000-0000-4000-8000-000000000008",
  unknown: "a0000000-0000-4000-8000-000000000009",
};

export const SEEDED_PURCHASES = [
  {
    externalReference: CHECKOUT_REFS.approvedPlan,
    kind: "plan",
    status: "approved",
    itemName: "Trimestral",
    service: "performance",
    amount: 10500,
    currency: "UYU",
    planId: E2E_PLAN_IDS.trimestral,
    bookingId: null,
    startsAt: null,
    needsAttention: false,
    paymentStatus: null,
    paymentStatusDetail: null,
    paymentMethod: "mercado_pago",
    transferDetails: null,
  },
  {
    externalReference: CHECKOUT_REFS.approvedBooking,
    kind: "booking",
    status: "approved",
    itemName: "Evaluación y Diagnóstico",
    service: "rehab",
    amount: 1800,
    currency: "UYU",
    planId: E2E_PLAN_IDS.rehabEvaluation,
    bookingId: "booking-approved",
    startsAt: "2026-10-21T13:00:00.000Z",
    needsAttention: false,
    paymentStatus: null,
    paymentStatusDetail: null,
    paymentMethod: "mercado_pago",
    transferDetails: null,
  },
  {
    externalReference: CHECKOUT_REFS.needsAttention,
    kind: "plan",
    status: "approved",
    itemName: "Mensual",
    service: "performance",
    amount: 3900,
    currency: "UYU",
    planId: E2E_PLAN_IDS.mensual,
    bookingId: null,
    startsAt: null,
    needsAttention: true,
    paymentStatus: null,
    paymentStatusDetail: null,
    paymentMethod: "mercado_pago",
    transferDetails: null,
  },
  {
    externalReference: CHECKOUT_REFS.rejectedBooking,
    kind: "booking",
    status: "rejected",
    itemName: "Sesión individual",
    service: "recovery",
    amount: 900,
    currency: "UYU",
    planId: E2E_PLAN_IDS.recoverySingle,
    bookingId: "booking-rejected",
    startsAt: "2026-10-22T13:00:00.000Z",
    needsAttention: false,
    paymentStatus: null,
    paymentStatusDetail: null,
    paymentMethod: "mercado_pago",
    transferDetails: null,
  },
  {
    externalReference: CHECKOUT_REFS.expiredBooking,
    kind: "booking",
    status: "expired",
    itemName: "Evaluación y Diagnóstico",
    service: "rehab",
    amount: 1800,
    currency: "UYU",
    planId: E2E_PLAN_IDS.rehabEvaluation,
    bookingId: "booking-expired",
    startsAt: "2026-10-23T13:00:00.000Z",
    needsAttention: false,
    paymentStatus: null,
    paymentStatusDetail: null,
    paymentMethod: "mercado_pago",
    transferDetails: null,
  },
  {
    externalReference: CHECKOUT_REFS.pendingPlan,
    kind: "plan",
    status: "pending",
    itemName: "Mensual",
    service: "performance",
    amount: 3900,
    currency: "UYU",
    planId: E2E_PLAN_IDS.mensual,
    bookingId: null,
    startsAt: null,
    needsAttention: false,
    paymentStatus: null,
    paymentStatusDetail: null,
    paymentMethod: "mercado_pago",
    transferDetails: null,
  },
] satisfies PurchaseStatusDto[];
