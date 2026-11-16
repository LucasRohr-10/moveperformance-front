import { randomUUID } from "node:crypto";

import type {
  AlertCountsDto,
  AlertDto,
  AlertType,
  CheckinAnswersDto,
  ClientDetail,
  ClientFollowupDto,
  ContactChannel,
  ContactDto,
  ContactOutcome,
  InactivityReason,
  InactivityReasonDto,
} from "@/lib/api/types";
import { ALERT_TYPES } from "@/lib/api/types";

import { failure, type FakeResponse, readString } from "./fake-checkout";
import { E2E_ALERTS, E2E_CHECKIN } from "./followup-fixtures";
import { DEFAULT_OWNER, isStaffScenario } from "./scenarios";

interface RequestContext {
  url: URL;
  scenario: string | null;
  owner: string;
  body: unknown;
  params: string[];
}

interface Route {
  method: string;
  pattern: RegExp;
  staffOnly: boolean;
  respond: (context: RequestContext) => FakeResponse;
}

// What one test changes: kept per owner so tests running in parallel do not see each other's.
interface FollowupState {
  alerts: AlertDto[];
  pauses: Map<string, InactivityReasonDto>;
  endedPauses: Map<string, InactivityReasonDto[]>;
  contactsOf: Map<string, ContactDto[]>;
  answeredCheckins: Set<string>;
}

const API_PREFIX = "/api/v1";
const SCENARIO_EMPTY = "staff-empty";
const SCENARIO_COUNTERS_DOWN = "staff-error";
const SCENARIO_CHECKIN_PENDING = "checkin-pending";
const STAFF_NAME = "Lucía Gómez";
// Alerts that make no sense while a client is paused: the back hands them in as handled (HANDLED_ON_PAUSE).
const HANDLED_ON_PAUSE: readonly AlertType[] = [
  ALERT_TYPES.NO_ATTENDANCE,
  ALERT_TYPES.PROLONGED_INACTIVITY,
  ALERT_TYPES.FREQUENCY_DROP,
  ALERT_TYPES.EXPIRING,
  ALERT_TYPES.EXPIRED,
];
// The alert types that mean a client may be lost (`GET /staff/alerts?group=risk`).
const RISK_ALERT_TYPES: readonly AlertType[] = [
  ALERT_TYPES.EXPIRED,
  ALERT_TYPES.PROLONGED_INACTIVITY,
  ALERT_TYPES.FREQUENCY_DROP,
  ALERT_TYPES.NO_ATTENDANCE,
  ALERT_TYPES.CHECKIN_PAIN,
];
const CHANNELS: readonly ContactChannel[] = ["phone", "whatsapp", "email", "in_person"];
const OUTCOMES: readonly ContactOutcome[] = ["reached", "no_answer", "left_message"];
const REASONS: readonly InactivityReason[] = [
  "injury",
  "vacation",
  "temporary_pause",
  "no_time",
  "moving",
  "return_later",
];

const UNAUTHENTICATED = failure(401, "UNAUTHENTICATED", "Tenés que iniciar sesión.");
const FORBIDDEN = failure(403, "FORBIDDEN", "No tenés permiso para esta acción.");
const VALIDATION_FAILED = failure(400, "VALIDATION_FAILED", "Los datos enviados no son válidos.");
const ALERT_NOT_FOUND = failure(404, "ALERT_NOT_FOUND", "La alerta no existe.");
const CLIENT_NOT_FOUND = failure(404, "CLIENT_NOT_FOUND", "El cliente no existe.");
const CONTACT_NOT_FOUND = failure(404, "CONTACT_NOT_FOUND", "El contacto no existe.");
const ALERT_ALREADY_HANDLED = failure(409, "ALERT_ALREADY_HANDLED", "Otra persona del equipo ya gestionó esta alerta.");
const PAUSE_ALREADY_ACTIVE = failure(409, "PAUSE_ALREADY_ACTIVE", "El cliente ya tiene una pausa activa.");
const NO_ACTIVE_PAUSE = failure(409, "NO_ACTIVE_PAUSE", "El cliente no tiene una pausa activa.");
const COUNTERS_DOWN = failure(500, "INTERNAL", "Error interno.");
const CHECKIN_NOT_FOUND = failure(404, "CHECKIN_NOT_FOUND", "El check-in no existe.");
const CHECKIN_ALREADY_ANSWERED = failure(409, "CHECKIN_ALREADY_ANSWERED", "Este check-in ya fue respondido.");

function isOneOf<T extends string>(options: readonly T[], value: string | null): value is T {
  return value !== null && options.some((option) => option === value);
}

function readOptionalString(body: unknown, key: string): string | undefined {
  return readString(body, key) ?? undefined;
}

function emptyCounts(): AlertCountsDto {
  const counts = { total: 0 } as AlertCountsDto;
  for (const type of Object.values(ALERT_TYPES)) counts[type] = 0;
  return counts;
}

function newState(scenario: string | null): FollowupState {
  const alerts = scenario === SCENARIO_EMPTY ? [] : structuredClone<AlertDto[]>(E2E_ALERTS);
  const pauses = new Map<string, InactivityReasonDto>();
  for (const alert of alerts) {
    if (!alert.pause) continue;
    pauses.set(alert.client.id, {
      id: `pause-${alert.client.id}`,
      reason: alert.pause.reason,
      note: null,
      recontactOn: alert.pause.recontactOn,
      startedAt: alert.pause.since,
      endedAt: null,
      createdByName: STAFF_NAME,
    });
  }
  return {
    alerts,
    pauses,
    endedPauses: new Map(),
    contactsOf: new Map(),
    answeredCheckins: new Set(),
  };
}

function toClientDetail(alert: AlertDto): ClientDetail {
  const [name, ...rest] = alert.client.name.split(" ");
  return {
    id: alert.client.id,
    name,
    lastName: rest.join(" ") || null,
    email: `${alert.client.id}@move.test`,
    phone: null,
    birthDate: null,
    age: null,
    clientSince: "2026-01-01T00:00:00.000Z",
    plan: null,
    paymentStatus: null,
    bookings: [],
    deactivation: null,
  };
}

function isCheckinAnswers(body: unknown): body is CheckinAnswersDto {
  const feeling = readString(body, "feeling");
  const pain = readString(body, "pain");
  const goals = readString(body, "goals");
  return (
    isOneOf(["struggling", "good", "very_good"], feeling) &&
    isOneOf(["none", "mild"], pain) &&
    isOneOf(["same", "adjust"], goals) &&
    (pain === "none" || readString(body, "painDetail") !== null)
  );
}

// Handles the follow-up and check-in routes of the contract, plus the client detail the history links to.
export function createFollowupStore(): {
  handle(
    method: string,
    url: URL,
    scenario: string | null,
    body: unknown,
    owner?: string,
  ): Promise<FakeResponse | null>;
} {
  const states = new Map<string, FollowupState>();

  function stateOf({ scenario, owner }: Pick<RequestContext, "scenario" | "owner">): FollowupState {
    const key = `${owner}|${scenario === SCENARIO_EMPTY ? SCENARIO_EMPTY : "staff"}`;
    const existing = states.get(key);
    if (existing) return existing;
    const created = newState(scenario);
    states.set(key, created);
    return created;
  }

  function checkinState(owner: string): FollowupState {
    return stateOf({ scenario: null, owner });
  }

  function openAlerts(context: RequestContext, type: string | null, riskOnly: boolean): AlertDto[] {
    return stateOf(context).alerts.filter(
      (alert) =>
        alert.status === "open" &&
        (type === null || alert.type === type) &&
        (!riskOnly || RISK_ALERT_TYPES.includes(alert.type)),
    );
  }

  function listAlerts(context: RequestContext): FakeResponse {
    const type = context.url.searchParams.get("type");
    if (type !== null && !isOneOf(Object.values<AlertType>(ALERT_TYPES), type)) return VALIDATION_FAILED;
    const group = context.url.searchParams.get("group");
    if (group !== null && group !== "risk") return VALIDATION_FAILED;
    return { status: 200, body: openAlerts(context, type, group === "risk") };
  }

  function countAlerts(context: RequestContext): FakeResponse {
    if (context.scenario === SCENARIO_COUNTERS_DOWN) return COUNTERS_DOWN;
    const counts = emptyCounts();
    for (const alert of openAlerts(context, null, false)) {
      counts[alert.type] += 1;
      counts.total += 1;
    }
    return { status: 200, body: counts };
  }

  function replaceAlert(state: FollowupState, after: AlertDto): void {
    state.alerts = state.alerts.map((alert) => (alert.id === after.id ? after : alert));
  }

  function handleAlert(context: RequestContext): FakeResponse {
    const state = stateOf(context);
    const alert = state.alerts.find((candidate) => candidate.id === context.params[0]);
    if (!alert) return ALERT_NOT_FOUND;
    if (alert.status === "handled") return ALERT_ALREADY_HANDLED;
    const after: AlertDto = { ...alert, status: "handled" };
    replaceAlert(state, after);
    return { status: 200, body: after };
  }

  function clientExists(state: FollowupState, clientId: string): boolean {
    return state.alerts.some((alert) => alert.client.id === clientId);
  }

  function recordContact(context: RequestContext): FakeResponse {
    const state = stateOf(context);
    const [clientId] = context.params;
    if (!clientExists(state, clientId)) return CLIENT_NOT_FOUND;
    const channel = readString(context.body, "channel");
    if (!isOneOf(CHANNELS, channel)) return VALIDATION_FAILED;
    // The outcome isn't known yet when the contact is just sent; it's filled in later via completeContact.
    const outcome = readString(context.body, "outcome");
    if (outcome !== null && !isOneOf(OUTCOMES, outcome)) return VALIDATION_FAILED;

    const alertId = readOptionalString(context.body, "alertId");
    const alert = alertId ? state.alerts.find((candidate) => candidate.id === alertId) : undefined;
    if (alertId && !alert) return ALERT_NOT_FOUND;

    const contact: ContactDto = {
      id: randomUUID(),
      channel,
      outcome: isOneOf(OUTCOMES, outcome) ? outcome : null,
      note: readOptionalString(context.body, "note") ?? null,
      staffName: STAFF_NAME,
      alertType: alert?.type ?? null,
      createdAt: new Date().toISOString(),
    };
    state.contactsOf.set(clientId, [contact, ...(state.contactsOf.get(clientId) ?? [])]);
    // A contact never closes the alert: it only counts as one more.
    for (const own of state.alerts.filter((candidate) => candidate.client.id === clientId)) {
      replaceAlert(state, { ...own, contactsCount: own.contactsCount + 1 });
    }
    return { status: 201, body: contact };
  }

  function completeContact(context: RequestContext): FakeResponse {
    const state = stateOf(context);
    const [clientId, contactId] = context.params;
    if (!clientExists(state, clientId)) return CLIENT_NOT_FOUND;
    const outcome = readString(context.body, "outcome");
    if (!isOneOf(OUTCOMES, outcome)) return VALIDATION_FAILED;

    const contacts = state.contactsOf.get(clientId) ?? [];
    const index = contacts.findIndex((candidate) => candidate.id === contactId);
    if (index === -1) return CONTACT_NOT_FOUND;

    const updated: ContactDto = {
      ...contacts[index],
      outcome,
      note: readOptionalString(context.body, "note") ?? contacts[index].note,
    };
    const next = [...contacts];
    next[index] = updated;
    state.contactsOf.set(clientId, next);
    return { status: 200, body: updated };
  }

  function startPause(context: RequestContext): FakeResponse {
    const state = stateOf(context);
    const [clientId] = context.params;
    if (!clientExists(state, clientId)) return CLIENT_NOT_FOUND;
    const reason = readString(context.body, "reason");
    if (!isOneOf(REASONS, reason)) return VALIDATION_FAILED;
    if (state.pauses.has(clientId)) return PAUSE_ALREADY_ACTIVE;

    const pause: InactivityReasonDto = {
      id: `pause-${clientId}-${(state.endedPauses.get(clientId)?.length ?? 0) + 1}`,
      reason,
      note: readOptionalString(context.body, "note") ?? null,
      recontactOn: readOptionalString(context.body, "recontactOn") ?? null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      createdByName: STAFF_NAME,
    };
    state.pauses.set(clientId, pause);
    for (const own of state.alerts) {
      if (own.client.id === clientId && own.status === "open" && HANDLED_ON_PAUSE.includes(own.type)) {
        replaceAlert(state, { ...own, status: "handled" });
      }
    }
    return { status: 201, body: pause };
  }

  function endPause(context: RequestContext): FakeResponse {
    const state = stateOf(context);
    const [clientId] = context.params;
    if (!clientExists(state, clientId)) return CLIENT_NOT_FOUND;
    const pause = state.pauses.get(clientId);
    if (!pause) return NO_ACTIVE_PAUSE;

    const ended: InactivityReasonDto = { ...pause, endedAt: new Date().toISOString() };
    state.pauses.delete(clientId);
    state.endedPauses.set(clientId, [ended, ...(state.endedPauses.get(clientId) ?? [])]);
    return { status: 200, body: ended };
  }

  function readFollowup(context: RequestContext): FakeResponse {
    const state = stateOf(context);
    const [clientId] = context.params;
    if (!clientExists(state, clientId)) return CLIENT_NOT_FOUND;
    const body: ClientFollowupDto = {
      pause: state.pauses.get(clientId) ?? null,
      pauses: state.endedPauses.get(clientId) ?? [],
      contacts: state.contactsOf.get(clientId) ?? [],
    };
    return { status: 200, body };
  }

  function readClient(context: RequestContext): FakeResponse {
    const alert = stateOf(context).alerts.find((candidate) => candidate.client.id === context.params[0]);
    return alert ? { status: 200, body: toClientDetail(alert) } : CLIENT_NOT_FOUND;
  }

  function pendingCheckin(context: RequestContext): FakeResponse {
    const answered = checkinState(context.owner).answeredCheckins.has(E2E_CHECKIN.id);
    const pending = context.scenario === SCENARIO_CHECKIN_PENDING && !answered;
    return { status: 200, body: { checkin: pending ? E2E_CHECKIN : null } };
  }

  function answerCheckin(context: RequestContext): FakeResponse {
    if (context.params[0] !== E2E_CHECKIN.id) return CHECKIN_NOT_FOUND;
    const state = checkinState(context.owner);
    if (state.answeredCheckins.has(E2E_CHECKIN.id)) return CHECKIN_ALREADY_ANSWERED;
    if (!isCheckinAnswers(context.body)) return VALIDATION_FAILED;

    state.answeredCheckins.add(E2E_CHECKIN.id);
    const flag = context.body.pain === "mild" ? "pain" : context.body.goals === "adjust" ? "goals" : "ok";
    return { status: 200, body: { flag } };
  }

  const routes: Route[] = [
    { method: "GET", pattern: /^\/staff\/alerts$/, staffOnly: true, respond: listAlerts },
    { method: "GET", pattern: /^\/staff\/alerts\/counts$/, staffOnly: true, respond: countAlerts },
    { method: "POST", pattern: /^\/staff\/alerts\/([^/]+)\/handle$/, staffOnly: true, respond: handleAlert },
    { method: "POST", pattern: /^\/staff\/clients\/([^/]+)\/contact$/, staffOnly: true, respond: recordContact },
    {
      method: "PATCH",
      pattern: /^\/staff\/clients\/([^/]+)\/contact\/([^/]+)$/,
      staffOnly: true,
      respond: completeContact,
    },
    { method: "POST", pattern: /^\/staff\/clients\/([^/]+)\/inactivity-reasons$/, staffOnly: true, respond: startPause },
    { method: "POST", pattern: /^\/staff\/clients\/([^/]+)\/inactivity-reasons\/end$/, staffOnly: true, respond: endPause },
    { method: "GET", pattern: /^\/staff\/clients\/([^/]+)\/followup$/, staffOnly: true, respond: readFollowup },
    { method: "GET", pattern: /^\/staff\/clients\/([^/]+)$/, staffOnly: true, respond: readClient },
    { method: "GET", pattern: /^\/me\/checkins\/pending$/, staffOnly: false, respond: pendingCheckin },
    { method: "POST", pattern: /^\/me\/checkins\/([^/]+)$/, staffOnly: false, respond: answerCheckin },
  ];

  return {
    async handle(method, url, scenario, body, owner = DEFAULT_OWNER) {
      if (!url.pathname.startsWith(`${API_PREFIX}/`)) return null;
      const path = url.pathname.slice(API_PREFIX.length);

      for (const route of routes) {
        const match = route.pattern.exec(path);
        if (route.method !== method || !match) continue;
        if (!scenario) return UNAUTHENTICATED;
        if (route.staffOnly && !isStaffScenario(scenario)) return FORBIDDEN;
        return route.respond({ url, scenario, owner, body, params: match.slice(1) });
      }
      return null;
    },
  };
}
