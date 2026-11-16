import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { ACCOUNT_DEACTIVATED_CODE, type ApiErrorBody } from "@/lib/api/errors";
import type { MySubscriptionsDto } from "@/lib/api/types";

import { createAutoDebitStore } from "./fake-auto-debits";
import { BIRTHDAY_SCENARIOS, birthDateForToday, createBirthdaysStore } from "./fake-birthdays";
import {
  createCheckoutStore,
  UNAUTHENTICATED_RESPONSE,
} from "./fake-checkout";
import { createDashboardStore } from "./fake-dashboard";
import { createFollowupStore } from "./fake-followup";
import { createOfflineChargesStore, OFFLINE_PAID_SCENARIOS } from "./fake-offline-charges";
import { createStaffClientsStore } from "./fake-staff-clients";
import { createInboxStore, INBOX_SCENARIOS } from "./fake-inbox";
import { ACTIVITY_SCENARIOS, createActivityStore } from "./fake-activity";
import { createPaymentHistoryStore, PAYMENT_HISTORY_SCENARIOS } from "./fake-payment-history";
import {
  type AutoDebitScenario,
  DEFAULT_OWNER,
  E2E_CLIENT,
  E2E_STAFF,
  isStaffScenario,
  OWNER_COOKIE,
  SCENARIO_COOKIE,
  SCENARIOS,
  SLOW_RESPONSE_MS,
  type ScenarioName,
  type SpecialScenario,
} from "./scenarios";

const INTERNAL: ApiErrorBody = {
  statusCode: 500,
  code: "INTERNAL",
  message: "Error interno.",
};

const NOT_FOUND: ApiErrorBody = {
  statusCode: 404,
  code: "NOT_FOUND",
  message: "No encontrado.",
};

// A session that stayed open after the account was deactivated.
const DEACTIVATED: ApiErrorBody = {
  statusCode: 403,
  code: ACCOUNT_DEACTIVATED_CODE,
  message: "Tu cuenta está desactivada. Escribile a MOVE para reactivarla.",
};

const CHECKOUT_SCENARIOS: readonly string[] = [
  "checkout-provider-down",
  "checkout-plan-inactive",
] satisfies SpecialScenario[];

// What the profile shows in each automatic debit scenario: the card the debit line lives in.
// The authorized debit is for the Mensual plan, which the API flags as about to expire.
const AUTO_DEBIT_SUBSCRIPTIONS: Record<AutoDebitScenario, ScenarioName> = {
  "auto-debit-active": "expiring",
  "auto-debit-pending": "packs",
  "auto-debit-provider-down": "active",
};

type CheckoutStore = ReturnType<typeof createCheckoutStore>;
type AutoDebitStore = ReturnType<typeof createAutoDebitStore>;
type StaffClientsStore = ReturnType<typeof createStaffClientsStore>;
type FollowupStore = ReturnType<typeof createFollowupStore>;
type PaymentHistoryStore = ReturnType<typeof createPaymentHistoryStore>;
type ActivityStore = ReturnType<typeof createActivityStore>;
type InboxStore = ReturnType<typeof createInboxStore>;
type BirthdaysStore = ReturnType<typeof createBirthdaysStore>;
type OfflineChargesStore = ReturnType<typeof createOfflineChargesStore>;
type DashboardStore = ReturnType<typeof createDashboardStore>;

function isScenarioName(value: string): value is ScenarioName {
  return Object.hasOwn(SCENARIOS, value);
}

function isAutoDebitScenario(value: string): value is AutoDebitScenario {
  return Object.hasOwn(AUTO_DEBIT_SUBSCRIPTIONS, value);
}

function readCookie(request: IncomingMessage, cookieName: string): string | null {
  const cookies = (request.headers.cookie ?? "").split(";");
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split("=");
    if (name === cookieName) return rest.join("=");
  }
  return null;
}

function sendJson(
  response: ServerResponse,
  webOrigin: string,
  status: number,
  body: unknown,
): void {
  // A 204 has no body (marking an inbox notice as read answers it).
  if (status === 204) {
    response.writeHead(status, {
      "Access-Control-Allow-Origin": webOrigin,
      "Access-Control-Allow-Credentials": "true",
    });
    response.end();
    return;
  }
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": webOrigin,
    "Access-Control-Allow-Credentials": "true",
  });
  response.end(JSON.stringify(body));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveSubscriptions(
  scenario: string,
): Promise<{ status: number; body: MySubscriptionsDto | ApiErrorBody }> {
  if (
    CHECKOUT_SCENARIOS.includes(scenario) ||
    PAYMENT_HISTORY_SCENARIOS.includes(scenario) ||
    ACTIVITY_SCENARIOS.includes(scenario) ||
    INBOX_SCENARIOS.includes(scenario) ||
    BIRTHDAY_SCENARIOS.includes(scenario) ||
    OFFLINE_PAID_SCENARIOS.includes(scenario) ||
    scenario === "checkin-pending"
  ) {
    return { status: 200, body: SCENARIOS.none };
  }
  if (isAutoDebitScenario(scenario)) {
    return { status: 200, body: SCENARIOS[AUTO_DEBIT_SUBSCRIPTIONS[scenario]] };
  }
  const special: SpecialScenario | null =
    scenario === "error" || scenario === "slow" ? scenario : null;

  if (special === "error") return { status: 500, body: INTERNAL };
  if (special === "slow") {
    await wait(SLOW_RESPONSE_MS);
    return { status: 200, body: SCENARIOS.full };
  }
  if (isScenarioName(scenario)) return { status: 200, body: SCENARIOS[scenario] };
  return { status: 404, body: NOT_FOUND };
}

// A multipart body becomes a plain object: its text fields, and each file as `{ name, size, type }`.
async function readMultipart(buffer: Buffer, contentType: string): Promise<Record<string, unknown> | null> {
  try {
    const form = await new Response(new Uint8Array(buffer), { headers: { "content-type": contentType } }).formData();
    const fields: Record<string, unknown> = {};
    for (const [key, value] of form) {
      fields[key] = typeof value === "string" ? value : { name: value.name, size: value.size, type: value.type };
    }
    return fields;
  } catch {
    return null;
  }
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return null;
  const buffer = Buffer.concat(chunks);
  const contentType = request.headers["content-type"] ?? "";
  if (contentType.startsWith("multipart/form-data")) return readMultipart(buffer, contentType);
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    return null;
  }
}

// The receipt file a signed link points to (a PNG).
function sendFile(response: ServerResponse, webOrigin: string, file: Buffer): void {
  response.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Disposition": "inline",
    "Cache-Control": "private, no-store",
    "Access-Control-Allow-Origin": webOrigin,
  });
  response.end(file);
}

async function handle(
  request: IncomingMessage,
  response: ServerResponse,
  webOrigin: string,
  checkout: CheckoutStore,
  autoDebits: AutoDebitStore,
  followup: FollowupStore,
  paymentHistory: PaymentHistoryStore,
  activity: ActivityStore,
  inbox: InboxStore,
  birthdays: BirthdaysStore,
  staffClients: StaffClientsStore,
  offlineCharges: OfflineChargesStore,
  dashboard: DashboardStore,
): Promise<void> {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": webOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  // The real host: the receipt links point back at this server.
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const { pathname } = url;
  const isGet = request.method === "GET";
  const scenario = readCookie(request, SCENARIO_COOKIE);
  const owner = readCookie(request, OWNER_COOKIE) ?? DEFAULT_OWNER;
  // The body is a stream: read it once for both stores.
  const hasBody =
    request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE";
  const body = hasBody ? await readBody(request) : null;

  // The offline charges first: with `staff-booking*` they own GET /staff/clients/:id (and /me/payments with
  // `offline-paid`); with any other scenario they only answer the empty list of open charges, or nothing.
  // Then the staff clients: otherwise the follow-up's `readClient` answers GET /staff/clients/:id.
  // Then the follow-up, then the debits: they also answer the one case of POST /checkout/plan that is theirs.
  const storeResponse =
    (await offlineCharges.handle(request.method ?? "GET", url, scenario, body, owner)) ??
    (await dashboard.handle(request.method ?? "GET", url, scenario)) ??
    (await staffClients.handle(request.method ?? "GET", url, scenario, body, owner)) ??
    (await followup.handle(request.method ?? "GET", url, scenario, body, owner)) ??
    (await autoDebits.handle(request.method ?? "GET", url, scenario, body, owner)) ??
    (await paymentHistory.handle(request.method ?? "GET", url, scenario)) ??
    (await activity.handle(request.method ?? "GET", url, scenario)) ??
    (await inbox.handle(request.method ?? "GET", url, scenario, body, owner)) ??
    (await birthdays.handle(request.method ?? "GET", url, scenario, body, owner)) ??
    (await checkout.handle(request.method ?? "GET", url, scenario, body));
  if (storeResponse && Buffer.isBuffer(storeResponse.body)) {
    return sendFile(response, webOrigin, storeResponse.body);
  }
  if (storeResponse) {
    return sendJson(response, webOrigin, storeResponse.status, storeResponse.body);
  }

  if (isGet && pathname === "/api/v1/users/me") {
    if (!scenario) return sendJson(response, webOrigin, 401, UNAUTHENTICATED_RESPONSE.body);
    if (scenario === "account-deactivated") return sendJson(response, webOrigin, 403, DEACTIVATED);
    if (isStaffScenario(scenario)) return sendJson(response, webOrigin, 200, E2E_STAFF);
    // The client whose birthday is today, so the confetti shows.
    if (scenario === "client-birthday") {
      return sendJson(response, webOrigin, 200, { ...E2E_CLIENT, birthDate: birthDateForToday() });
    }
    return sendJson(response, webOrigin, 200, E2E_CLIENT);
  }

  // The dashboard's "Próximas reservas" card: nobody has bookings in these scenarios.
  if (isGet && pathname === "/api/v1/me/bookings") {
    if (!scenario) return sendJson(response, webOrigin, 401, UNAUTHENTICATED_RESPONSE.body);
    return sendJson(response, webOrigin, 200, []);
  }

  if (isGet && pathname === "/api/v1/me/subscriptions") {
    if (!scenario) return sendJson(response, webOrigin, 401, UNAUTHENTICATED_RESPONSE.body);
    const { status, body } = await resolveSubscriptions(scenario);
    return sendJson(response, webOrigin, status, body);
  }

  return sendJson(response, webOrigin, 404, NOT_FOUND);
}

export function startFakeApi(
  port: number,
  webOrigin: string,
): Promise<{ close: () => Promise<void> }> {
  const checkout = createCheckoutStore(webOrigin);
  const autoDebits = createAutoDebitStore(webOrigin);
  const followup = createFollowupStore();
  const paymentHistory = createPaymentHistoryStore();
  const activity = createActivityStore();
  const inbox = createInboxStore();
  const birthdays = createBirthdaysStore();
  const staffClients = createStaffClientsStore();
  const offlineCharges = createOfflineChargesStore();
  const dashboard = createDashboardStore();
  const server = createServer((request, response) => {
    handle(
      request,
      response,
      webOrigin,
      checkout,
      autoDebits,
      followup,
      paymentHistory,
      activity,
      inbox,
      birthdays,
      staffClients,
      offlineCharges,
      dashboard,
    ).catch(() => {
      if (!response.headersSent) sendJson(response, webOrigin, 500, INTERNAL);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      resolve({
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}
