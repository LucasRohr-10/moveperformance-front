import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

import type { AutoDebitCheckoutDto } from "@/lib/api/types";

import { E2E_PLAN_IDS } from "./support/checkout-fixtures";
import { OWNER_COOKIE, SCENARIO_COOKIE } from "./support/scenarios";
import { setOwner, setScenario } from "./support/use-scenario";

const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;
const MIN_TOUCH_TARGET_PX = 44;
const NARROW_VIEWPORT = { width: 390, height: 844 };
const MAX_TABS = 40;
const MENSUAL_CHECKOUT = `/checkout/plan/${E2E_PLAN_IDS.mensual}`;

async function actAs(page: Page, baseURL: string, scenario: Parameters<typeof setScenario>[2]): Promise<string> {
  const owner = randomUUID();
  await setScenario(page.context(), baseURL, scenario);
  await setOwner(page.context(), baseURL, owner);
  return owner;
}

async function pendingDebitReference(page: Page, owner: string, scenario: string): Promise<string> {
  const response = await page.request.post(`${API}/me/auto-debits`, {
    headers: { Cookie: `${SCENARIO_COOKIE}=${scenario}; ${OWNER_COOKIE}=${owner}` },
    data: { planId: E2E_PLAN_IDS.mensual },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as AutoDebitCheckoutDto).externalReference;
}

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth ||
      document.body.scrollWidth > document.body.clientWidth,
  );
}

async function expectNoSidewaysScroll(page: Page, screen: string): Promise<void> {
  expect(await hasHorizontalScroll(page), `${screen} scrolls sideways`).toBe(false);
}

async function tabUntilFocused(page: Page, target: Locator): Promise<void> {
  for (let presses = 0; presses < MAX_TABS; presses += 1) {
    await page.keyboard.press("Tab");
    const focused = await target.evaluate((element) => element === document.activeElement);
    if (focused) return;
  }
  throw new Error(`Tab did not reach the element in ${MAX_TABS} presses`);
}

async function expectTouchTarget(locator: Locator, name: string): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box!.height, `"${name}" is ${box!.height}px high`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
}

test.describe("Automatic debit: usability", () => {
  test("nothing scrolls sideways at 390 px on any of the debit screens", async ({ page, baseURL }) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    const owner = await actAs(page, baseURL!, "active");
    const reference = await pendingDebitReference(page, owner, "none");

    await setScenario(page.context(), baseURL!, "active");
    await page.goto(MENSUAL_CHECKOUT);
    await page.getByRole("radio", { name: "Débito automático" }).check();
    await expectNoSidewaysScroll(page, "the checkout with the debit chosen");

    await setScenario(page.context(), baseURL!, "auto-debit-active");
    await page.goto(MENSUAL_CHECKOUT);
    await expect(page.getByText("Ya tenés débito automático activo para Performance.")).toBeVisible();
    await expectNoSidewaysScroll(page, "the checkout blocked by an active debit");

    await page.goto(`/checkout/simulado?debito=${reference}`);
    await expect(page.getByRole("button", { name: "Cobrar ciclo (rechazado)" })).toBeVisible();
    await expectNoSidewaysScroll(page, "the simulator");

    await page.goto(`/checkout/resultado?debito=${reference}`);
    await expect(page.getByRole("heading", { name: "Confirmando tu débito" })).toBeVisible();
    await expectNoSidewaysScroll(page, "the result");

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Cancelar débito" }).click();
    await expect(page.getByText("¿Cancelar el débito automático?")).toBeVisible();
    await expectNoSidewaysScroll(page, "the profile with the confirmation open");
  });

  test("the payment options are reachable by keyboard, with the arrow keys and a visible focus", async ({
    page,
    baseURL,
  }) => {
    await actAs(page, baseURL!, "none");
    await page.goto(MENSUAL_CHECKOUT);
    const single = page.getByRole("radio", { name: "Pago único" });
    const debit = page.getByRole("radio", { name: "Débito automático" });

    await tabUntilFocused(page, single);
    const ring = await single.locator("xpath=ancestor::label").evaluate((label) => getComputedStyle(label).boxShadow);
    expect(ring).not.toBe("none");

    await page.keyboard.press("ArrowDown");
    await expect(debit).toBeChecked();
    await expect(debit).toBeFocused();
    await expect(page.getByRole("button", { name: "Activar débito automático" })).toBeVisible();
  });

  test("the confirmation takes the focus, and going back gives the screen the same as before", async ({
    page,
    baseURL,
  }) => {
    await actAs(page, baseURL!, "auto-debit-active");
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Cancelar débito" }).click();
    await expect(page.getByRole("button", { name: "Volver" })).toBeFocused();

    await page.getByRole("button", { name: "Volver" }).click();
    await expect(page.getByText("¿Cancelar el débito automático?")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancelar débito" })).toBeVisible();
  });

  test("the main actions are at least 44 px high on a phone", async ({ page, baseURL }) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    const owner = await actAs(page, baseURL!, "active");
    const reference = await pendingDebitReference(page, owner, "none");

    await page.goto(MENSUAL_CHECKOUT);
    await expectTouchTarget(page.locator("label", { has: page.getByRole("radio", { name: "Pago único" }) }), "Pago único");
    await page.getByRole("radio", { name: "Débito automático" }).check();
    await expectTouchTarget(page.getByRole("button", { name: "Activar débito automático" }), "Activar débito automático");

    await setScenario(page.context(), baseURL!, "auto-debit-active");
    await page.goto(MENSUAL_CHECKOUT);
    await expectTouchTarget(page.getByRole("link", { name: "Gestionarlo en mi perfil" }), "Gestionarlo en mi perfil");

    await page.goto(`/checkout/simulado?debito=${reference}`);
    for (const name of ["Autorizar", "Cobrar ciclo (aprobado)", "Cobrar ciclo (rechazado)", "Cancelar"]) {
      await expectTouchTarget(page.getByRole("button", { name }), name);
    }

    await page.goto("/dashboard");
    await expectTouchTarget(page.getByRole("button", { name: "Cancelar débito" }), "Cancelar débito");
    await page.getByRole("button", { name: "Cancelar débito" }).click();
    await expectTouchTarget(page.getByRole("button", { name: "Volver" }), "Volver");
    await expectTouchTarget(page.getByRole("button", { name: "Sí, cancelar débito" }), "Sí, cancelar débito");
  });
});
