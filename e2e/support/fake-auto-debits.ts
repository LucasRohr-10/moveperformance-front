import { randomUUID } from "node:crypto";

import type {
  AutoDebitCheckoutDto,
  AutoDebitDto,
  FrequencyType,
  PlanDto,
  PlanKind,
  SimulatedDebitAction,
} from "@/lib/api/types";

import { NEXT_CHARGE_ON, SEEDED_DEBITS } from "./auto-debit-fixtures";
import { E2E_PLANS } from "./checkout-fixtures";
import { failure, type FakeResponse, readString } from "./fake-checkout";
import { DEFAULT_OWNER, type AutoDebitScenario } from "./scenarios";

interface RequestContext {
  scenario: string | null;
  owner: string;
  body: unknown;
  params: string[];
}

interface Route {
  method: string;
  pattern: RegExp;
  public: boolean;
  // null lets the next store answer: some routes are only partly this store's.
  respond: (context: RequestContext) => FakeResponse | null;
}

const API_PREFIX = "/api/v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEBIT_KINDS: readonly PlanKind[] = ["period_plan", "session_pack"];
const SIMULATED_ACTIONS: readonly SimulatedDebitAction[] = [
  "authorize",
  "charge_approved",
  "charge_rejected",
  "cancel",
];
const SCENARIO_PROVIDER_DOWN = "auto-debit-provider-down";

const UNAUTHENTICATED = failure(401, "UNAUTHENTICATED", "Tenés que iniciar sesión.");
const VALIDATION_FAILED = failure(400, "VALIDATION_FAILED", "Los datos enviados no son válidos.");
const PLAN_NOT_FOUND = failure(404, "PLAN_NOT_FOUND", "El plan no existe.");
const PLAN_KIND_INVALID = failure(409, "PLAN_KIND_INVALID", "El tipo de plan no es válido para esta operación.");
const AUTO_DEBIT_NOT_ALLOWED = failure(409, "AUTO_DEBIT_NOT_ALLOWED", "Este plan no se puede pagar con débito automático.");
const AUTO_DEBIT_ACTIVE = failure(409, "AUTO_DEBIT_ACTIVE", "Ya tenés un débito automático activo para este servicio.");
const AUTO_DEBIT_NOT_FOUND = failure(404, "AUTO_DEBIT_NOT_FOUND", "El débito automático no existe.");
const PROVIDER_ERROR = failure(
  502,
  "PAYMENT_PROVIDER_ERROR",
  "No pudimos comunicarnos con Mercado Pago. Probá de nuevo en unos minutos.",
);

function isAutoDebitScenario(scenario: string | null): scenario is AutoDebitScenario {
  return scenario !== null && Object.hasOwn(SEEDED_DEBITS, scenario);
}

function seededFor(scenario: string | null): AutoDebitDto[] {
  return isAutoDebitScenario(scenario) ? SEEDED_DEBITS[scenario] : [];
}

// The cycle of the debit is the length of the plan: months for a period plan, days for a pack.
function cycleOf(plan: PlanDto): { frequency: number; frequencyType: FrequencyType } {
  if (plan.kind === "session_pack") return { frequency: plan.periodDays ?? 30, frequencyType: "days" };
  return { frequency: plan.periodMonths ?? 1, frequencyType: "months" };
}

function cancelled(debit: AutoDebitDto, cancelReason: "client" | "provider"): AutoDebitDto {
  return { ...debit, status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason };
}

// Handles the debit routes of the contract, apart from the plans ones, which `fake-checkout` serves.
export function createAutoDebitStore(webOrigin: string): {
  handle(
    method: string,
    url: URL,
    scenario: string | null,
    body: unknown,
    owner?: string,
  ): Promise<FakeResponse | null>;
} {
  // By reference, and kept for the life of the fake API; `ownerOf` tells whose each one is.
  const created = new Map<string, AutoDebitDto>();
  const ownerOf = new Map<string, string>();
  // Seeded debits cannot change in place (they are fixtures), so a cancelled one is kept apart: `owner|id`.
  const cancelledSeeded = new Map<string, AutoDebitDto>();

  function debitsOf({ scenario, owner }: Pick<RequestContext, "scenario" | "owner">): AutoDebitDto[] {
    const seeded = seededFor(scenario).map((debit) => cancelledSeeded.get(`${owner}|${debit.id}`) ?? debit);
    const own = [...created.values()].filter((debit) => ownerOf.get(debit.externalReference) === owner);
    return [...seeded, ...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function hasAuthorized(context: Pick<RequestContext, "scenario" | "owner">, service: AutoDebitDto["service"]): boolean {
    return debitsOf(context).some((debit) => debit.service === service && debit.status === "authorized");
  }

  function findByReference(context: RequestContext, externalReference: string): AutoDebitDto | undefined {
    return created.get(externalReference) ?? debitsOf(context).find((debit) => debit.externalReference === externalReference);
  }

  function replace(debit: AutoDebitDto): void {
    if (created.has(debit.externalReference)) created.set(debit.externalReference, debit);
  }

  function list(context: RequestContext): FakeResponse {
    return { status: 200, body: debitsOf(context) };
  }

  function read(context: RequestContext): FakeResponse {
    const debit = findByReference(context, context.params[0]);
    return debit ? { status: 200, body: debit } : AUTO_DEBIT_NOT_FOUND;
  }

  // Checks run in the order of the back: unknown plan, wrong kind, not allowed, already active, provider.
  function start(context: RequestContext): FakeResponse {
    const planId = readString(context.body, "planId");
    if (!planId) return VALIDATION_FAILED;
    const plan = E2E_PLANS.find((candidate) => candidate.id === planId);
    if (!plan) return PLAN_NOT_FOUND;
    if (!DEBIT_KINDS.includes(plan.kind)) return PLAN_KIND_INVALID;
    if (!plan.autoDebitEnabled) return AUTO_DEBIT_NOT_ALLOWED;
    const service = plan.service === "recovery" ? "recovery" : "performance";
    if (hasAuthorized(context, service)) return AUTO_DEBIT_ACTIVE;
    if (context.scenario === SCENARIO_PROVIDER_DOWN) return PROVIDER_ERROR;

    const externalReference = randomUUID();
    const debit: AutoDebitDto = {
      id: randomUUID(),
      externalReference,
      planId: plan.id,
      planName: plan.name,
      service,
      status: "pending",
      amount: plan.price,
      currency: "UYU",
      ...cycleOf(plan),
      nextChargeOn: null,
      createdAt: new Date().toISOString(),
      cancelledAt: null,
      cancelReason: null,
    };
    created.set(externalReference, debit);
    ownerOf.set(externalReference, context.owner);
    const body: AutoDebitCheckoutDto = {
      externalReference,
      redirectUrl: `${webOrigin}/checkout/simulado?debito=${externalReference}`,
    };
    return { status: 201, body };
  }

  // A purchase of Performance is also refused while a debit is authorized; any other one is the checkout store's.
  function guardPlanCheckout(context: RequestContext): FakeResponse | null {
    const planId = readString(context.body, "planId");
    const plan = E2E_PLANS.find((candidate) => candidate.id === planId);
    if (plan?.service === "performance" && hasAuthorized(context, "performance")) return AUTO_DEBIT_ACTIVE;
    return null;
  }

  function cancelDebit(context: RequestContext): FakeResponse {
    const [id] = context.params;
    const seeded = seededFor(context.scenario).find((debit) => debit.id === id);
    const own = [...created.values()].find(
      (debit) => debit.id === id && ownerOf.get(debit.externalReference) === context.owner,
    );
    const debit = own ?? seeded;
    if (!debit) return AUTO_DEBIT_NOT_FOUND;
    if (context.scenario === SCENARIO_PROVIDER_DOWN) return PROVIDER_ERROR;

    const after = cancelled(debit, "client");
    if (own) replace(after);
    else cancelledSeeded.set(`${context.owner}|${debit.id}`, after);
    return { status: 200, body: after };
  }

  const simulatedActions: Record<SimulatedDebitAction, (debit: AutoDebitDto) => AutoDebitDto> = {
    authorize: (debit) => ({ ...debit, status: "authorized", nextChargeOn: NEXT_CHARGE_ON }),
    cancel: (debit) => cancelled(debit, "provider"),
    charge_approved: (debit) => debit,
    charge_rejected: (debit) => debit,
  };

  function simulate(context: RequestContext): FakeResponse {
    const externalReference = readString(context.body, "externalReference");
    const action = readString(context.body, "action");
    if (
      !externalReference ||
      !UUID_PATTERN.test(externalReference) ||
      !SIMULATED_ACTIONS.some((candidate) => candidate === action)
    ) {
      return VALIDATION_FAILED;
    }

    const debit = findByReference(context, externalReference);
    if (!debit) return AUTO_DEBIT_NOT_FOUND;

    const after = simulatedActions[action as SimulatedDebitAction](debit);
    replace(after);
    return { status: 200, body: after };
  }

  const routes: Route[] = [
    { method: "GET", pattern: /^\/me\/auto-debits$/, public: false, respond: list },
    { method: "POST", pattern: /^\/me\/auto-debits$/, public: false, respond: start },
    { method: "GET", pattern: /^\/me\/auto-debits\/([^/]+)$/, public: false, respond: read },
    { method: "DELETE", pattern: /^\/me\/auto-debits\/([^/]+)$/, public: false, respond: cancelDebit },
    { method: "POST", pattern: /^\/checkout\/plan$/, public: false, respond: guardPlanCheckout },
    { method: "POST", pattern: /^\/payments\/dev\/simulate-auto-debit$/, public: false, respond: simulate },
  ];

  return {
    async handle(method, url, scenario, body, owner = DEFAULT_OWNER) {
      if (!url.pathname.startsWith(`${API_PREFIX}/`)) return null;
      const path = url.pathname.slice(API_PREFIX.length);

      for (const route of routes) {
        const match = route.pattern.exec(path);
        if (route.method !== method || !match) continue;
        if (!route.public && !scenario) return UNAUTHENTICATED;
        const response = route.respond({ scenario, owner, body, params: match.slice(1) });
        if (response) return response;
      }
      return null;
    },
  };
}
