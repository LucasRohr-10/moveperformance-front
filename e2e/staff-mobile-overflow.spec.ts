import { randomUUID } from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { businessDateFromToday, SEEDED_CHARGE_IDS } from "./support/offline-charges-fixtures";
import { OWNER_COOKIE, SCENARIO_COOKIE } from "./support/scenarios";
import { setOwner, setScenario } from "./support/use-scenario";

const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;

test.use({ viewport: { width: 375, height: 667 } });

// The table scrolls inside its own wrapper, so nothing of it may widen the page, and the wrapper must still scroll.
async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const widths = await page.evaluate(() => {
    const wrapper = document.querySelector("table")?.parentElement;
    return {
      page: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      wrapperScrollWidth: wrapper?.scrollWidth ?? 0,
      wrapperClientWidth: wrapper?.clientWidth ?? 0,
    };
  });

  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  expect(widths.wrapperScrollWidth).toBeGreaterThan(widths.wrapperClientWidth);
}

// The fake API only flags a payment for review when a paid offline booking is cancelled afterwards.
async function flagOnePaymentForReview(request: APIRequestContext, owner: string): Promise<void> {
  const headers = { Cookie: `${SCENARIO_COOKIE}=staff-booking; ${OWNER_COOKIE}=${owner}` };
  const paid = await request.post(`${API}/staff/offline-charges/${SEEDED_CHARGE_IDS.sofia}/payment`, {
    headers,
    data: { method: "cash", amount: 900, paidOn: businessDateFromToday(0) },
  });
  expect(paid.status()).toBe(200);
  const cancelled = await request.post(`${API}/staff/bookings/booking-sofia-recovery/cancel`, {
    headers,
    data: { reason: "Viaja" },
  });
  expect(cancelled.status()).toBe(200);
}

test.describe("Staff tables on the phone", () => {
  test("Pagos with needsAttention does not scroll sideways at 375", async ({ page, request, baseURL }) => {
    const owner = randomUUID();
    await setScenario(page.context(), baseURL!, "staff-booking");
    await setOwner(page.context(), baseURL!, owner);
    await flagOnePaymentForReview(request, owner);

    await page.goto("/staff/payments?needsAttention=true");
    await expect(page.getByRole("table", { name: "Pagos" })).toBeVisible();

    await expectNoSidewaysScroll(page);
  });

  test("Clientes with vence=pronto does not scroll sideways at 375", async ({ page, baseURL }) => {
    await setScenario(page.context(), baseURL!, "staff-clients");
    await setOwner(page.context(), baseURL!, randomUUID());

    await page.goto("/staff/clients?vence=pronto");
    await expect(page.getByRole("table", { name: "Clientes" })).toBeVisible();

    await expectNoSidewaysScroll(page);
  });
});
