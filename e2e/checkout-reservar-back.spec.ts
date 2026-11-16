import path from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { bookingDayFromToday, type BookingDay } from "./support/booking-day";
import { openSlotId } from "./support/offline-charges-fixtures";
import { useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";
// The servers render with the real clock, so the slots are always one and two days from today.
const FIRST_DAY = bookingDayFromToday(1);
const OTHER_DAY = bookingDayFromToday(2);
const TARGET_TIME = "10:00";
const CONTINUE_LABEL = "Continuar al pago";
const PAY_LABEL = "Pagar con Mercado Pago";
const BUSY_LABEL = "Reservando…";
const checkoutPathFor = (day: BookingDay): string =>
  `/checkout/reserva?service=rehab&date=${day.date}&slot=${openSlotId("rehab", day.date)}`;
const FIRST_CHECKOUT = new RegExp(`${checkoutPathFor(FIRST_DAY).replace("?", "\\?")}$`);
const OTHER_CHECKOUT_PATH = checkoutPathFor(OTHER_DAY);
const BOOKINGS_REHAB = /\/bookings\?service=rehab$/;
const RESERVE_REHAB = /\/reservar\?service=rehab$/;
const SLOT_FULL_MESSAGE = "No quedan cupos para este turno.";
// Next keeps up to 3 visited routes in the DOM, hidden, and their React state alive.
const VISIBLE = { visible: true } as const;

async function shot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-checkout-reservar-back-${name}.png`),
    fullPage: true,
  });
}

function bookingView(page: Page, testInfo: TestInfo): Locator {
  const view = testInfo.project.name === "mobile" ? "public-booking-mobile" : "public-booking-desktop";
  return page.getByTestId(view);
}

// Desktop: the 10:00 row of the week grid, column of the day. Mobile: the day chip, then the slot.
async function pickSlot(page: Page, testInfo: TestInfo, day: BookingDay): Promise<void> {
  const view = bookingView(page, testInfo);
  for (let week = 0; week < day.weeksAhead; week += 1) {
    await view.getByRole("button", { name: "Semana siguiente" }).click();
  }
  if (testInfo.project.name === "mobile") {
    await view.getByRole("button").filter({ has: page.getByText(day.number, { exact: true }) }).click();
    await view.getByRole("button").filter({ hasText: TARGET_TIME }).filter({ hasText: "Disponible" }).click();
    return;
  }
  const row = view.locator(`xpath=.//div[span[normalize-space()='${TARGET_TIME}']]`);
  await row.locator(":scope > *").nth(day.weekday).click();
}

function continueButton(page: Page, testInfo: TestInfo): Locator {
  return bookingView(page, testInfo).getByRole("button", { name: CONTINUE_LABEL, exact: true });
}

async function openReserve(page: Page): Promise<void> {
  await page.goto("/reservar?service=rehab");
  await expect(page.getByRole("heading", { name: "Reservá tu horario." }).filter(VISIBLE)).toBeVisible();
}

async function continueToCheckout(page: Page, testInfo: TestInfo, checkout: RegExp): Promise<void> {
  await continueButton(page, testInfo).click();
  await expect(page).toHaveURL(checkout);
  await expect(page.getByRole("heading", { name: "Confirmá tu reserva.", level: 1 })).toBeVisible();
}

async function expectReserveUsable(page: Page, testInfo: TestInfo): Promise<void> {
  await expect(page).toHaveURL(RESERVE_REHAB);
  await expect(page.getByRole("heading", { name: "Reservá tu horario." }).filter(VISIBLE)).toBeVisible();
  await expect(continueButton(page, testInfo)).toBeEnabled();
  await expect(bookingView(page, testInfo).getByText(BUSY_LABEL).filter(VISIBLE)).toHaveCount(0);
  // The mobile overlay with its ✕ stays closed: nothing traps the client on the way back.
  await expect(page.getByLabel("Volver a la grilla").filter(VISIBLE)).toHaveCount(0);
}

test.describe("Back to /reservar from the booking checkout", () => {
  test("browser back after Continuar al pago leaves /reservar usable", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await openReserve(page);
    await pickSlot(page, testInfo, FIRST_DAY);
    await continueToCheckout(page, testInfo, FIRST_CHECKOUT);

    await page.goBack();

    await expectReserveUsable(page, testInfo);
    await shot(page, testInfo, "after-back");
    await continueToCheckout(page, testInfo, FIRST_CHECKOUT);
  });

  test("Elegir otro horario after SLOT_FULL goes to the bookings page and the next slot is payable", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    // The slot fills up between loading the checkout and paying: the fake API only knows a full slot up front.
    await page.route("**/api/v1/checkout/booking", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": baseURL!, "Access-Control-Allow-Credentials": "true" },
        body: JSON.stringify({ statusCode: 409, code: "SLOT_FULL", message: SLOT_FULL_MESSAGE }),
      });
    });
    await openReserve(page);
    await pickSlot(page, testInfo, FIRST_DAY);
    await continueToCheckout(page, testInfo, FIRST_CHECKOUT);

    await page.getByRole("button", { name: PAY_LABEL }).click();
    await expect(page.getByRole("alert").filter({ hasText: SLOT_FULL_MESSAGE })).toBeVisible();
    await expect(page.getByRole("button", { name: PAY_LABEL })).toBeDisabled();
    await page.getByRole("link", { name: "Elegir otro horario" }).click();

    // Signed-in clients choose again on their own booking page, not on the public /reservar.
    await expect(page).toHaveURL(BOOKINGS_REHAB);
    await shot(page, testInfo, "after-pick-another");
    await page.goto(OTHER_CHECKOUT_PATH);
    await expect(page.getByRole("heading", { name: "Confirmá tu reserva.", level: 1 })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: SLOT_FULL_MESSAGE })).toHaveCount(0);
    await expect(page.getByRole("button", { name: PAY_LABEL })).toBeEnabled();
  });
});
