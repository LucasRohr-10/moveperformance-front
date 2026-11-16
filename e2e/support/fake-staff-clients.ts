import { randomUUID } from "node:crypto";

import type {
  ClientAccountStatus,
  ClientDetail,
  ClientPage,
  ClientRow,
  DeactivationPreview,
} from "@/lib/api/types";
import { CLIENT_ACCOUNT_STATUSES } from "@/lib/api/types";

import { failure, type FakeResponse, readString } from "./fake-checkout";
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
  respond: (context: RequestContext) => FakeResponse;
}

// What one test changes: kept per owner so tests running in parallel do not see each other's.
interface ClientsState {
  clients: ClientDetail[];
  previews: Map<string, DeactivationPreview>;
}

const API_PREFIX = "/api/v1";
// Answers the scenarios that start with this; any other `staff…` scenario falls through to the follow-up store.
const SCENARIO_PREFIX = "staff-clients";
const SCENARIO_PROVIDER_DOWN = "staff-clients-provider-down";
const STAFF_NAME = "Lucía Gómez";
const DEFAULT_PAGE_SIZE = 20;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const REASON_MAX_LENGTH = 240;
const BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

const EMAIL_TAKEN = "ana@move.test";
const EMAIL_UNCONFIRMED = "pendiente@move.test";

const VALIDATION_FAILED = failure(400, "VALIDATION_FAILED", "Los datos enviados no son válidos.");
const CLIENT_NOT_FOUND = failure(404, "CLIENT_NOT_FOUND", "El cliente no existe.");
const CLIENT_EMAIL_TAKEN = failure(409, "CLIENT_EMAIL_TAKEN", "Ya hay una cuenta con ese email.");
const CLIENT_EMAIL_UNCONFIRMED = failure(
  409,
  "CLIENT_EMAIL_UNCONFIRMED",
  "Ya hay un cliente con ese email que nunca confirmó su cuenta. Usá Cambiar clave desde su ficha para darle acceso.",
);
const CLIENT_ALREADY_DEACTIVATED = failure(409, "CLIENT_ALREADY_DEACTIVATED", "El cliente ya está dado de baja.");
const CLIENT_NOT_DEACTIVATED = failure(409, "CLIENT_NOT_DEACTIVATED", "El cliente no está dado de baja.");
const PAYMENT_PROVIDER_ERROR = failure(
  502,
  "PAYMENT_PROVIDER_ERROR",
  "No pudimos cancelar el débito automático en Mercado Pago.",
);

const NO_PREVIEW: DeactivationPreview = { upcomingBookings: 0, hasCurrentPlan: false, autoDebits: 0, recoverySessionsLeft: 0 };

function isOneOf<T extends string>(options: readonly T[], value: string | null): value is T {
  return value !== null && options.some((option) => option === value);
}

function ageOf(birthDate: string): number {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / MS_PER_YEAR);
}

function fullNameOf(client: ClientDetail): string {
  return `${client.name} ${client.lastName ?? ""}`.trim();
}

function toRow(client: ClientDetail): ClientRow {
  return {
    id: client.id,
    name: client.name,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    nextBookingAt: null,
    lastAttendanceStatus: null,
    deactivatedAt: client.deactivation?.deactivatedAt ?? null,
  };
}

function seedClient(fields: Pick<ClientDetail, "id" | "name" | "lastName" | "email"> & Partial<ClientDetail>): ClientDetail {
  return {
    phone: "+59899123456",
    birthDate: "1990-03-12",
    age: ageOf("1990-03-12"),
    clientSince: "2026-01-10T12:00:00.000Z",
    plan: null,
    paymentStatus: null,
    bookings: [],
    deactivation: null,
    ...fields,
  };
}

function newState(): ClientsState {
  const clients = [
    seedClient({
      id: "client-ana-gomez",
      name: "Ana",
      lastName: "Gómez",
      email: EMAIL_TAKEN,
      plan: { name: "Performance Mensual", endsOn: "2026-11-18" },
      paymentStatus: "up_to_date",
    }),
    seedClient({ id: "client-carla-pendiente", name: "Carla", lastName: "Pendiente", email: EMAIL_UNCONFIRMED }),
    seedClient({
      id: "client-diego-baja",
      name: "Diego",
      lastName: "Baja",
      email: "diego@move.test",
      plan: { name: "Performance Mensual", endsOn: "2026-11-18" },
      paymentStatus: "up_to_date",
      deactivation: {
        deactivatedAt: "2026-10-20T13:00:00.000Z",
        deactivatedByName: "Valentina Velásquez",
        reason: "Se mudó",
      },
    }),
  ];
  const previews = new Map<string, DeactivationPreview>([
    ["client-ana-gomez", { upcomingBookings: 2, hasCurrentPlan: true, autoDebits: 1, recoverySessionsLeft: 3 }],
  ]);
  return { clients, previews };
}

function isValidNewClient(body: unknown): boolean {
  const password = typeof body === "object" && body !== null && "password" in body ? body.password : null;
  const birthDate = readString(body, "birthDate");
  return (
    readString(body, "name") !== null &&
    readString(body, "lastName") !== null &&
    (readString(body, "email")?.includes("@") ?? false) &&
    (readString(body, "phone")?.startsWith("+") ?? false) &&
    birthDate !== null &&
    BIRTH_DATE_PATTERN.test(birthDate) &&
    typeof password === "string" &&
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH
  );
}

// Handles the staff clients routes of the contract: list, create, edit, password, deactivation and reactivation.
export function createStaffClientsStore(): {
  handle(
    method: string,
    url: URL,
    scenario: string | null,
    body: unknown,
    owner?: string,
  ): Promise<FakeResponse | null>;
} {
  const states = new Map<string, ClientsState>();

  function stateOf(owner: string): ClientsState {
    const existing = states.get(owner);
    if (existing) return existing;
    const created = newState();
    states.set(owner, created);
    return created;
  }

  function replace(state: ClientsState, after: ClientDetail): void {
    state.clients = state.clients.map((client) => (client.id === after.id ? after : client));
  }

  function listClients({ url, owner }: RequestContext): FakeResponse {
    const status = url.searchParams.get("status") ?? CLIENT_ACCOUNT_STATUSES.ACTIVE;
    if (!isOneOf<ClientAccountStatus>(Object.values(CLIENT_ACCOUNT_STATUSES), status)) return VALIDATION_FAILED;

    const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.max(1, Number(url.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE);
    const wantsDeactivated = status === CLIENT_ACCOUNT_STATUSES.DEACTIVATED;
    const wantsExpiringSoon = url.searchParams.get("expiringSoon") === "true";

    const matching = stateOf(owner)
      .clients.filter((client) => (client.deactivation !== null) === wantsDeactivated)
      // The back decides who is about to expire; the fake treats "has a plan" as that.
      .filter((client) => !wantsExpiringSoon || client.plan !== null)
      .filter((client) => `${fullNameOf(client)} ${client.email}`.toLowerCase().includes(query))
      .sort((a, b) => fullNameOf(a).localeCompare(fullNameOf(b)));
    const body: ClientPage = {
      items: matching.slice((page - 1) * pageSize, page * pageSize).map(toRow),
      total: matching.length,
      page,
      pageSize,
    };
    return { status: 200, body };
  }

  function findClient({ owner, params }: RequestContext): ClientDetail | undefined {
    return stateOf(owner).clients.find((client) => client.id === params[0]);
  }

  function readClient(context: RequestContext): FakeResponse {
    const client = findClient(context);
    return client ? { status: 200, body: client } : CLIENT_NOT_FOUND;
  }

  function readFollowup(context: RequestContext): FakeResponse {
    return findClient(context) ? { status: 200, body: { pause: null, pauses: [], contacts: [] } } : CLIENT_NOT_FOUND;
  }

  function createClient(context: RequestContext): FakeResponse {
    if (!isValidNewClient(context.body)) return VALIDATION_FAILED;
    const email = readString(context.body, "email")!.trim().toLowerCase();
    if (email === EMAIL_UNCONFIRMED) return CLIENT_EMAIL_UNCONFIRMED;
    const state = stateOf(context.owner);
    if (email === EMAIL_TAKEN || state.clients.some((client) => client.email === email)) return CLIENT_EMAIL_TAKEN;

    const birthDate = readString(context.body, "birthDate")!;
    const created = seedClient({
      id: `client-${randomUUID()}`,
      name: readString(context.body, "name")!.trim(),
      lastName: readString(context.body, "lastName")!.trim(),
      email,
      phone: readString(context.body, "phone"),
      birthDate,
      age: ageOf(birthDate),
      clientSince: new Date().toISOString(),
    });
    state.clients = [...state.clients, created];
    return { status: 201, body: created };
  }

  function editClient(context: RequestContext): FakeResponse {
    const client = findClient(context);
    if (!client) return CLIENT_NOT_FOUND;
    const birthDate = readString(context.body, "birthDate");
    if (birthDate !== null && !BIRTH_DATE_PATTERN.test(birthDate)) return VALIDATION_FAILED;

    const after: ClientDetail = {
      ...client,
      name: readString(context.body, "name")?.trim() ?? client.name,
      lastName: readString(context.body, "lastName")?.trim() ?? client.lastName,
      phone: readString(context.body, "phone") ?? client.phone,
      birthDate: birthDate ?? client.birthDate,
      age: birthDate ? ageOf(birthDate) : client.age,
    };
    replace(stateOf(context.owner), after);
    return { status: 200, body: after };
  }

  function changePassword(context: RequestContext): FakeResponse {
    if (!findClient(context)) return CLIENT_NOT_FOUND;
    const password = typeof context.body === "object" && context.body !== null && "password" in context.body
      ? context.body.password
      : null;
    if (typeof password !== "string") return VALIDATION_FAILED;
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) return VALIDATION_FAILED;
    return { status: 204, body: null };
  }

  function previewDeactivation(context: RequestContext): FakeResponse {
    const client = findClient(context);
    if (!client) return CLIENT_NOT_FOUND;
    if (client.deactivation) return CLIENT_ALREADY_DEACTIVATED;
    return { status: 200, body: stateOf(context.owner).previews.get(client.id) ?? NO_PREVIEW };
  }

  function deactivate(context: RequestContext): FakeResponse {
    const client = findClient(context);
    if (!client) return CLIENT_NOT_FOUND;
    if (client.deactivation) return CLIENT_ALREADY_DEACTIVATED;
    if (context.scenario === SCENARIO_PROVIDER_DOWN) return PAYMENT_PROVIDER_ERROR;

    const reason = readString(context.body, "reason");
    if (reason !== null && reason.length > REASON_MAX_LENGTH) return VALIDATION_FAILED;
    const after: ClientDetail = {
      ...client,
      deactivation: { deactivatedAt: new Date().toISOString(), deactivatedByName: STAFF_NAME, reason },
    };
    replace(stateOf(context.owner), after);
    return { status: 200, body: after };
  }

  function reactivate(context: RequestContext): FakeResponse {
    const client = findClient(context);
    if (!client) return CLIENT_NOT_FOUND;
    if (!client.deactivation) return CLIENT_NOT_DEACTIVATED;

    const after: ClientDetail = { ...client, deactivation: null };
    replace(stateOf(context.owner), after);
    return { status: 200, body: after };
  }

  const routes: Route[] = [
    { method: "GET", pattern: /^\/staff\/clients$/, respond: listClients },
    { method: "POST", pattern: /^\/staff\/clients$/, respond: createClient },
    { method: "GET", pattern: /^\/staff\/clients\/([^/]+)$/, respond: readClient },
    { method: "PATCH", pattern: /^\/staff\/clients\/([^/]+)$/, respond: editClient },
    { method: "GET", pattern: /^\/staff\/clients\/([^/]+)\/followup$/, respond: readFollowup },
    { method: "PUT", pattern: /^\/staff\/clients\/([^/]+)\/password$/, respond: changePassword },
    { method: "GET", pattern: /^\/staff\/clients\/([^/]+)\/deactivation-preview$/, respond: previewDeactivation },
    { method: "POST", pattern: /^\/staff\/clients\/([^/]+)\/deactivate$/, respond: deactivate },
    { method: "POST", pattern: /^\/staff\/clients\/([^/]+)\/reactivate$/, respond: reactivate },
  ];

  return {
    async handle(method, url, scenario, body, owner = DEFAULT_OWNER) {
      if (!scenario?.startsWith(SCENARIO_PREFIX) || !isStaffScenario(scenario)) return null;
      if (!url.pathname.startsWith(`${API_PREFIX}/`)) return null;
      const path = url.pathname.slice(API_PREFIX.length);

      for (const route of routes) {
        const match = route.pattern.exec(path);
        if (route.method !== method || !match) continue;
        return route.respond({ url, scenario, owner, body, params: match.slice(1) });
      }
      return null;
    },
  };
}
