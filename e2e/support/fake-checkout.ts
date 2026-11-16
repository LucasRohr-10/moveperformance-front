import { randomUUID } from "node:crypto";

import type { ApiErrorBody } from "@/lib/api/errors";
import type {
  BookingResponse,
  CheckoutResponseDto,
  PlanDto,
  PlanKind,
  PurchaseStatus,
  PurchaseStatusDto,
  ServiceType,
  SimulateOutcome,
  SimulatePaymentResponseDto,
} from "@/lib/api/types";

import {
  CHECKOUT_REFS,
  E2E_PLANS,
  SEEDED_PURCHASES,
  SLOT_SUFFIX_FULL,
  e2eSlotsFor,
  slotStartsAt,
} from "./checkout-fixtures";

export interface FakeResponse {
  status: number;
  body: unknown;
}

interface RequestContext {
  url: URL;
  scenario: string | null;
  body: unknown;
  params: string[];
}

interface Route {
  method: string;
  pattern: RegExp;
  public: boolean;
  respond: (context: RequestContext) => FakeResponse;
}

const HOLD_MINUTES = 15;
const MS_PER_MINUTE = 60_000;
const API_PREFIX = "/api/v1";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLOT_ID_PATTERN = /^slot-(performance|rehab|recovery)-(\d{4}-\d{2}-\d{2})-(\d{4})$/;
const SERVICES: readonly ServiceType[] = ["performance", "rehab", "recovery"];
const PAYABLE_STATUSES: readonly PurchaseStatus[] = ["pending", "expired"];
const PLAN_CHECKOUT_KINDS: readonly PlanKind[] = ["period_plan", "session_pack"];
const BOOKING_CHECKOUT_KINDS: readonly PlanKind[] = ["evaluation", "single_session"];

const PERFORMANCE_BOOKING_SCENARIOS = [
  "active",
  "active-last-day",
  "active-with-upcoming",
  "active-with-two-upcoming",
  "full",
  "long-name",
];
const RECOVERY_BOOKING_SCENARIOS = ["packs", "full", "long-name"];

const SCENARIO_PROVIDER_DOWN = "checkout-provider-down";
const SCENARIO_PLAN_INACTIVE = "checkout-plan-inactive";

export function failure(status: number, code: string, message: string): FakeResponse {
  const body: ApiErrorBody = { statusCode: status, code, message };
  return { status, body };
}

const UNAUTHENTICATED = failure(401, "UNAUTHENTICATED", "Tenés que iniciar sesión.");
const NOT_FOUND = failure(404, "NOT_FOUND", "No encontrado.");
const PURCHASE_NOT_FOUND = failure(404, "PURCHASE_NOT_FOUND", "No encontramos la compra.");
const PLAN_NOT_FOUND = failure(404, "PLAN_NOT_FOUND", "El plan no existe.");
const PLAN_KIND_INVALID = failure(
  400,
  "PLAN_KIND_INVALID",
  "El tipo de plan no es válido para esta operación.",
);
const PLAN_INACTIVE = failure(409, "PLAN_INACTIVE", "Este plan no está disponible.");
const PROVIDER_ERROR = failure(
  502,
  "PAYMENT_PROVIDER_ERROR",
  "No pudimos iniciar el pago. Probá de nuevo en unos minutos.",
);
const SLOT_FULL = failure(409, "SLOT_FULL", "No quedan cupos para este turno.");
const SLOT_NOT_FOUND = failure(404, "SLOT_NOT_FOUND", "El turno no existe.");
const VALIDATION_FAILED = failure(400, "VALIDATION_FAILED", "Los datos enviados no son válidos.");
const PLAN_REQUIRED = failure(
  409,
  "PLAN_REQUIRED",
  "Necesitás un plan activo para reservar este turno.",
);
const PACKAGE_REQUIRED = failure(
  409,
  "PACKAGE_REQUIRED",
  "Necesitás un paquete con sesiones disponibles para reservar este turno.",
);
const REHAB_FOLLOWUP_NOT_ENABLED = failure(
  409,
  "REHAB_FOLLOWUP_NOT_ENABLED",
  "Esta cuenta no tiene habilitado el seguimiento de fisioterapia.",
);
const INTERNAL_ERROR = failure(500, "INTERNAL_ERROR", "Ocurrió un error inesperado.");

export const UNAUTHENTICATED_RESPONSE: FakeResponse = UNAUTHENTICATED;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readString(body: unknown, key: string): string | null {
  if (!isObject(body)) return null;
  const value = body[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isOneOf<T extends string>(options: readonly T[], value: string | null): value is T {
  return value !== null && options.some((option) => option === value);
}

function findPlan(planId: string): PlanDto | undefined {
  return E2E_PLANS.find((plan) => plan.id === planId);
}

// Checks run in the order of the back: unknown plan, wrong kind, inactive plan.
function checkPlan(
  planId: string,
  allowedKinds: readonly PlanKind[],
  scenario: string | null,
): { plan: PlanDto } | { error: FakeResponse } {
  const plan = findPlan(planId);
  if (!plan) return { error: PLAN_NOT_FOUND };
  if (!isOneOf(allowedKinds, plan.kind)) return { error: PLAN_KIND_INVALID };
  if (scenario === SCENARIO_PLAN_INACTIVE) return { error: PLAN_INACTIVE };
  return { plan };
}

function parseSlotId(
  timeSlotId: string,
): { service: ServiceType; date: string; suffix: string } | null {
  const match = SLOT_ID_PATTERN.exec(timeSlotId);
  if (!match) return null;
  const [, service, date, suffix] = match;
  return isOneOf(SERVICES, service) ? { service, date, suffix } : null;
}

function listSlots(url: URL): FakeResponse {
  const service = url.searchParams.get("service");
  const date = url.searchParams.get("date");
  if (!isOneOf(SERVICES, service) || date === null || !DATE_PATTERN.test(date)) {
    return VALIDATION_FAILED;
  }
  return { status: 200, body: e2eSlotsFor(service, date) };
}

function listPlans(url: URL): FakeResponse {
  const service = url.searchParams.get("service");
  const plans = service ? E2E_PLANS.filter((plan) => plan.service === service) : E2E_PLANS;
  return { status: 200, body: plans };
}

export function createCheckoutStore(webOrigin: string): {
  handle(
    method: string,
    url: URL,
    scenario: string | null,
    body: unknown,
  ): Promise<FakeResponse | null>;
} {
  const seeded = new Map<string, PurchaseStatusDto>(
    SEEDED_PURCHASES.map((purchase) => [purchase.externalReference, purchase]),
  );
  const created = new Map<string, PurchaseStatusDto>();

  function createdResponse(
    purchase: PurchaseStatusDto,
    holdExpiresAt: string | null,
  ): FakeResponse {
    const redirectUrl = `${webOrigin}/checkout/simulado?ref=${purchase.externalReference}`;
    const body: CheckoutResponseDto = {
      purchaseId: randomUUID(),
      externalReference: purchase.externalReference,
      redirectUrl,
      bookingId: purchase.bookingId,
      holdExpiresAt,
    };
    return { status: 201, body };
  }

  function newPurchase(
    plan: PlanDto,
    fields: Pick<PurchaseStatusDto, "externalReference" | "kind" | "bookingId" | "startsAt">,
  ): PurchaseStatusDto {
    const purchase: PurchaseStatusDto = {
      status: "pending",
      itemName: plan.name,
      service: plan.service,
      amount: plan.price,
      currency: "UYU",
      planId: plan.id,
      needsAttention: false,
      paymentStatus: null,
      paymentStatusDetail: null,
      paymentMethod: "mercado_pago",
      transferDetails: null,
      ...fields,
    };
    created.set(purchase.externalReference, purchase);
    return purchase;
  }

  function checkoutPlan({ scenario, body }: RequestContext): FakeResponse {
    const planId = readString(body, "planId");
    if (!planId) return VALIDATION_FAILED;
    const checked = checkPlan(planId, PLAN_CHECKOUT_KINDS, scenario);
    if ("error" in checked) return checked.error;
    if (scenario === SCENARIO_PROVIDER_DOWN) return PROVIDER_ERROR;

    const purchase = newPurchase(checked.plan, {
      externalReference: randomUUID(),
      kind: "plan",
      bookingId: null,
      startsAt: null,
    });
    return createdResponse(purchase, null);
  }

  function checkoutBooking({ scenario, body }: RequestContext): FakeResponse {
    const planId = readString(body, "planId");
    const timeSlotId = readString(body, "timeSlotId");
    if (!planId || !timeSlotId) return VALIDATION_FAILED;
    const checked = checkPlan(planId, BOOKING_CHECKOUT_KINDS, scenario);
    if ("error" in checked) return checked.error;

    const slot = parseSlotId(timeSlotId);
    const startsAt = slot ? slotStartsAt(slot.date, slot.suffix) : null;
    if (!slot || !startsAt) return SLOT_NOT_FOUND;
    if (slot.suffix === SLOT_SUFFIX_FULL) return SLOT_FULL;
    if (scenario === SCENARIO_PROVIDER_DOWN) return PROVIDER_ERROR;

    const externalReference = randomUUID();
    const purchase = newPurchase(checked.plan, {
      externalReference,
      kind: "booking",
      bookingId: `booking-${externalReference}`,
      startsAt,
    });
    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * MS_PER_MINUTE).toISOString();
    return createdResponse(purchase, holdExpiresAt);
  }

  function readPurchase({ params }: RequestContext): FakeResponse {
    const [ref] = params;
    if (ref === CHECKOUT_REFS.statusError) return INTERNAL_ERROR;
    const purchase = seeded.get(ref) ?? created.get(ref);
    return purchase ? { status: 200, body: purchase } : PURCHASE_NOT_FOUND;
  }

  // Like the back: a payment moves only an open purchase. An approval that cannot be applied
  // flags the purchase; a rejection closes a pending booking purchase and leaves a plan one pending.
  const paymentsByOutcome: Record<SimulateOutcome, (purchase: PurchaseStatusDto) => PurchaseStatusDto> = {
    approved: (purchase) =>
      PAYABLE_STATUSES.includes(purchase.status)
        ? { ...purchase, status: "approved" }
        : { ...purchase, needsAttention: true },
    rejected: (purchase) =>
      purchase.kind === "booking" && purchase.status === "pending"
        ? { ...purchase, status: "rejected" }
        : purchase,
  };

  function simulate({ body }: RequestContext): FakeResponse {
    const externalReference = readString(body, "externalReference");
    const outcome = readString(body, "outcome");
    if (
      !externalReference ||
      !UUID_PATTERN.test(externalReference) ||
      (outcome !== "approved" && outcome !== "rejected")
    ) {
      return VALIDATION_FAILED;
    }
    if (externalReference === CHECKOUT_REFS.simulatorOff) return NOT_FOUND;

    const seededPurchase = seeded.get(externalReference);
    const purchase = seededPurchase ?? created.get(externalReference);
    if (!purchase) return PURCHASE_NOT_FOUND;

    const after = seededPurchase ? purchase : paymentsByOutcome[outcome](purchase);
    if (!seededPurchase) created.set(externalReference, after);
    const response: SimulatePaymentResponseDto = { externalReference, status: after.status };
    return { status: 200, body: response };
  }

  function createBooking({ scenario, body }: RequestContext): FakeResponse {
    const timeSlotId = readString(body, "timeSlotId");
    const slot = timeSlotId ? parseSlotId(timeSlotId) : null;
    const startsAt = slot ? slotStartsAt(slot.date, slot.suffix) : null;
    if (!timeSlotId || !slot || !startsAt) return VALIDATION_FAILED;

    const bookingScenarios: Record<ServiceType, () => FakeResponse | "allowed"> = {
      performance: () =>
        PERFORMANCE_BOOKING_SCENARIOS.includes(scenario ?? "") ? "allowed" : PLAN_REQUIRED,
      recovery: () =>
        RECOVERY_BOOKING_SCENARIOS.includes(scenario ?? "") ? "allowed" : PACKAGE_REQUIRED,
      rehab: () => REHAB_FOLLOWUP_NOT_ENABLED,
    };
    const verdict = bookingScenarios[slot.service]();
    if (verdict !== "allowed") return verdict;

    const [openSlot] = e2eSlotsFor(slot.service, slot.date);
    const booking: BookingResponse = {
      id: `booking-${randomUUID()}`,
      timeSlotId,
      service: slot.service,
      startsAt,
      endsAt: new Date(
        new Date(startsAt).getTime() + openSlot.durationMinutes * MS_PER_MINUTE,
      ).toISOString(),
      durationMinutes: openSlot.durationMinutes,
      label: "Reserva confirmada",
      status: "confirmed",
      source: slot.service === "recovery" ? "package" : "plan",
      canCancel: true,
      cancelledAt: null,
    };
    return { status: 201, body: booking };
  }

  const routes: Route[] = [
    { method: "GET", pattern: /^\/plans$/, public: true, respond: ({ url }) => listPlans(url) },
    {
      method: "GET",
      pattern: /^\/bookings\/public-slots$/,
      public: true,
      respond: ({ url }) => listSlots(url),
    },
    {
      method: "GET",
      pattern: /^\/bookings\/slots$/,
      public: false,
      respond: ({ url }) => listSlots(url),
    },
    { method: "POST", pattern: /^\/bookings$/, public: false, respond: createBooking },
    { method: "POST", pattern: /^\/checkout\/plan$/, public: false, respond: checkoutPlan },
    { method: "POST", pattern: /^\/checkout\/booking$/, public: false, respond: checkoutBooking },
    {
      method: "GET",
      pattern: /^\/checkout\/purchases\/([^/]+)$/,
      public: false,
      respond: readPurchase,
    },
    { method: "POST", pattern: /^\/payments\/dev\/simulate$/, public: false, respond: simulate },
  ];

  return {
    async handle(method, url, scenario, body) {
      if (!url.pathname.startsWith(`${API_PREFIX}/`)) return null;
      const path = url.pathname.slice(API_PREFIX.length);

      for (const route of routes) {
        const match = route.pattern.exec(path);
        if (route.method !== method || !match) continue;
        if (!route.public && !scenario) return UNAUTHENTICATED;
        return route.respond({ url, scenario, body, params: match.slice(1) });
      }
      return null;
    },
  };
}
