import path from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { addDaysToDate, daysBetween, isoWeekday, mondayOf, todayBusinessDate } from "@/features/bookings/slots";

import { SLOT_SUFFIX_FULL, SLOT_SUFFIX_OPEN } from "./support/checkout-fixtures";
import { useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";
const DAYS_PER_WEEK = 7;
// The server renders the checkout with the real clock, so the slot is always two days from today.
const TODAY = todayBusinessDate();
const TARGET_DATE = addDaysToDate(TODAY, 2);
const [, TARGET_MONTH, TARGET_DAY] = TARGET_DATE.split("-");
const TARGET_DAY_NUMBER = String(Number(TARGET_DAY));
const TARGET_WEEKS_AHEAD = Math.floor(daysBetween(mondayOf(TODAY), TARGET_DATE) / DAYS_PER_WEEK);
const TARGET_TIME = "10:00";
const TARGET_WEEKDAY = new Intl.DateTimeFormat("es-UY", { weekday: "long", timeZone: "America/Montevideo" }).format(
  new Date(`${TARGET_DATE}T12:00:00-03:00`),
);
const TARGET_SLOT_LABEL = `${TARGET_WEEKDAY} ${TARGET_DAY}/${TARGET_MONTH} · ${TARGET_TIME} hs`;
const PAY_LABEL = "Pagar con Mercado Pago";
const REHAB_OPEN_CHECKOUT = `/checkout/reserva?service=rehab&date=${TARGET_DATE}&slot=slot-rehab-${TARGET_DATE}-${SLOT_SUFFIX_OPEN}`;
const REHAB_FULL_CHECKOUT = `/checkout/reserva?service=rehab&date=${TARGET_DATE}&slot=slot-rehab-${TARGET_DATE}-${SLOT_SUFFIX_FULL}`;
const RECOVERY_OPEN_CHECKOUT = `/checkout/reserva?service=recovery&date=${TARGET_DATE}&slot=slot-recovery-${TARGET_DATE}-${SLOT_SUFFIX_OPEN}`;
const OUTDATED_NOTICE = /todavía no verificamos plan ni pago/i;
// Next keeps the previous route in the DOM, hidden, after a client navigation.
const VISIBLE = { visible: true } as const;

async function shot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-checkout-booking-${name}.png`),
    fullPage: true,
  });
}

function bookingView(page: Page, testInfo: TestInfo): Locator {
  const view = testInfo.project.name === "mobile" ? "public-booking-mobile" : "public-booking-desktop";
  return page.getByTestId(view);
}

// Desktop: the 10:00 row of the week grid, column of the target day. Mobile: the day chip, then the slot.
async function pickTargetSlot(page: Page, testInfo: TestInfo): Promise<void> {
  const view = bookingView(page, testInfo);
  for (let week = 0; week < TARGET_WEEKS_AHEAD; week += 1) {
    await view.getByRole("button", { name: "Semana siguiente" }).click();
  }
  if (testInfo.project.name === "mobile") {
    await view.getByRole("button").filter({ has: page.getByText(TARGET_DAY_NUMBER, { exact: true }) }).click();
    await view.getByRole("button").filter({ hasText: TARGET_TIME }).filter({ hasText: "Disponible" }).click();
    return;
  }
  const row = view.locator(`xpath=.//div[span[normalize-space()='${TARGET_TIME}']]`);
  await row.locator(":scope > *").nth(isoWeekday(TARGET_DATE)).click();
}

function confirmButton(page: Page, testInfo: TestInfo, label: string): Locator {
  return bookingView(page, testInfo).getByRole("button", { name: label, exact: true });
}

async function confirmAndExpectRefusal(page: Page, testInfo: TestInfo, code: string): Promise<void> {
  const answered = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/bookings",
  );
  await confirmButton(page, testInfo, "Confirmar reserva").click();
  const response = await answered;
  expect(response.status(), "POST /bookings status").toBe(409);
  expect(((await response.json()) as { code: string }).code).toBe(code);
}

async function openReserve(page: Page, service: string): Promise<void> {
  await page.goto(`/reservar?service=${service}`);
  await expect(page.getByRole("heading", { name: "Reservá tu horario." }).filter(VISIBLE)).toBeVisible();
}

async function payAndSimulate(page: Page, outcome: "Aprobar" | "Rechazar"): Promise<void> {
  await page.getByRole("button", { name: PAY_LABEL }).click();
  await expect(page).toHaveURL(/\/checkout\/simulado\?ref=[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: outcome }).click();
  await expect(page).toHaveURL(/\/checkout\/resultado\?ref=[0-9a-f-]{36}/);
}

test.describe("Booking checkout", () => {
  test("Rehab: 10:00 two days from today, Continuar al pago, pay, Aprobar: the result shows the slot", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await openReserve(page, "rehab");
    await expect(page.getByText(OUTDATED_NOTICE)).toHaveCount(0);

    await pickTargetSlot(page, testInfo);
    await shot(page, testInfo, "reserve-picked");
    await confirmButton(page, testInfo, "Continuar al pago").click();

    await expect(page).toHaveURL(new RegExp(`${REHAB_OPEN_CHECKOUT.replace(/[?]/g, "\\?")}$`));
    await expect(page.getByRole("heading", { name: "Confirmá tu reserva.", level: 1 })).toBeVisible();
    await expect(page.getByText("Evaluación y Diagnóstico", { exact: true }).filter(VISIBLE)).toBeVisible();
    await expect(page.getByText("Rehab", { exact: true }).filter(VISIBLE)).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: TARGET_SLOT_LABEL })).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: "60 min" })).toBeVisible();
    await expect(page.getByText("$ 1.800").filter(VISIBLE)).toBeVisible();
    await expect(
      page.getByText("Guardamos tu horario unos minutos mientras completás el pago.").filter(VISIBLE),
    ).toBeVisible();
    await shot(page, testInfo, "summary-rehab");

    await payAndSimulate(page, "Aprobar");
    const result = page.getByRole("status");
    await expect(result.getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeVisible();
    await expect(result.getByText("Tu reserva está confirmada.").filter(VISIBLE)).toBeVisible();
    const details = result.getByRole("definition");
    await expect(result.getByRole("term").filter({ hasText: "Fecha y hora" })).toBeVisible();
    await expect(details.filter({ hasText: TARGET_SLOT_LABEL })).toBeVisible();
    await expect(details.filter({ hasText: "Evaluación y Diagnóstico" })).toBeVisible();
    await expect(details.filter({ hasText: "$ 1.800" })).toBeVisible();
    await shot(page, testInfo, "result-approved");
  });

  test("Rehab: Rechazar says the payment did not complete and Intentar de nuevo goes back to the slots", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(REHAB_OPEN_CHECKOUT);
    await payAndSimulate(page, "Rechazar");

    const result = page.getByRole("status");
    await expect(result.getByRole("heading", { name: "Pago no completado" })).toBeVisible();
    await expect(result.getByText("Rechazado", { exact: true }).filter(VISIBLE)).toBeVisible();
    await expect(page.getByText("¡Listo! Tu pago fue aprobado.").filter(VISIBLE)).toHaveCount(0);
    await shot(page, testInfo, "result-rejected");

    const retry = result.getByRole("link", { name: "Intentar de nuevo" });
    await expect(retry).toHaveAttribute("href", "/reservar?service=rehab");
    await retry.click();
    await expect(page).toHaveURL(/\/reservar\?service=rehab$/);
    await expect(page.getByRole("heading", { name: "Reservá tu horario." }).filter(VISIBLE)).toBeVisible();
  });

  test("the full slot's link says the slot is no longer available", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(REHAB_FULL_CHECKOUT);

    await expect(page.getByRole("heading", { name: "Ese horario ya no está disponible" })).toBeVisible();
    await expect(page.getByText("Elegí otro horario para continuar.").filter(VISIBLE)).toBeVisible();
    await expect(page.getByRole("link", { name: "Elegir otro horario" })).toHaveAttribute(
      "href",
      "/bookings?service=rehab",
    );
    await expect(page.getByRole("button", { name: PAY_LABEL })).toHaveCount(0);
    await shot(page, testInfo, "slot-unavailable");
  });

  for (const [label, url] of [
    ["a malformed date", "/checkout/reserva?service=rehab&date=21-10-2026&slot=slot-rehab-2026-10-21-1000"],
    ["a missing slot", "/checkout/reserva?service=rehab&date=2026-10-21"],
    ["Performance, which is not paid per session", "/checkout/reserva?service=performance&date=2026-10-21&slot=x"],
  ] as const) {
    test(`${label} shows the unavailable state`, async ({ context, page, baseURL }) => {
      await useScenario(context, baseURL!, "none");
      await page.goto(url);
      await expect(page.getByRole("heading", { name: "Ese horario ya no está disponible" })).toBeVisible();
      await expect(page.getByRole("button", { name: PAY_LABEL })).toHaveCount(0);
    });
  }

  test("SLOT_FULL at pay time: the API message and Elegir otro horario", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    // The slot fills up between loading the page and paying: the fake API only knows a full slot up front.
    await page.route("**/api/v1/checkout/booking", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": baseURL!, "Access-Control-Allow-Credentials": "true" },
        body: JSON.stringify({ statusCode: 409, code: "SLOT_FULL", message: "No quedan cupos para este turno." }),
      });
    });
    await page.goto(REHAB_OPEN_CHECKOUT);

    await page.getByRole("button", { name: PAY_LABEL }).click();
    await expect(page.getByRole("alert").filter({ hasText: "No quedan cupos para este turno." })).toBeVisible();
    const another = page.getByRole("link", { name: "Elegir otro horario" });
    await expect(another).toHaveAttribute("href", "/bookings?service=rehab");
    await expect(page.getByRole("button", { name: PAY_LABEL })).toBeDisabled();
    await shot(page, testInfo, "slot-full-at-pay");
  });

  test("checkout-provider-down: the 502 message and the button enabled again", async ({
    context,
    page,
    baseURL,
  }) => {
    await useScenario(context, baseURL!, "checkout-provider-down");
    await page.goto(REHAB_OPEN_CHECKOUT);

    await page.getByRole("button", { name: PAY_LABEL }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "No pudimos iniciar el pago. Probá de nuevo en unos minutos." }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: PAY_LABEL })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Elegir otro horario" })).toHaveCount(0);
  });

  test("Recovery without a pack: Confirmar reserva offers Pagar esta sesión", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await openReserve(page, "recovery");
    await pickTargetSlot(page, testInfo);
    await confirmAndExpectRefusal(page, testInfo, "PACKAGE_REQUIRED");
    await shot(page, testInfo, "recovery-after-confirm");

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Necesitás un paquete con sesiones disponibles para reservar este turno." }),
    ).toBeVisible();
    const paySession = page.getByRole("link", { name: "Pagar esta sesión" });
    await expect(paySession).toBeVisible();
    await expect(paySession).toHaveAttribute("href", RECOVERY_OPEN_CHECKOUT);
    await expect(page.getByText(OUTDATED_NOTICE)).toHaveCount(0);
    await shot(page, testInfo, "recovery-package-required");

    await paySession.click();
    await expect(page.getByRole("heading", { name: "Confirmá tu reserva.", level: 1 })).toBeVisible();
    await expect(page.getByText("Sesión individual", { exact: true }).filter(VISIBLE)).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: TARGET_SLOT_LABEL })).toBeVisible();
    await expect(page.getByText("$ 900").filter(VISIBLE)).toBeVisible();
    await shot(page, testInfo, "summary-recovery");
  });

  test("Performance without a plan: Confirmar reserva offers Ver planes", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await openReserve(page, "performance");
    await pickTargetSlot(page, testInfo);
    await confirmAndExpectRefusal(page, testInfo, "PLAN_REQUIRED");
    await shot(page, testInfo, "performance-after-confirm");

    await expect(
      page.getByRole("alert").filter({ hasText: "Necesitás un plan activo para reservar este turno." }),
    ).toBeVisible();
    const plans = page
      .getByRole("alert")
      .filter({ hasText: "Necesitás un plan activo para reservar este turno." })
      .getByRole("link", { name: "Ver planes" });
    await expect(plans).toBeVisible();
    await expect(plans).toHaveAttribute("href", "/plans");
    await shot(page, testInfo, "performance-plan-required");

    await plans.click();
    await expect(page).toHaveURL(/\/plans$/);
  });

  test("without a session, the booking checkout sends the visitor to /login", async ({ page }) => {
    await page.goto(REHAB_OPEN_CHECKOUT);
    await expect(page).toHaveURL(new RegExp(`/login\\?redirectTo=${encodeURIComponent(REHAB_OPEN_CHECKOUT)}$`));
  });
});
