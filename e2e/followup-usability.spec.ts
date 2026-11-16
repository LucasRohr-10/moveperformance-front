import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { setOwner, setScenario } from "./support/use-scenario";

const MIN_TOUCH_TARGET_PX = 44;
const NARROW_VIEWPORT = { width: 390, height: 844 };
const MAX_TABS = 60;

async function actAs(page: Page, baseURL: string, scenario: Parameters<typeof setScenario>[2]): Promise<void> {
  await setScenario(page.context(), baseURL, scenario);
  await setOwner(page.context(), baseURL, randomUUID());
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

const filters = (page: Page) => page.getByRole("group", { name: "Filtrar alertas" });
const ana = (page: Page) => page.locator("li", { hasText: "Ana Pérez" });
const martin = (page: Page) => page.locator("li", { hasText: "Martín Rodríguez" });

test.describe("Follow-up: usability", () => {
  test("nothing scrolls sideways at 390 px on the follow-up and check-in screens", async ({ page, baseURL }) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    await actAs(page, baseURL!, "staff");

    await page.goto("/staff/follow-up");
    await expect(ana(page)).toBeVisible();
    await expectNoSidewaysScroll(page, "the alerts");

    await ana(page).getByRole("button", { name: "Más acciones" }).click();
    await expect(ana(page).getByRole("link", { name: "Ver historial" })).toBeVisible();
    await expectNoSidewaysScroll(page, "the alerts with the menu open");

    await ana(page).getByRole("button", { name: "Registrar motivo" }).click();
    await expect(ana(page).getByRole("group", { name: "Registrar motivo de inactividad" })).toBeVisible();
    await expectNoSidewaysScroll(page, "the alerts with the reason form open");

    await page.goto("/staff/clients/client-lucia-fernandez");
    await expect(page.getByTestId("followup-detail").filter({ hasText: "Lesión · hasta el 01/11/2026" })).toBeVisible();
    await expectNoSidewaysScroll(page, "the client detail");

    await setScenario(page.context(), baseURL!, "checkin-pending");
    await page.goto("/check-in");
    await page.getByText("Sí, leve", { exact: true }).click();
    await page.getByText("Quiero ajustarlos", { exact: true }).click();
    await expect(page.getByLabel("¿Dónde?")).toBeVisible();
    await expectNoSidewaysScroll(page, "the check-in with both details open");
  });

  test("the filters are reachable by keyboard and say which one is pressed", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff");
    await page.goto("/staff/follow-up");
    const expiring = filters(page).getByRole("button", { name: "Por vencer · 1" });
    await expect(expiring).toHaveAttribute("aria-pressed", "false");

    await tabUntilFocused(page, expiring);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\?tipo=expiring$/);
    await expect(expiring).toHaveAttribute("aria-pressed", "true");
    await expect(filters(page).getByRole("button", { name: "Todas · 8" })).toHaveAttribute("aria-pressed", "false");
  });

  test("a form takes the focus, and closing it gives the focus back to its button", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff");
    await page.goto("/staff/follow-up");

    const open = ana(page).getByRole("button", { name: "Más acciones" });
    await open.click();
    await ana(page).getByRole("button", { name: "Otro canal de contacto" }).click();
    await expect(ana(page).getByLabel("Canal")).toBeFocused();

    await ana(page).getByRole("button", { name: "Volver" }).click();
    await expect(ana(page).getByRole("group", { name: "Contactar a Ana Pérez" })).toHaveCount(0);
    await expect(open).toBeFocused();
  });

  test("the main actions are at least 44 px high on a phone", async ({ page, baseURL }) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    await actAs(page, baseURL!, "staff");

    await page.goto("/staff/follow-up");
    await expectTouchTarget(filters(page).getByRole("button", { name: "Todas · 8" }), "Todas");
    await expectTouchTarget(
      martin(page).getByRole("link", { name: "Escribir por WhatsApp a Martín Rodríguez" }),
      "WhatsApp",
    );
    await expectTouchTarget(ana(page).getByRole("button", { name: "Marcar gestionado" }), "Marcar gestionado");
    await expectTouchTarget(ana(page).getByRole("button", { name: "Más acciones" }), "Más acciones");

    await ana(page).getByRole("button", { name: "Más acciones" }).click();
    await expectTouchTarget(ana(page).getByRole("link", { name: "Ver historial" }), "Ver historial");
    await expectTouchTarget(ana(page).getByRole("button", { name: "Registrar motivo" }), "Registrar motivo");
    await ana(page).getByRole("button", { name: "Otro canal de contacto" }).click();
    await expectTouchTarget(ana(page).getByRole("button", { name: "Registrar envío" }), "Registrar envío");
    await expectTouchTarget(ana(page).getByRole("button", { name: "Volver" }), "Volver");

    await setScenario(page.context(), baseURL!, "checkin-pending");
    await page.goto("/check-in");
    await expectTouchTarget(page.locator("label", { has: page.getByRole("radio", { name: "Bien", exact: true }) }), "Bien");
    await expectTouchTarget(page.getByRole("button", { name: "Enviar respuesta" }), "Enviar respuesta");

    await page.goto("/dashboard");
    await expectTouchTarget(page.getByRole("link", { name: "Responder check-in" }), "Responder check-in");
  });
});
