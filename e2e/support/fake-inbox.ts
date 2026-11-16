import { randomUUID } from "node:crypto";

import type { AnnouncementDto, InboxItemDto } from "@/lib/api/types";
import { INBOX_ITEM_SOURCES } from "@/lib/api/types";

import { failure, type FakeResponse, readString } from "./fake-checkout";
import { DEFAULT_OWNER, type InboxScenario, isStaffScenario } from "./scenarios";

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

const API_PREFIX = "/api/v1";
const SCENARIO_EMPTY = "inbox-empty";
const SCENARIO_MIXED = "inbox-mixed";
const SCENARIO_ERROR = "inbox-error";
// A cookie that starts with `staff` signs in the staff user.
const SCENARIO_ANNOUNCEMENTS = "staff-announcements-mixed";
const STAFF_NAME = "Lucía Gómez";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MONTEVIDEO_OFFSET_MS = 3 * HOUR_MS;

export const INBOX_SCENARIOS: readonly string[] = [
  SCENARIO_EMPTY,
  SCENARIO_MIXED,
  SCENARIO_ERROR,
] satisfies InboxScenario[];

const UNAUTHENTICATED = failure(401, "UNAUTHENTICATED", "Tenés que iniciar sesión.");
const FORBIDDEN = failure(403, "FORBIDDEN", "No tenés permiso para esta acción.");
const INTERNAL = failure(500, "INTERNAL", "Error interno.");
const INBOX_ITEM_NOT_FOUND = failure(404, "INBOX_ITEM_NOT_FOUND", "El aviso no existe.");
const ANNOUNCEMENT_NOT_FOUND = failure(404, "ANNOUNCEMENT_NOT_FOUND", "El comunicado no existe.");

function validationFailed(field: string, message: string): FakeResponse {
  return {
    status: 400,
    body: {
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: "Los datos enviados no son válidos.",
      details: [{ field, messages: [message] }],
    },
  };
}

// Today in Montevideo (UTC-3, no daylight saving) as YYYY-MM-DD.
function businessToday(): string {
  return new Date(Date.now() - MONTEVIDEO_OFFSET_MS).toISOString().slice(0, 10);
}

function businessDateAfter(days: number): string {
  return new Date(Date.now() - MONTEVIDEO_OFFSET_MS + days * DAY_MS).toISOString().slice(0, 10);
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

function notice(
  n: number,
  type: string,
  title: string,
  body: string,
  createdAt: string,
  action: InboxItemDto["action"],
  read: boolean,
): InboxItemDto {
  return {
    id: `notice:00000000-0000-4000-8000-00000000000${n}`,
    source: INBOX_ITEM_SOURCES.NOTICE,
    type,
    title,
    body,
    createdAt,
    readAt: read ? createdAt : null,
    action,
  };
}

// The seven kinds of the contract, newest first; three of them unread.
function mixedItems(): InboxItemDto[] {
  return [
    notice(
      1,
      "booking_cancelled_by_staff",
      "MOVE canceló tu turno",
      "Recovery · Miércoles 12 de noviembre · 09:00 a 09:45. Motivo: Mantenimiento de la sala. La sesión volvió a tu paquete.",
      hoursAgo(1),
      { label: "Reservar otro turno", href: "/bookings?service=recovery" },
      false,
    ),
    {
      id: "announcement:00000000-0000-4000-8000-0000000000a1",
      source: INBOX_ITEM_SOURCES.ANNOUNCEMENT,
      type: "announcement",
      title: "Comunicado de MOVE",
      body: "Esta semana 20% off en Recovery 🧊\nReservá desde la app hasta el viernes 31.",
      createdAt: hoursAgo(2),
      readAt: null,
      action: null,
    },
    notice(
      2,
      "auto_debit_charged",
      "Renovamos tu plan",
      "Cobramos $U 3.500 con tu débito automático. Tu plan Mensual · Performance va del 1 al 30 de noviembre.",
      hoursAgo(26),
      { label: "Ver mis pagos", href: "/history?tab=pagos" },
      false,
    ),
    notice(
      3,
      "payment_declined",
      "Tu pago no se aprobó",
      "Mercado Pago rechazó tu pago de Paquete 8 sesiones · Recovery. Podés intentar de nuevo.",
      hoursAgo(72),
      { label: "Ver mis pagos", href: "/history?tab=pagos" },
      true,
    ),
    notice(
      4,
      "booking_hold_expired",
      "Tu reserva no se confirmó",
      "No se completó el pago de Fisioterapia · Jueves 23 de octubre · 18:00 a 19:00, así que liberamos el lugar.",
      hoursAgo(96),
      { label: "Reservar de nuevo", href: "/bookings?service=rehab" },
      true,
    ),
    notice(
      5,
      "payment_approved_later",
      "Tu pago se aprobó",
      "Mercado Pago aprobó tu pago de Mensual · Performance. Tu plan ya está activo.",
      hoursAgo(120),
      { label: "Ver mis pagos", href: "/history?tab=pagos" },
      true,
    ),
    notice(
      6,
      "auto_debit_cancelled",
      "Se dio de baja tu débito automático",
      "Mercado Pago dio de baja el débito automático de Mensual · Performance. Tu plan ya no se renueva solo.",
      hoursAgo(144),
      { label: "Ver planes", href: "/plans" },
      true,
    ),
  ];
}

function announcement(
  n: number,
  body: string,
  visibleUntil: string,
  createdAt: string,
  createdByName: string,
  edited: { updatedAt: string; updatedByName: string } | null,
): AnnouncementDto {
  return {
    id: `00000000-0000-4000-8000-0000000000b${n}`,
    body,
    visibleUntil,
    createdAt,
    createdByName,
    updatedAt: edited?.updatedAt ?? createdAt,
    updatedByName: edited?.updatedByName ?? null,
  };
}

// Two active ones, and expired ones of two different months (September and October 2026 are always past).
function mixedAnnouncements(): AnnouncementDto[] {
  return [
    announcement(
      1,
      "Esta semana 20% off en Recovery 🧊\nReservá desde la app hasta el viernes.",
      businessDateAfter(3),
      hoursAgo(2),
      "Valentina",
      null,
    ),
    announcement(
      2,
      "El lunes abrimos de 8:00 a 14:00 por el feriado.",
      businessDateAfter(7),
      hoursAgo(50),
      "Leo",
      { updatedAt: hoursAgo(26), updatedByName: "Valentina" },
    ),
    announcement(3, "Nueva sala de Recovery: ya podés reservar las botas de compresión.", "2026-10-02", "2026-09-28T15:00:00.000Z", "Leo", null),
    announcement(4, "Cerramos el 15 de septiembre por mantenimiento.", "2026-09-15", "2026-09-08T15:00:00.000Z", "Valentina", null),
    announcement(5, "Llegaron los nuevos planes trimestrales con 10% de descuento.", "2026-09-30", "2026-09-01T15:00:00.000Z", "Leo", null),
  ];
}

interface InboxState {
  items: InboxItemDto[];
}

// What one test changes: kept per owner so tests running in parallel do not see each other's.
interface AnnouncementsState {
  announcements: AnnouncementDto[];
}

function isActive(item: AnnouncementDto): boolean {
  return item.visibleUntil >= businessToday();
}

function newestFirst(a: AnnouncementDto, b: AnnouncementDto): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function unreadCountOf(state: InboxState): number {
  return state.items.filter((item) => item.readAt === null).length;
}

// Handles the client inbox and the staff announcements of the contract. Any other signed-in scenario
// has an empty inbox and no announcements.
export function createInboxStore(): {
  handle(
    method: string,
    url: URL,
    scenario: string | null,
    body: unknown,
    owner?: string,
  ): Promise<FakeResponse | null>;
} {
  const inboxes = new Map<string, InboxState>();
  const announcementStates = new Map<string, AnnouncementsState>();

  function inboxOf({ scenario, owner }: Pick<RequestContext, "scenario" | "owner">): InboxState {
    const key = `${owner}|${scenario}`;
    const existing = inboxes.get(key);
    if (existing) return existing;
    const created: InboxState = { items: scenario === SCENARIO_MIXED ? mixedItems() : [] };
    inboxes.set(key, created);
    return created;
  }

  function announcementsOf({ scenario, owner }: Pick<RequestContext, "scenario" | "owner">): AnnouncementsState {
    const key = `${owner}|${scenario}`;
    const existing = announcementStates.get(key);
    if (existing) return existing;
    const created: AnnouncementsState = {
      announcements: scenario === SCENARIO_ANNOUNCEMENTS ? mixedAnnouncements() : [],
    };
    announcementStates.set(key, created);
    return created;
  }

  function readUnreadCount(context: RequestContext): FakeResponse {
    if (context.scenario === SCENARIO_ERROR) return INTERNAL;
    return { status: 200, body: { unreadCount: unreadCountOf(inboxOf(context)) } };
  }

  function readInbox(context: RequestContext): FakeResponse {
    if (context.scenario === SCENARIO_ERROR) return INTERNAL;
    const state = inboxOf(context);
    return { status: 200, body: { items: state.items, unreadCount: unreadCountOf(state) } };
  }

  function markRead(context: RequestContext): FakeResponse {
    const state = inboxOf(context);
    const id = decodeURIComponent(context.params[0]);
    const item = state.items.find((candidate) => candidate.id === id);
    if (!item) return INBOX_ITEM_NOT_FOUND;
    if (item.readAt === null) item.readAt = new Date().toISOString();
    return { status: 204, body: null };
  }

  function listAnnouncements(context: RequestContext): FakeResponse {
    const all = [...announcementsOf(context).announcements].sort(newestFirst);
    return { status: 200, body: { active: all.filter(isActive), expired: all.filter((a) => !isActive(a)) } };
  }

  function validateBody(value: string | null): FakeResponse | null {
    if (value === null) return validationFailed("body", "Escribí el mensaje.");
    if (value.trim().length === 0) return validationFailed("body", "Escribí el mensaje.");
    if (value.trim().length > 500) return validationFailed("body", "Máximo 500 caracteres.");
    return null;
  }

  function validateDate(value: string | null): FakeResponse | null {
    if (value === null) return validationFailed("visibleUntil", "Elegí una fecha.");
    if (value < businessToday()) return validationFailed("visibleUntil", "Elegí hoy o una fecha posterior.");
    return null;
  }

  function publish(context: RequestContext): FakeResponse {
    const body = readString(context.body, "body");
    const visibleUntil = readString(context.body, "visibleUntil");
    const invalid = validateBody(body) ?? validateDate(visibleUntil);
    if (invalid || body === null || visibleUntil === null) return invalid ?? INTERNAL;

    const now = new Date().toISOString();
    const created: AnnouncementDto = {
      id: randomUUID(),
      body: body.trim(),
      visibleUntil,
      createdAt: now,
      createdByName: STAFF_NAME,
      updatedAt: now,
      updatedByName: null,
    };
    announcementsOf(context).announcements.push(created);
    return { status: 201, body: created };
  }

  function edit(context: RequestContext): FakeResponse {
    const state = announcementsOf(context);
    const current = state.announcements.find((candidate) => candidate.id === context.params[0]);
    if (!current) return ANNOUNCEMENT_NOT_FOUND;

    const body = readString(context.body, "body");
    const visibleUntil = readString(context.body, "visibleUntil");
    const invalid =
      (body !== null ? validateBody(body) : null) ??
      (visibleUntil !== null && visibleUntil !== current.visibleUntil ? validateDate(visibleUntil) : null);
    if (invalid) return invalid;

    const after: AnnouncementDto = {
      ...current,
      body: body?.trim() ?? current.body,
      visibleUntil: visibleUntil ?? current.visibleUntil,
      updatedAt: new Date().toISOString(),
      updatedByName: STAFF_NAME,
    };
    state.announcements = state.announcements.map((candidate) => (candidate.id === after.id ? after : candidate));
    return { status: 200, body: after };
  }

  function remove(context: RequestContext): FakeResponse {
    const state = announcementsOf(context);
    if (!state.announcements.some((candidate) => candidate.id === context.params[0])) return ANNOUNCEMENT_NOT_FOUND;

    state.announcements = state.announcements.filter((candidate) => candidate.id !== context.params[0]);
    return { status: 204, body: null };
  }

  const routes: Route[] = [
    { method: "GET", pattern: /^\/me\/inbox\/unread-count$/, staffOnly: false, respond: readUnreadCount },
    { method: "GET", pattern: /^\/me\/inbox$/, staffOnly: false, respond: readInbox },
    { method: "POST", pattern: /^\/me\/inbox\/([^/]+)\/read$/, staffOnly: false, respond: markRead },
    { method: "GET", pattern: /^\/staff\/announcements$/, staffOnly: true, respond: listAnnouncements },
    { method: "POST", pattern: /^\/staff\/announcements$/, staffOnly: true, respond: publish },
    { method: "PATCH", pattern: /^\/staff\/announcements\/([^/]+)$/, staffOnly: true, respond: edit },
    { method: "DELETE", pattern: /^\/staff\/announcements\/([^/]+)$/, staffOnly: true, respond: remove },
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
