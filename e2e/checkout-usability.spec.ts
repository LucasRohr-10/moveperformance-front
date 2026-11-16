import path from "node:path";

import { expect, test, type APIRequestContext, type Locator, type Page, type TestInfo } from "@playwright/test";

import type { CheckoutResponseDto } from "@/lib/api/types";

import { bookingDayFromToday } from "./support/booking-day";
import { CHECKOUT_REFS, E2E_PLAN_IDS } from "./support/checkout-fixtures";
import { openSlotId } from "./support/offline-charges-fixtures";
import { planAction, selectPlan } from "./support/plan-selector";
import { SCENARIO_COOKIE, type ScenarioName, type SpecialScenario } from "./support/scenarios";
import { simulateFromTest } from "./support/simulate";
import { useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";
const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;
const MIN_TOUCH_TARGET_PX = 44;
const NARROW_VIEWPORT = { width: 360, height: 780 };
const MAX_TABS = 40;
const MAX_BUSY_FEEDBACK_MS = 100;
const POLL_INTERVAL_MS = 3000;
// The servers render with the real clock, so the booked slot is always two days from today.
const BOOKING_DAY = bookingDayFromToday(2);
const BOOKING_TIME = "10:00";
const PAY_LABEL = "Pagar con Mercado Pago";
const BUSY_LABEL = "Te llevamos a Mercado Pago…";
const REHAB_OPEN_CHECKOUT = `/checkout/reserva?service=rehab&date=${BOOKING_DAY.date}&slot=${openSlotId("rehab", BOOKING_DAY.date)}`;
const REHAB_FULL_CHECKOUT = `/checkout/reserva?service=rehab&date=${BOOKING_DAY.date}&slot=slot-rehab-${BOOKING_DAY.date}-1100`;
// Next keeps the previous route in the DOM, hidden, after a client navigation.
const VISIBLE = { visible: true } as const;

async function shot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-checkout-usability-${name}.png`),
    fullPage: true,
  });
}

function clickCounter(): { click: (target: Locator) => Promise<void>; count: () => number } {
  let clicks = 0;
  return {
    click: async (target) => {
      clicks += 1;
      await target.click();
    },
    count: () => clicks,
  };
}

async function isInFirstViewport(locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const viewport = locator.page().viewportSize();
  if (!box || !viewport) return false;
  return box.y >= 0 && box.y + box.height <= viewport.height && box.x >= 0 && box.x + box.width <= viewport.width;
}

async function tabUntilFocused(page: Page, target: Locator): Promise<void> {
  for (let presses = 0; presses < MAX_TABS; presses += 1) {
    await page.keyboard.press("Tab");
    const focused = await target.evaluate((element) => element === document.activeElement);
    if (focused) return;
  }
  throw new Error(`Tab did not reach the element in ${MAX_TABS} presses`);
}

async function focusRingOf(locator: Locator): Promise<{ outline: string; boxShadow: string }> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const outlineVisible = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    return {
      outline: outlineVisible ? `${style.outlineWidth} ${style.outlineStyle}` : "none",
      boxShadow: style.boxShadow,
    };
  });
}

async function expectTouchTarget(locator: Locator, name: string): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box!.height, `"${name}" is ${box!.height}px high`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
}

async function createPlanPurchase(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API}/checkout/plan`, {
    headers: { Cookie: `${SCENARIO_COOKIE}=none` },
    data: { planId: E2E_PLAN_IDS.mensual },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as CheckoutResponseDto).externalReference;
}

async function pickRehabSlot(page: Page, testInfo: TestInfo, click: (target: Locator) => Promise<void>) {
  const isMobile = testInfo.project.name === "mobile";
  const view = page.getByTestId(isMobile ? "public-booking-mobile" : "public-booking-desktop");
  // Only when the day falls in the next week (today is Sunday): going there is not part of the counted clicks.
  for (let week = 0; week < BOOKING_DAY.weeksAhead; week += 1) {
    await view.getByRole("button", { name: "Semana siguiente" }).click();
  }
  if (isMobile) {
    await click(view.getByRole("button").filter({ has: page.getByText(BOOKING_DAY.number, { exact: true }) }));
    await click(view.getByRole("button").filter({ hasText: BOOKING_TIME }).filter({ hasText: "Disponible" }));
    return view;
  }
  const row = view.locator(`xpath=.//div[span[normalize-space()='${BOOKING_TIME}']]`);
  await click(row.locator(":scope > *").nth(BOOKING_DAY.weekday));
  return view;
}

test.describe("Usability tasks for the client role", () => {
  test("task 1: Contratar un plan: simulator in 2 clicks from /plans, approved in 1 more", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    const { click, count } = clickCounter();
    await page.goto("/plans");

    // Trimestral is the plan the card has selected from the start, so there is nothing to pick.
    await click(planAction(page, "Contratar"));
    await click(page.getByRole("button", { name: PAY_LABEL }));
    await expect(page).toHaveURL(/\/checkout\/simulado\?ref=/);
    expect(count(), "clicks to reach the simulator").toBeLessThanOrEqual(2);
    await shot(page, testInfo, "task-1-simulator");

    await click(page.getByRole("button", { name: "Aprobar" }));
    await expect(page.getByRole("status").getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeVisible();
    expect(count(), "clicks to reach the approved result").toBeLessThanOrEqual(3);
    await shot(page, testInfo, "task-1-approved");
  });

  test("task 2: Pagar una evaluación de Rehab: approved in at most 5 clicks, with the slot's date and time", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    const { click, count } = clickCounter();
    await page.goto("/reservar?service=rehab");

    const view = await pickRehabSlot(page, testInfo, click);
    await click(view.getByRole("button", { name: "Continuar al pago", exact: true }));
    await click(page.getByRole("button", { name: PAY_LABEL }));
    await click(page.getByRole("button", { name: "Aprobar" }));

    const result = page.getByRole("status");
    await expect(result.getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeVisible();
    await expect(result.getByRole("definition").filter({ hasText: `${BOOKING_DAY.label} · ${BOOKING_TIME} hs` })).toBeVisible();
    expect(count(), "clicks from /reservar to the approved result").toBeLessThanOrEqual(5);
    await shot(page, testInfo, "task-2-approved");
  });

  test("task 3: Entender un pago rechazado: the screen says what happened, 1 click back to the slots", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(REHAB_OPEN_CHECKOUT);
    await page.getByRole("button", { name: PAY_LABEL }).click();
    await page.getByRole("button", { name: "Rechazar" }).click();

    const result = page.getByRole("status");
    await expect(result.getByRole("heading", { name: "Pago no completado" })).toBeVisible();
    await expect(result.getByText("El pago no se completó y liberamos el horario.").filter(VISIBLE)).toBeVisible();
    await shot(page, testInfo, "task-3-rejected");

    const { click, count } = clickCounter();
    await click(result.getByRole("link", { name: "Intentar de nuevo" }));
    await expect(page).toHaveURL(/\/reservar\?service=rehab$/);
    await expect(page.getByRole("heading", { name: "Reservá tu horario." }).filter(VISIBLE)).toBeVisible();
    expect(count(), "clicks back to choosing a slot").toBe(1);
    await shot(page, testInfo, "task-3-back-to-slots");
  });

  test("task 4: Esperar un pago pendiente: Confirmando tu pago in the first viewport, in a status region", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/resultado?ref=${CHECKOUT_REFS.pendingPlan}`);

    const region = page.getByRole("status");
    const waiting = region.getByRole("heading", { name: "Confirmando tu pago" });
    await expect(waiting).toBeVisible();
    await expect(region).toHaveAttribute("aria-live", "polite");
    expect(await isInFirstViewport(waiting), "Confirmando tu pago inside the first viewport").toBe(true);
    await shot(page, testInfo, "task-4-pending");
  });
});

interface Screen {
  name: string;
  scenario: ScenarioName | SpecialScenario;
  url: string;
  ready: (page: Page) => Locator;
  act?: (page: Page) => Promise<void>;
}

const heading = (name: string) => (page: Page) => page.getByRole("heading", { name }).filter(VISIBLE);
// The plan/service name on the checkout summary is styled text, not a heading.
const text = (value: string) => (page: Page) => page.getByText(value, { exact: true }).filter(VISIBLE);

const SCREENS: Screen[] = [
  { name: "plan-trimestral", scenario: "none", url: "/checkout/plan/plan-trimestral", ready: heading("Confirmá tu plan.") },
  { name: "plan-pack", scenario: "none", url: "/checkout/plan/plan-pack-8", ready: heading("Confirmá tu plan.") },
  {
    name: "plan-renewal",
    scenario: "active-with-upcoming",
    url: "/checkout/plan/plan-trimestral",
    ready: (page) => page.getByText(/^Ya tenés un plan de Performance activo/).filter(VISIBLE),
  },
  {
    name: "plan-provider-down",
    scenario: "checkout-provider-down",
    url: "/checkout/plan/plan-trimestral",
    ready: (page) => page.getByRole("alert").filter({ hasText: "No pudimos iniciar el pago." }),
    act: (page) => page.getByRole("button", { name: PAY_LABEL }).click(),
  },
  { name: "plan-unknown", scenario: "none", url: "/checkout/plan/plan-x", ready: heading("Plan no disponible") },
  { name: "booking-rehab", scenario: "none", url: REHAB_OPEN_CHECKOUT, ready: text("Evaluación y Diagnóstico") },
  {
    name: "booking-recovery",
    scenario: "none",
    url: `/checkout/reserva?service=recovery&date=${BOOKING_DAY.date}&slot=${openSlotId("recovery", BOOKING_DAY.date)}`,
    ready: text("Sesión individual"),
  },
  {
    name: "booking-full",
    scenario: "none",
    url: REHAB_FULL_CHECKOUT,
    ready: heading("Ese horario ya no está disponible"),
  },
  ...(
    [
      ["approvedPlan", "¡Listo! Tu pago fue aprobado."],
      ["approvedBooking", "¡Listo! Tu pago fue aprobado."],
      ["needsAttention", "Revisamos tu pago"],
      ["rejectedBooking", "Pago no completado"],
      ["expiredBooking", "Se venció el tiempo para pagar"],
      ["pendingPlan", "Confirmando tu pago"],
      ["statusError", "No pudimos consultar tu pago."],
      ["unknown", "No encontramos la operación"],
    ] as const
  ).map(([ref, title]) => ({
    name: `result-${ref}`,
    scenario: "none" as const,
    url: `/checkout/resultado?ref=${CHECKOUT_REFS[ref]}`,
    ready: heading(title),
  })),
  { name: "result-missing-ref", scenario: "none", url: "/checkout/resultado", ready: heading("No encontramos la operación") },
  {
    name: "simulator",
    scenario: "none",
    url: `/checkout/simulado?ref=${CHECKOUT_REFS.pendingPlan}`,
    ready: heading("Simulador de pagos (desarrollo)"),
  },
  {
    name: "simulator-off",
    scenario: "none",
    url: `/checkout/simulado?ref=${CHECKOUT_REFS.simulatorOff}`,
    ready: heading("Simulador desactivado"),
    act: (page) => page.getByRole("button", { name: "Aprobar" }).click(),
  },
  { name: "simulator-missing-ref", scenario: "none", url: "/checkout/simulado", ready: heading("No encontramos la operación") },
];

test.describe("Global criteria at 360 px", () => {
  for (const screen of SCREENS) {
    test(`no horizontal scroll: ${screen.name}`, async ({ context, page, baseURL }, testInfo) => {
      await page.setViewportSize(NARROW_VIEWPORT);
      await useScenario(context, baseURL!, screen.scenario);
      await page.goto(screen.url);
      await screen.act?.(page);
      await expect(screen.ready(page)).toBeVisible();

      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      await shot(page, testInfo, `360-${screen.name}`);
      expect(
        metrics.scrollWidth,
        `scrollWidth ${metrics.scrollWidth} must not exceed clientWidth ${metrics.clientWidth}`,
      ).toBeLessThanOrEqual(metrics.clientWidth);
    });
  }
});

test.describe("Global criteria: touch targets on mobile", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "touch targets are a mobile criterion");
  });

  test("Pagar con Mercado Pago", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto("/checkout/plan/plan-trimestral");
    await expectTouchTarget(page.getByRole("button", { name: PAY_LABEL }), PAY_LABEL);
    await shot(page, testInfo, "touch-pay");
  });

  test("Aprobar and Rechazar", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/simulado?ref=${CHECKOUT_REFS.pendingPlan}`);
    await expectTouchTarget(page.getByRole("button", { name: "Aprobar" }), "Aprobar");
    await expectTouchTarget(page.getByRole("button", { name: "Rechazar" }), "Rechazar");
    await shot(page, testInfo, "touch-simulator");
  });

  test("Intentar de nuevo", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/resultado?ref=${CHECKOUT_REFS.rejectedBooking}`);
    await expectTouchTarget(page.getByRole("link", { name: "Intentar de nuevo" }), "Intentar de nuevo");
    await shot(page, testInfo, "touch-retry");
  });

  test("Elegir otro horario, on the result and on the unavailable slot", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/resultado?ref=${CHECKOUT_REFS.expiredBooking}`);
    await expectTouchTarget(page.getByRole("link", { name: "Elegir otro horario" }), "Elegir otro horario (result)");
    await shot(page, testInfo, "touch-another-slot-result");

    await page.goto(REHAB_FULL_CHECKOUT);
    await expectTouchTarget(page.getByRole("link", { name: "Elegir otro horario" }), "Elegir otro horario (checkout)");
    await shot(page, testInfo, "touch-another-slot-checkout");
  });

  test("Volver a consultar", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.clock.install();
    await page.goto(`/checkout/resultado?ref=${CHECKOUT_REFS.pendingPlan}`);
    await expect(page.getByRole("status").getByRole("heading", { name: "Confirmando tu pago" })).toBeVisible();

    const recheck = page.getByRole("button", { name: "Volver a consultar" });
    await expect
      .poll(
        async () => {
          if ((await recheck.count()) === 0) await page.clock.runFor(POLL_INTERVAL_MS);
          return recheck.count();
        },
        { timeout: 60_000 },
      )
      .toBe(1);
    await expectTouchTarget(recheck, "Volver a consultar");
    await shot(page, testInfo, "touch-recheck");
  });

  test("Pagar esta sesión", async ({ context, page, baseURL }, testInfo) => {
    // Finding: the action inside the snackbar is 31.75 px high on a phone, under the 44 px minimum.
    test.fail(true, "snackbar action below the touch target minimum");
    await useScenario(context, baseURL!, "none");
    await page.goto("/reservar?service=recovery");
    const view = await pickRehabSlot(page, testInfo, (target) => target.click());
    await view.getByRole("button", { name: "Confirmar reserva", exact: true }).click();
    await shot(page, testInfo, "touch-pay-session");
    await expectTouchTarget(page.getByRole("link", { name: "Pagar esta sesión" }), "Pagar esta sesión");
  });

  test("plan card links on /plans", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto("/plans");
    // Each card has one action, named after the plan chosen in it.
    const choices = [
      { plan: "Plan Trimestral", label: "Contratar" },
      { plan: "Paquete 4 sesiones", label: "Contratar paquete" },
      { plan: "Sesión individual", label: "Reservar sesión" },
    ];
    for (const { plan, label } of choices) {
      await selectPlan(page, plan);
      await expectTouchTarget(planAction(page, label), label);
    }
    await shot(page, testInfo, "touch-plan-cards");
  });
});

test.describe("Global criteria: keyboard, feedback and stability", () => {
  test("Tab reaches the pay button with a visible focus ring", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto("/checkout/plan/plan-trimestral");
    const pay = page.getByRole("button", { name: PAY_LABEL });
    await expect(pay).toBeVisible();

    await tabUntilFocused(page, pay);
    await expect(pay).toBeFocused();
    const ring = await focusRingOf(pay);
    await shot(page, testInfo, "pay-focused");
    expect(
      ring.outline !== "none" || ring.boxShadow !== "none",
      `pay button focus ring (outline: ${ring.outline}, box-shadow: ${ring.boxShadow})`,
    ).toBe(true);
  });

  test("the pay button says Te llevamos a Mercado Pago… within 100 ms of the click", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    // Hold the API answer so the page stays while the busy label is measured.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/checkout/plan", async (route) => {
      if (route.request().method() === "POST") await held;
      await route.continue();
    });
    await page.goto("/checkout/plan/plan-trimestral");
    const pay = page.getByRole("button", { name: PAY_LABEL });
    await expect(pay).toBeVisible();

    await pay.evaluate((button, busyLabel) => {
      const timing: { clickAt: number | null; busyAt: number | null } = { clickAt: null, busyAt: null };
      Object.assign(window, { __payTiming: timing });
      window.addEventListener("click", () => (timing.clickAt = performance.now()), { capture: true, once: true });
      new MutationObserver(() => {
        if (timing.busyAt === null && button.textContent === busyLabel) timing.busyAt = performance.now();
      }).observe(button, { childList: true, subtree: true, characterData: true });
    }, BUSY_LABEL);
    await pay.click();

    const busy = page.getByRole("button", { name: BUSY_LABEL });
    await expect(busy).toBeDisabled();
    await shot(page, testInfo, "pay-busy");
    const timing = await page.evaluate(
      () => (window as unknown as { __payTiming: { clickAt: number; busyAt: number } }).__payTiming,
    );
    release();
    expect(timing.busyAt - timing.clickAt, "ms from click to the busy label").toBeLessThanOrEqual(
      MAX_BUSY_FEEDBACK_MS,
    );
  });

  test("the h1 Tu pago. stays while the card is Confirmando and gives way to the approved result", async ({
    context,
    page,
    baseURL,
    request,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    const ref = await createPlanPurchase(request);
    await page.goto(`/checkout/resultado?ref=${ref}`);

    const title = page.getByRole("heading", { name: "Tu pago.", level: 1 });
    await expect(page.getByRole("status").getByRole("heading", { name: "Confirmando tu pago" })).toBeVisible();
    await expect(title).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-checkout-usability-h1-1-pending.png`),
    });

    await simulateFromTest(request, ref, "approved");
    await expect(page.getByRole("status").getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeVisible({
      timeout: 10_000,
    });
    // The approved result is its own block: the page title goes away instead of sitting above it.
    await expect(title).toBeHidden();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-checkout-usability-h1-2-approved.png`),
    });
  });
});
