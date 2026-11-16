import path from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { SCENARIOS, type ScenarioName, type SpecialScenario } from "./support/scenarios";
import { useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";
const MIN_TOUCH_TARGET_PX = 44;
const NARROW_VIEWPORT = { width: 360, height: 780 };
const MAX_TABS = 40;

async function shot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-${name}.png`),
    fullPage: true,
  });
}

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth ||
      document.body.scrollWidth > document.body.clientWidth,
  );
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

test.describe("Usability tasks for the client role", () => {
  test("task 1: knowing until when I can train, with 0 clicks", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "active");
    await page.goto("/dashboard");

    const endDate = page.getByText("Vence 15/11/2026", { exact: true });
    const daysLeft = page.getByText("días restantes", { exact: true });
    await expect(endDate).toBeVisible();
    await expect(daysLeft).toBeVisible();

    expect(await isInFirstViewport(endDate), "end date inside the first viewport").toBe(true);
    expect(await isInFirstViewport(daysLeft), "days left inside the first viewport").toBe(true);
    await shot(page, testInfo, "usability-1-active");
  });

  test("task 2: knowing how many Recovery sessions are left, without scrolling sideways", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "packs");
    await page.goto("/dashboard");

    const rows = page
      .getByRole("list")
      .filter({ has: page.getByText("Paquete 4 sesiones") })
      .getByRole("listitem");
    await expect(rows).toHaveCount(2);

    const viewport = page.viewportSize();
    const expectations = [
      { start: "Comprado 10/10/2026", expiry: "Vence en 27 días · 08/11/2026" },
      { start: "Comprado 20/09/2026", expiry: "Vence en 68 días · 19/12/2026" },
    ];
    for (const [index, expected] of expectations.entries()) {
      for (const text of [expected.start, expected.expiry]) {
        const line = rows.nth(index).getByText(text);
        await expect(line).toBeVisible();
        const box = await line.boundingBox();
        expect(box, `${text} has a box`).not.toBeNull();
        expect(box!.x, `${text} starts inside the viewport`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${text} ends inside the viewport`).toBeLessThanOrEqual(
          viewport!.width,
        );
      }
    }
    expect(await hasHorizontalScroll(page), "page scrolls sideways").toBe(false);
    await shot(page, testInfo, "usability-2-packs");
  });

  test("task 2b: renewing an expiring Recovery pack with a touch-sized link", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "packs-expiring");
    await page.goto("/dashboard");

    const renew = page.getByRole("link", { name: "Renovar plan" });
    await expect(renew).toBeVisible();
    const box = await renew.boundingBox();
    await shot(page, testInfo, "usability-2b-packs-expiring");

    if (testInfo.project.name === "mobile") {
      expect(box!.height, `"Renovar plan" is ${box!.height}px high`).toBeGreaterThanOrEqual(
        MIN_TOUCH_TARGET_PX,
      );
    }
    expect(await hasHorizontalScroll(page), "page scrolls sideways").toBe(false);
  });

  test("task 2c: renewing an expiring Performance plan with a touch-sized link", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "expiring");
    await page.goto("/dashboard");

    const renew = page.getByRole("link", { name: "Renovar plan" });
    await expect(renew).toBeVisible();
    const box = await renew.boundingBox();
    await shot(page, testInfo, "usability-2c-expiring");

    if (testInfo.project.name === "mobile") {
      expect(box!.height, `"Renovar plan" is ${box!.height}px high`).toBeGreaterThanOrEqual(
        MIN_TOUCH_TARGET_PX,
      );
    }
    expect(await hasHorizontalScroll(page), "page scrolls sideways").toBe(false);
  });

  test("task 4: starting without a plan, in 1 click and with the keyboard", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto("/dashboard");

    const plans = page.getByRole("link", { name: "Ver planes" });
    await expect(plans).toBeVisible();

    await tabUntilFocused(page, plans);
    await expect(plans).toBeFocused();
    const ring = await focusRingOf(plans);
    await shot(page, testInfo, "usability-4-none-focused");
    expect(
      ring.outline !== "none" || ring.boxShadow !== "none",
      `"Ver planes" has a visible focus ring (outline: ${ring.outline}, box-shadow: ${ring.boxShadow})`,
    ).toBe(true);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/plans$/);

    await page.goBack();
    await expect(plans).toBeVisible();
    await plans.click();
    await expect(page).toHaveURL(/\/plans$/);
  });

  test("task 5: understanding an error, and retrying with the keyboard", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "error");
    await page.goto("/dashboard");

    const alert = page.getByRole("alert").filter({ hasText: "No pudimos cargar tu plan." });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Probá de nuevo en unos minutos.");
    await shot(page, testInfo, "usability-5-error");

    const retry = page.getByRole("link", { name: "Reintentar" });
    await tabUntilFocused(page, retry);
    await expect(retry).toBeFocused();
    const ring = await focusRingOf(retry);
    expect(
      ring.outline !== "none" || ring.boxShadow !== "none",
      `"Reintentar" has a visible focus ring (outline: ${ring.outline}, box-shadow: ${ring.boxShadow})`,
    ).toBe(true);

    const reload = page.waitForRequest(
      (request) => new URL(request.url()).pathname === "/dashboard",
    );
    await page.keyboard.press("Enter");
    await reload;
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
  });
});

test.describe("Global criteria at 360 px", () => {
  const dataScenarios = Object.keys(SCENARIOS) as ScenarioName[];
  const allScenarios: Array<ScenarioName | SpecialScenario> = [...dataScenarios, "error", "slow"];

  for (const scenario of allScenarios) {
    test(`no horizontal scroll in ${scenario}`, async ({ context, page, baseURL }, testInfo) => {
      await page.setViewportSize(NARROW_VIEWPORT);
      await useScenario(context, baseURL!, scenario);
      await page.goto("/dashboard");

      if (scenario === "error") {
        await expect(page.getByRole("alert").filter({ hasText: "No pudimos cargar tu plan." })).toBeVisible();
      } else if (scenario === "none") {
        await expect(page.getByRole("heading", { name: "Todavía no tenés un plan activo" })).toBeVisible();
      } else if (scenario === "packs") {
        await expect(page.getByText("Recovery · Tus paquetes", { exact: true })).toBeVisible();
      } else if (scenario === "packs-expiring") {
        await expect(page.getByText("Recovery · Tu paquete", { exact: true })).toBeVisible();
      } else {
        await expect(page.getByRole("heading", { level: 2, name: /^Plan / })).toBeVisible();
      }

      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      await shot(page, testInfo, `usability-360-${scenario}`);
      expect(
        metrics.scrollWidth,
        `scrollWidth ${metrics.scrollWidth} must not exceed clientWidth ${metrics.clientWidth}`,
      ).toBeLessThanOrEqual(metrics.clientWidth);
    });
  }

  test("touch target of 'Ver planes' is at least 44 px high on mobile", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "touch targets are a mobile criterion");

    await useScenario(context, baseURL!, "none");
    await page.goto("/dashboard");
    const box = await page.getByRole("link", { name: "Ver planes" }).boundingBox();
    await shot(page, testInfo, "usability-touch-none");

    expect(box!.height, `"Ver planes" is ${box!.height}px high`).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET_PX,
    );
  });

  test("touch target of 'Ver planes' on an expired plan is at least 44 px high on mobile", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "touch targets are a mobile criterion");

    await useScenario(context, baseURL!, "expired");
    await page.goto("/dashboard");
    const box = await page.getByRole("link", { name: "Ver planes" }).boundingBox();
    await shot(page, testInfo, "usability-touch-expired");

    expect(box!.height, `"Ver planes" is ${box!.height}px high`).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET_PX,
    );
  });

  test("touch target of 'Reintentar' is at least 44 px high on mobile", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "touch targets are a mobile criterion");

    await useScenario(context, baseURL!, "error");
    await page.goto("/dashboard");
    const box = await page.getByRole("link", { name: "Reintentar" }).boundingBox();
    await shot(page, testInfo, "usability-touch-error");

    expect(box!.height, `"Reintentar" is ${box!.height}px high`).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET_PX,
    );
  });

  test("the heading does not move when the section finishes loading", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "slow");
    await page.goto("/dashboard", { waitUntil: "commit" });

    const heading = page.getByRole("heading", { name: "Hola, Ana." });
    await expect(heading).toBeVisible();
    await expect(page.getByText("Cargando tu plan…")).toBeVisible();
    const before = await heading.boundingBox();
    await shot(page, testInfo, "usability-heading-loading");

    await expect(page.getByRole("heading", { level: 2, name: /^Plan / })).toBeVisible();
    const after = await heading.boundingBox();
    await shot(page, testInfo, "usability-heading-loaded");

    expect(after).toEqual(before);
  });
});
