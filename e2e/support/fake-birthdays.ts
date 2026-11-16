import type { BirthdaySettingsDto, TodayBirthdayDto, TodayBirthdaysDto } from "@/lib/api/types";

import { failure, type FakeResponse } from "./fake-checkout";
import { type BirthdayScenario, DEFAULT_OWNER, isStaffScenario } from "./scenarios";

const API_PREFIX = "/api/v1";
const SETTINGS_PATH = `${API_PREFIX}/staff/birthdays/settings`;
const TODAY_PATH = `${API_PREFIX}/staff/birthdays/today`;
const WHATSAPP_PATH = /^\/api\/v1\/staff\/birthdays\/today\/([^/]+)\/whatsapp$/;
const MONTEVIDEO_OFFSET_MS = 3 * 60 * 60 * 1000;

const UNAUTHENTICATED = failure(401, "UNAUTHENTICATED", "Tenés que iniciar sesión.");
const FORBIDDEN = failure(403, "FORBIDDEN", "No tenés permiso para esta acción.");
const BIRTHDAY_NOT_FOUND = failure(404, "BIRTHDAY_NOT_FOUND", "Ese cliente no cumple años hoy.");

// `staff-birthdays` signs in the staff with two birthdays today (one without phone); `staff-birthdays-empty`
// with none. `client-birthday` signs in a client whose birthday is today.
export const BIRTHDAY_SCENARIOS: readonly string[] = [
  "staff-birthdays",
  "staff-birthdays-empty",
  "client-birthday",
] satisfies BirthdayScenario[];

const DEFAULT_SETTINGS: BirthdaySettingsDto = {
  message:
    "Hoy queremos celebrarte. Gracias por entrenar con nosotros: que este nuevo año venga con muchos objetivos cumplidos.",
  emailEnabled: true,
  whatsappEnabled: true,
  sendHour: 9,
};

export function businessToday(): string {
  return new Date(Date.now() - MONTEVIDEO_OFFSET_MS).toISOString().slice(0, 10);
}

// Born in a leap year, so a 29th of February today is still a real birth date.
export function birthDateForToday(): string {
  return `1992-${businessToday().slice(5)}`;
}

function todaysClients(): TodayBirthdayDto[] {
  const age = Number(businessToday().slice(0, 4)) - 1992;
  return [
    {
      clientId: "bd-ana",
      name: "Ana",
      lastName: "Pérez",
      phone: "+59899123456",
      age,
      mailSentAt: new Date().toISOString(),
      whatsappOpenedAt: null,
    },
    { clientId: "bd-bruno", name: "Bruno", lastName: "Silva", phone: null, age, mailSentAt: null, whatsappOpenedAt: null },
  ];
}

interface BirthdaysState {
  settings: BirthdaySettingsDto;
  items: TodayBirthdayDto[];
}

function isSettings(body: unknown): body is BirthdaySettingsDto {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.message === "string" &&
    typeof candidate.emailEnabled === "boolean" &&
    typeof candidate.whatsappEnabled === "boolean" &&
    typeof candidate.sendHour === "number"
  );
}

// The staff birthday settings and today's list; kept per owner so parallel tests do not see each other's.
export function createBirthdaysStore(): {
  handle(method: string, url: URL, scenario: string | null, body: unknown, owner?: string): Promise<FakeResponse | null>;
} {
  const states = new Map<string, BirthdaysState>();

  function stateOf(scenario: string, owner: string): BirthdaysState {
    const key = `${owner}|${scenario}`;
    const existing = states.get(key);
    if (existing) return existing;
    const created = {
      settings: { ...DEFAULT_SETTINGS },
      items: scenario === "staff-birthdays" ? todaysClients() : [],
    };
    states.set(key, created);
    return created;
  }

  function respond(method: string, path: string, state: BirthdaysState, body: unknown): FakeResponse | null {
    if (path === SETTINGS_PATH && method === "GET") return { status: 200, body: state.settings };
    if (path === SETTINGS_PATH && method === "PUT") {
      if (!isSettings(body)) return failure(400, "VALIDATION_FAILED", "Revisá los datos.");
      state.settings = { ...body };
      return { status: 200, body: state.settings };
    }
    if (path === TODAY_PATH && method === "GET") {
      const today: TodayBirthdaysDto = { date: businessToday(), items: state.items };
      return { status: 200, body: today };
    }
    const match = WHATSAPP_PATH.exec(path);
    if (match && method === "POST") {
      const item = state.items.find((candidate) => candidate.clientId === match[1]);
      if (!item) return BIRTHDAY_NOT_FOUND;
      item.whatsappOpenedAt = new Date().toISOString();
      return { status: 200, body: item };
    }
    return null;
  }

  return {
    async handle(method, url, scenario, body, owner = DEFAULT_OWNER) {
      if (!url.pathname.startsWith(`${API_PREFIX}/staff/birthdays/`)) return null;
      if (!scenario) return UNAUTHENTICATED;
      if (!isStaffScenario(scenario)) return FORBIDDEN;
      return respond(method, url.pathname, stateOf(scenario, owner), body);
    },
  };
}
