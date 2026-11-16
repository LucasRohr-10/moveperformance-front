import path from "node:path";

import { expect, test, type APIRequestContext, type Locator, type Page, type TestInfo } from "@playwright/test";

import type { CheckoutResponseDto, PurchaseStatusDto } from "@/lib/api/types";

import { CHECKOUT_REFS, E2E_PLAN_IDS, SEEDED_PURCHASES } from "./support/checkout-fixtures";
import { businessDateFromToday, openSlotId } from "./support/offline-charges-fixtures";
import { SCENARIO_COOKIE } from "./support/scenarios";
import { simulateFromTest } from "./support/simulate";
import { useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";
const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;
const APPROVAL_DEADLINE_MS = 10_000;
// The fake API only takes slots that are still ahead, so the slot is counted from today.
const REHAB_OPEN_SLOT = openSlotId("rehab", businessDateFromToday(2));
// Next keeps the previous route in the DOM, hidden, after a client navigation.
const VISIBLE = { visible: true } as const;

async function shot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-checkout-result-${name}.png`),
    fullPage: true,
  });
}

function seeded(ref: string): PurchaseStatusDto {
  const purchase = SEEDED_PURCHASES.find((candidate) => candidate.externalReference === ref);
  if (!purchase) throw new Error(`no seeded purchase ${ref}`);
  return purchase;
}

function resultRegion(page: Page): Locator {
  return page.getByRole("status");
}

async function createPurchase(
  request: APIRequestContext,
  endpoint: "plan" | "booking",
  data: Record<string, string>,
): Promise<string> {
  const response = await request.post(`${API}/checkout/${endpoint}`, {
    headers: { Cookie: `${SCENARIO_COOKIE}=none` },
    data,
  });
  expect(response.status(), `POST /checkout/${endpoint}`).toBe(201);
  return ((await response.json()) as CheckoutResponseDto).externalReference;
}

function countPurchaseReads(page: Page, ref: string): () => number {
  let reads = 0;
  page.on("response", (response) => {
    const isRead = response.request().method() === "GET";
    if (isRead && new URL(response.url()).pathname === `/api/v1/checkout/purchases/${ref}`) reads += 1;
  });
  return () => reads;
}

// React Strict Mode (next dev) mounts the polling effect twice, so the first read goes out twice and
// the app ignores one answer. Network reads are the app's attempts plus these extra first reads.
async function extraFirstReads(page: Page, reads: () => number): Promise<number> {
  await page.waitForLoadState("networkidle");
  return reads() - 1;
}

// Moves the fake clock one interval at a time until the page has read the purchase `count` times.
async function advancePollsUntil(page: Page, reads: () => number, count: number): Promise<void> {
  await expect
    .poll(
      async () => {
        if (reads() < count) await page.clock.runFor(POLL_INTERVAL_MS);
        return reads();
      },
      { timeout: 60_000 },
    )
    .toBeGreaterThanOrEqual(count);
}

// For the rows the fake API cannot reach (a plan rejected or expired in the API, a cancelled purchase):
// the browser's read of that purchase answers with the given body.
async function servePurchase(page: Page, baseURL: string, purchase: PurchaseStatusDto): Promise<void> {
  await page.route(`**/api/v1/checkout/purchases/${purchase.externalReference}`, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": baseURL, "Access-Control-Allow-Credentials": "true" },
      body: JSON.stringify(purchase),
    });
  });
}

interface ExpectedRow {
  badge: string;
  title: string;
  body: string;
  details?: Array<[string, string]>;
  action: { label: string; href: string } | null;
}

async function expectRow(page: Page, row: ExpectedRow): Promise<void> {
  const region = resultRegion(page);
  await expect(region.getByRole("heading", { name: row.title })).toBeVisible();
  const badge = row.badge === "Aprobado" ? region.getByRole("img", { name: row.badge }) : region.getByText(row.badge, { exact: true }).filter(VISIBLE);
  await expect(badge).toBeVisible();
  await expect(region.getByText(row.body, { exact: true }).filter(VISIBLE)).toBeVisible();
  for (const [label, value] of row.details ?? []) {
    await expect(region.getByRole("term").filter({ hasText: label })).toBeVisible();
    await expect(region.getByRole("definition").filter({ hasText: value })).toBeVisible();
  }
  if (!row.details) await expect(region.getByRole("term")).toHaveCount(0);
  if (row.action) {
    await expect(region.getByRole("link", { name: row.action.label })).toHaveAttribute("href", row.action.href);
  } else {
    await expect(region.getByRole("link")).toHaveCount(0);
  }
  await expect(region.getByText(/mail/i)).toHaveCount(0);
  await expect(region.getByText("¡Listo! Tu pago fue aprobado.").filter(VISIBLE)).toHaveCount(
    row.title === "¡Listo! Tu pago fue aprobado." ? 1 : 0,
  );
}

const PROFILE = { label: "Ir a mi perfil", href: "/dashboard" };
const PLAN_RETRY = (planId: string) => ({ label: "Intentar de nuevo", href: `/checkout/plan/${planId}` });
const BOOKING_RETRY = (service: string) => ({ label: "Intentar de nuevo", href: `/reservar?service=${service}` });
const PLAN_NOT_COMPLETED = "El pago no se completó. Podés intentarlo de nuevo.";
const BOOKING_NOT_COMPLETED = "El pago no se completó y liberamos el horario.";

test.describe("Payment result: seeded purchases", () => {
  const rows: Array<{ name: string; ref: string; query?: string; row: ExpectedRow }> = [
    {
      name: "needs-attention",
      ref: CHECKOUT_REFS.needsAttention,
      row: {
        badge: "En revisión",
        title: "Revisamos tu pago",
        body: "Recibimos tu pago, pero necesitamos revisarlo. El equipo de MOVE te va a contactar.",
        details: [
          ["Plan", "Mensual"],
          ["Total", "$ 3.900"],
        ],
        action: PROFILE,
      },
    },
    {
      name: "approved-plan",
      ref: CHECKOUT_REFS.approvedPlan,
      row: {
        badge: "Aprobado",
        title: "¡Listo! Tu pago fue aprobado.",
        body: "Tu plan trimestral ya está activo.",
        action: PROFILE,
      },
    },
    {
      name: "approved-booking",
      ref: CHECKOUT_REFS.approvedBooking,
      row: {
        badge: "Aprobado",
        title: "¡Listo! Tu pago fue aprobado.",
        body: "Tu reserva está confirmada.",
        details: [
          ["Turno", "Evaluación y Diagnóstico"],
          ["Fecha y hora", "miércoles 21/10 · 10:00 hs"],
          ["Total", "$ 1.800"],
        ],
        action: PROFILE,
      },
    },
    {
      name: "pending-plan-provider-rejected",
      ref: CHECKOUT_REFS.pendingPlan,
      query: "&status=rejected",
      row: {
        badge: "Rechazado",
        title: "Pago no completado",
        body: "Mercado Pago no aprobó el pago. Podés intentarlo de nuevo.",
        action: PLAN_RETRY(E2E_PLAN_IDS.mensual),
      },
    },
    {
      name: "pending-plan",
      ref: CHECKOUT_REFS.pendingPlan,
      row: {
        badge: "Pendiente",
        title: "Confirmando tu pago",
        body: "Estamos esperando la confirmación de Mercado Pago. No cierres esta página.",
        action: null,
      },
    },
    {
      name: "pending-plan-provider-approved",
      ref: CHECKOUT_REFS.pendingPlan,
      query: "&status=approved",
      row: {
        badge: "Pendiente",
        title: "Confirmando tu pago",
        body: "Estamos esperando la confirmación de Mercado Pago. No cierres esta página.",
        action: null,
      },
    },
    {
      name: "rejected-booking",
      ref: CHECKOUT_REFS.rejectedBooking,
      row: {
        badge: "Rechazado",
        title: "Pago no completado",
        body: BOOKING_NOT_COMPLETED,
        action: BOOKING_RETRY("recovery"),
      },
    },
    {
      name: "expired-booking",
      ref: CHECKOUT_REFS.expiredBooking,
      row: {
        badge: "Vencido",
        title: "Se venció el tiempo para pagar",
        body: "Liberamos el horario. Podés elegir otro.",
        action: { label: "Elegir otro horario", href: "/reservar?service=rehab" },
      },
    },
  ];

  for (const { name, ref, query, row } of rows) {
    test(`${name}: ${row.title}`, async ({ context, page, baseURL }, testInfo) => {
      await useScenario(context, baseURL!, "none");
      await page.goto(`/checkout/resultado?ref=${ref}${query ?? ""}`);

      // The approved result drops the page title; every other state keeps it.
      const pageTitle = page.getByRole("heading", { name: "Tu pago.", level: 1 });
      if (row.title === "¡Listo! Tu pago fue aprobado.") await expect(pageTitle).toBeHidden();
      else await expect(pageTitle).toBeVisible();
      await expectRow(page, row);
      await shot(page, testInfo, name);
    });
  }

  test("pending: the card is busy while the API says pending", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/resultado?ref=${CHECKOUT_REFS.pendingPlan}`);

    const region = resultRegion(page);
    await expect(region.getByRole("heading", { name: "Confirmando tu pago" })).toBeVisible();
    // The card and the info notice inside it are both busy.
    await expect(region.locator("[aria-busy='true']")).toHaveCount(2);
    await expect(region).toHaveAttribute("aria-live", "polite");
  });
});

test.describe("Payment result: rows only a mocked read reaches", () => {
  const pendingPlan = seeded(CHECKOUT_REFS.pendingPlan);
  const approvedBooking = seeded(CHECKOUT_REFS.approvedBooking);
  const rejectedBooking = seeded(CHECKOUT_REFS.rejectedBooking);

  const rows: Array<{ name: string; purchase: PurchaseStatusDto; row: ExpectedRow }> = [
    {
      name: "approved-booking-without-slot",
      purchase: { ...approvedBooking, startsAt: null },
      row: {
        badge: "Aprobado",
        title: "¡Listo! Tu pago fue aprobado.",
        body: "Tu reserva está confirmada.",
        details: [
          ["Turno", "Evaluación y Diagnóstico"],
          ["Total", "$ 1.800"],
        ],
        action: PROFILE,
      },
    },
    {
      name: "rejected-plan",
      purchase: { ...pendingPlan, status: "rejected" },
      row: { badge: "Rechazado", title: "Pago no completado", body: PLAN_NOT_COMPLETED, action: PLAN_RETRY("plan-mensual") },
    },
    {
      name: "cancelled-plan",
      purchase: { ...pendingPlan, status: "cancelled" },
      row: { badge: "Cancelado", title: "Pago no completado", body: PLAN_NOT_COMPLETED, action: PLAN_RETRY("plan-mensual") },
    },
    {
      name: "cancelled-booking",
      purchase: { ...rejectedBooking, status: "cancelled" },
      row: {
        badge: "Cancelado",
        title: "Pago no completado",
        body: BOOKING_NOT_COMPLETED,
        action: BOOKING_RETRY("recovery"),
      },
    },
    {
      name: "expired-plan",
      purchase: { ...pendingPlan, status: "expired" },
      row: { badge: "Vencido", title: "Pago no completado", body: PLAN_NOT_COMPLETED, action: PLAN_RETRY("plan-mensual") },
    },
  ];

  for (const { name, purchase, row } of rows) {
    test(`${name}: ${row.title}`, async ({ context, page, baseURL }, testInfo) => {
      await useScenario(context, baseURL!, "none");
      await servePurchase(page, baseURL!, purchase);
      await page.goto(`/checkout/resultado?ref=${purchase.externalReference}`);

      await expectRow(page, row);
      if (name === "approved-booking-without-slot") {
        await expect(resultRegion(page).getByText("Fecha y hora")).toHaveCount(0);
      }
      await shot(page, testInfo, name);
    });
  }
});

test.describe("Payment result: polling", () => {
  test("a pending purchase approved while the page is open turns into ¡Listo! within 10 s", async ({
    context,
    page,
    baseURL,
    request,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    const ref = await createPurchase(request, "plan", { planId: E2E_PLAN_IDS.trimestral });
    await page.goto(`/checkout/resultado?ref=${ref}`);
    await expect(resultRegion(page).getByRole("heading", { name: "Confirmando tu pago" })).toBeVisible();

    await simulateFromTest(request, ref, "approved");
    await expect(resultRegion(page).getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeVisible({
      timeout: APPROVAL_DEADLINE_MS,
    });
    await shot(page, testInfo, "approved-while-open");
  });

  test("plan still pending after 20 reads: time ran out, no way to pay again and Volver a consultar", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    const ref = CHECKOUT_REFS.pendingPlan;
    const reads = countPurchaseReads(page, ref);
    await page.clock.install();
    await page.goto(`/checkout/resultado?ref=${ref}`);
    await expect(resultRegion(page).getByRole("heading", { name: "Confirmando tu pago" })).toBeVisible();

    const cap = MAX_POLL_ATTEMPTS + (await extraFirstReads(page, reads));
    await advancePollsUntil(page, reads, cap);
    // The first payment may still be processing, so the page only offers the profile, never "Intentar de nuevo".
    await expectRow(page, {
      badge: "Pendiente",
      title: "Se agotó el tiempo de espera",
      body: "No recibimos la confirmación de tu pago a tiempo. Si ya pagaste, tu plan se activa apenas se acredite el pago. Si no, intentá de nuevo.",
      action: PROFILE,
    });
    const recheck = resultRegion(page).getByRole("button", { name: "Volver a consultar" });
    await expect(recheck).toBeVisible();
    await shot(page, testInfo, "pending-plan-timed-out");

    await page.clock.runFor(POLL_INTERVAL_MS * 3);
    expect(reads(), "reads stop at the cap").toBe(cap);

    await recheck.click();
    await expect.poll(reads).toBe(cap + 1);
    await expect(resultRegion(page).getByRole("heading", { name: "Confirmando tu pago" })).toBeVisible();
  });

  test("booking still pending after 20 reads: time ran out, no way to book again and Volver a consultar", async ({
    context,
    page,
    baseURL,
    request,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    const ref = await createPurchase(request, "booking", {
      planId: E2E_PLAN_IDS.rehabEvaluation,
      timeSlotId: REHAB_OPEN_SLOT,
    });
    const reads = countPurchaseReads(page, ref);
    await page.clock.install();
    await page.goto(`/checkout/resultado?ref=${ref}`);
    await expect(resultRegion(page).getByRole("heading", { name: "Confirmando tu pago" })).toBeVisible();

    const cap = MAX_POLL_ATTEMPTS + (await extraFirstReads(page, reads));
    await advancePollsUntil(page, reads, cap);
    await expectRow(page, {
      badge: "Pendiente",
      title: "Se agotó el tiempo de espera",
      body: "No recibimos la confirmación de tu pago a tiempo. Si ya pagaste, tu reserva se confirma apenas se acredite el pago. Si no, elegí el horario y intentá de nuevo.",
      action: PROFILE,
    });
    await expect(resultRegion(page).getByRole("button", { name: "Volver a consultar" })).toBeVisible();
    await shot(page, testInfo, "pending-booking-timed-out");
  });

  test("a failed read in the middle keeps the last state and the polling goes on", async ({
    context,
    page,
    baseURL,
  }) => {
    await useScenario(context, baseURL!, "none");
    const ref = CHECKOUT_REFS.pendingPlan;
    let failNextRead = false;
    await page.route(`**/api/v1/checkout/purchases/${ref}`, async (route) => {
      if (route.request().method() !== "GET" || !failNextRead) return route.continue();
      failNextRead = false;
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": baseURL!, "Access-Control-Allow-Credentials": "true" },
        body: JSON.stringify({ statusCode: 500, code: "INTERNAL", message: "Error interno." }),
      });
    });
    const reads = countPurchaseReads(page, ref);
    await page.clock.install();
    await page.goto(`/checkout/resultado?ref=${ref}`);
    const waiting = resultRegion(page).getByRole("heading", { name: "Confirmando tu pago" });
    await expect(waiting).toBeVisible();
    await page.waitForLoadState("networkidle");

    failNextRead = true;
    const before = reads();
    await advancePollsUntil(page, reads, before + 1);
    expect(failNextRead, "the next read answered 500").toBe(false);
    await expect(waiting).toBeVisible();
    await expect(page.getByText("No pudimos consultar tu pago.").filter(VISIBLE)).toHaveCount(0);
    await advancePollsUntil(page, reads, before + 2);
    await expect(waiting).toBeVisible();
  });
});

test.describe("Payment result: no purchase to show", () => {
  test("statusError: No pudimos consultar tu pago. with Reintentar", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    const reads = countPurchaseReads(page, CHECKOUT_REFS.statusError);
    await page.goto(`/checkout/resultado?ref=${CHECKOUT_REFS.statusError}`);

    const alert = page.getByRole("alert").filter({ hasText: "No pudimos consultar tu pago." });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Probá de nuevo en unos minutos.");
    await expect(alert).not.toContainText("Error interno");
    await shot(page, testInfo, "status-error");

    await page.waitForLoadState("networkidle");
    const before = reads();
    await alert.getByRole("button", { name: "Reintentar" }).click();
    await expect.poll(reads).toBe(before + 1);
    await expect(page.getByRole("alert").filter({ hasText: "No pudimos consultar tu pago." })).toBeVisible();
  });

  for (const [name, url] of [
    ["unknown", `/checkout/resultado?ref=${CHECKOUT_REFS.unknown}`],
    ["missing-ref", "/checkout/resultado"],
  ] as const) {
    test(`${name}: No encontramos la operación`, async ({ context, page, baseURL }, testInfo) => {
      await useScenario(context, baseURL!, "none");
      await page.goto(url);

      const region = resultRegion(page);
      await expect(region.getByRole("heading", { name: "No encontramos la operación" })).toBeVisible();
      await expect(region.getByText("Revisá el link o contactá a MOVE.").filter(VISIBLE)).toBeVisible();
      await expect(region.getByRole("link", { name: "Ir a mi perfil" })).toHaveAttribute("href", "/dashboard");
      await shot(page, testInfo, name);
    });
  }

  test("without a session, the result page ends on /login", async ({ page }) => {
    await page.goto(`/checkout/resultado?ref=${CHECKOUT_REFS.approvedPlan}`);
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fcheckout%2Fresultado%3Fref%3Da0000000-0000-4000-8000-000000000001$/);
  });
});

test.describe("Payment simulator", () => {
  test("simulatorOff: Simulador desactivado", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/simulado?ref=${CHECKOUT_REFS.simulatorOff}`);
    await expect(page.getByRole("heading", { name: "Simulador de pagos (desarrollo)" })).toBeVisible();
    await shot(page, testInfo, "simulator");

    await page.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByRole("heading", { name: "Simulador desactivado" })).toBeVisible();
    await expect(page.getByText("Los pagos van por Mercado Pago.").filter(VISIBLE)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout\/simulado\?ref=/);
    await shot(page, testInfo, "simulator-off");
  });

  test("an unknown reference: No encontramos la operación", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/simulado?ref=${CHECKOUT_REFS.unknown}`);
    await page.getByRole("button", { name: "Rechazar" }).click();

    await expect(page.getByRole("heading", { name: "No encontramos la operación" })).toBeVisible();
    await shot(page, testInfo, "simulator-unknown");
  });

  test("a missing reference asks for it", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto("/checkout/simulado");

    await expect(page.getByRole("heading", { name: "No encontramos la operación" })).toBeVisible();
    await expect(page.getByText("Falta la referencia del pago.").filter(VISIBLE)).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprobar" })).toHaveCount(0);
    await shot(page, testInfo, "simulator-missing-ref");
  });

  test("both buttons are disabled while the simulation is in flight", async ({
    context,
    page,
    baseURL,
    request,
  }) => {
    await useScenario(context, baseURL!, "none");
    const ref = await createPurchase(request, "plan", { planId: E2E_PLAN_IDS.mensual });
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/payments/dev/simulate", async (route) => {
      if (route.request().method() === "POST") await held;
      await route.continue();
    });
    await page.goto(`/checkout/simulado?ref=${ref}`);

    await page.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByRole("button", { name: "Aprobar" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Rechazar" })).toBeDisabled();
    release();
    await expect(page).toHaveURL(new RegExp(`/checkout/resultado\\?ref=${ref}$`));
  });
});
