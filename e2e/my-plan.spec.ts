import { randomUUID } from "node:crypto";
import path from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { setOwner, useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";

async function shot(page: Page, testInfo: TestInfo, scenario: string): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-${scenario}.png`),
    fullPage: true,
  });
}

function alertWith(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

test.describe("Mi plan in the client dashboard", () => {
  test("active: shows the plan, its days left and its progress, without a renew link", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "active");
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Plan Trimestral", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
    await expect(page.getByText("Inicio 15/08/2026", { exact: true })).toBeVisible();
    await expect(page.getByText("Vence 15/11/2026", { exact: true })).toBeVisible();

    const progress = page.getByRole("progressbar", { name: "Progreso del período" });
    await expect(progress).toHaveAttribute("aria-valuenow", "63");
    await expect(progress).toHaveAttribute("aria-valuemin", "0");
    await expect(progress).toHaveAttribute("aria-valuemax", "100");
    await expect(progress).toHaveAttribute("aria-valuetext", "34 días restantes");
    await expect(page.getByText("34", { exact: true })).toBeVisible();
    await expect(page.getByText("días restantes", { exact: true })).toBeVisible();

    await expect(page.getByRole("link", { name: "Renovar plan" })).toHaveCount(0);
    await expect(page.getByText("Próximamente", { exact: true })).toHaveCount(0);

    await shot(page, testInfo, "active");
  });

  test("active-last-day: says it is the plan's last day", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "active-last-day");
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 2, name: "Plan Mensual", exact: true })).toBeVisible();
    await expect(page.getByText("Hoy", { exact: true })).toBeVisible();
    await expect(page.getByText("último día", { exact: true })).toBeVisible();
    await expect(page.getByText("Vence 12/10/2026", { exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Progreso del período" })).toHaveAttribute(
      "aria-valuetext",
      "Vence hoy",
    );

    await shot(page, testInfo, "active-last-day");
  });

  test("expiring: warns that the plan is about to expire and offers to renew it", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "expiring");
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 2, name: "Plan Mensual", exact: true })).toBeVisible();
    await expect(page.getByText("Por vencer", { exact: true })).toBeVisible();
    await expect(page.getByText("10", { exact: true })).toBeVisible();
    await expect(page.getByText("días restantes", { exact: true })).toBeVisible();
    const renew = page.getByRole("link", { name: "Renovar plan" });
    await expect(renew).toBeVisible();
    await expect(renew).toHaveAttribute("href", "/plans");

    await shot(page, testInfo, "expiring");
  });

  test("auto-debit-active: shows no warning while an authorized debit renews the plan", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "auto-debit-active");
    await setOwner(context, baseURL!, randomUUID());
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 2, name: "Plan Mensual", exact: true })).toBeVisible();
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
    await expect(page.getByText("Por vencer", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Renovar plan" })).toHaveCount(0);

    await shot(page, testInfo, "auto-debit-active");
  });

  test("expiring-queued: shows no warning while a later plan is already paid", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "expiring-queued");
    await page.goto("/dashboard");

    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
    await expect(page.getByText("Ya pagado", { exact: true })).toBeVisible();
    await expect(page.getByText("Por vencer", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Renovar plan" })).toHaveCount(0);

    await shot(page, testInfo, "expiring-queued");
  });

  test("active-with-upcoming: shows the next plan as already paid", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "active-with-upcoming");
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { level: 2, name: "Plan Trimestral", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Ya pagado", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Empieza el 16/11/2026, cuando termina tu plan actual · hasta 15/02/2027"),
    ).toBeVisible();

    await shot(page, testInfo, "active-with-upcoming");
  });

  test("active-with-two-upcoming: shows both queued plans as already paid", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "active-with-two-upcoming");
    await page.goto("/dashboard");

    await expect(page.getByText("Ya pagado", { exact: true })).toHaveCount(2);
    await expect(
      page.getByRole("heading", { level: 3, name: "Plan Trimestral", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: "Plan Mensual", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Empieza el 16/02/2027, cuando termina el plan anterior · hasta 15/03/2027"),
    ).toBeVisible();

    await shot(page, testInfo, "active-with-two-upcoming");
  });

  test("scheduled: shows a plan that has not started, without progress", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "scheduled");
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 2, name: "Plan Mensual", exact: true })).toBeVisible();
    await expect(page.getByText("Próximo", { exact: true })).toBeVisible();
    await expect(page.getByText("Empieza el 01/11/2026 · vence el 30/11/2026")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Renovar plan" })).toHaveCount(0);

    await shot(page, testInfo, "scheduled");
  });

  test("expired: shows an expired plan and tells the client to pick a new one", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "expired");
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { level: 2, name: "Plan Semestral", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Vencido", { exact: true })).toBeVisible();
    await expect(page.getByText("Venció el 30/09/2026")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(
      page.getByText("Tu plan venció. Elegí uno nuevo para seguir reservando."),
    ).toBeVisible();
    const plans = page.getByRole("link", { name: "Ver planes" });
    await expect(plans).toBeVisible();
    await expect(plans).toHaveAttribute("href", "/plans");
    await expect(page.getByRole("link", { name: "Renovar plan" })).toHaveCount(0);
    await expect(page.getByText("Próximamente", { exact: true })).toHaveCount(0);

    await shot(page, testInfo, "expired");
  });

  test("packs: lists the Recovery packs in order with their sessions", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "packs");
    await page.goto("/dashboard");

    await expect(page.getByText("Recovery · Tus paquetes", { exact: true })).toBeVisible();
    const rows = page
      .getByRole("list")
      .filter({ has: page.getByText("Paquete 4 sesiones") })
      .getByRole("listitem");
    await expect(rows).toHaveCount(2);

    const first = rows.nth(0);
    await expect(first.getByRole("heading", { name: "Paquete 4 sesiones" })).toBeVisible();
    await expect(first.getByText("Sin sesiones", { exact: true })).toHaveCount(0);
    await expect(first.getByText("sesiones disponibles", { exact: true })).toBeVisible();
    await expect(first.getByText("Comprado 10/10/2026", { exact: true })).toBeVisible();
    await expect(first.getByText("Vence en 27 días · 08/11/2026", { exact: true })).toBeVisible();
    const firstMeter = first.getByRole("meter", { name: "Sesiones usadas" });
    await expect(firstMeter).toHaveAttribute("aria-valuenow", "1");
    await expect(firstMeter).toHaveAttribute("aria-valuemax", "4");
    await expect(firstMeter).toHaveAttribute("aria-valuetext", "1 de 4 sesiones usadas");

    const second = rows.nth(1);
    await expect(second.getByRole("heading", { name: "Paquete 8 sesiones" })).toBeVisible();
    await expect(second.getByText("Sin sesiones", { exact: true })).toBeVisible();
    await expect(second.getByText("Vence en 68 días · 19/12/2026", { exact: true })).toBeVisible();
    const secondMeter = second.getByRole("meter", { name: "Sesiones usadas" });
    await expect(secondMeter).toHaveAttribute("aria-valuenow", "8");
    await expect(secondMeter).toHaveAttribute("aria-valuetext", "8 de 8 sesiones usadas");

    await shot(page, testInfo, "packs");
  });

  test("packs-expiring: warns about a pack about to expire and offers to renew it", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "packs-expiring");
    await page.goto("/dashboard");

    const row = page.getByRole("listitem").filter({ has: page.getByText("Paquete 4 sesiones") });
    await expect(row.getByText("Por vencer", { exact: true })).toBeVisible();
    await expect(row.getByText("Vence en 8 días · 20/10/2026", { exact: true })).toBeVisible();
    const renew = row.getByRole("link", { name: "Renovar plan" });
    await expect(renew).toBeVisible();
    await expect(renew).toHaveAttribute("href", "/plans");

    await shot(page, testInfo, "packs-expiring");
  });

  test("none: offers the plans page when there is nothing yet", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Todavía no tenés un plan activo" }),
    ).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await shot(page, testInfo, "none");

    await page.getByRole("link", { name: "Ver planes" }).click();
    await expect(page).toHaveURL(/\/plans$/);
  });

  test("error: keeps the greeting and offers to retry", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "error");
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
    await expect(alertWith(page, "No pudimos cargar tu plan.")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);
    await shot(page, testInfo, "error");

    const retry = page.getByRole("link", { name: "Reintentar" });
    await expect(retry).toHaveAttribute("href", "/dashboard");
    const reload = page.waitForRequest(
      (request) => new URL(request.url()).pathname === "/dashboard",
    );
    await retry.click();
    await reload;

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
    await expect(alertWith(page, "No pudimos cargar tu plan.")).toBeVisible();
  });

  test("slow: shows the loading card first and then the plan", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "slow");
    await page.goto("/dashboard", { waitUntil: "commit" });

    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
    await expect(page.getByText("Cargando tu plan…")).toBeVisible();
    await shot(page, testInfo, "slow-loading");

    await expect(
      page.getByRole("heading", { level: 2, name: "Plan Trimestral", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Cargando tu plan…")).toHaveCount(0);
    await shot(page, testInfo, "slow-loaded");
  });

  test("full: shows the plan, the next plan and the packs together", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "full");
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { level: 2, name: "Plan Trimestral", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Ya pagado", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Empieza el 16/11/2026, cuando termina tu plan actual · hasta 15/02/2027"),
    ).toBeVisible();
    await expect(page.getByText("Recovery · Tus paquetes", { exact: true })).toBeVisible();
    await expect(page.getByRole("meter", { name: "Sesiones usadas" }).first()).toHaveAttribute(
      "aria-valuetext",
      "1 de 4 sesiones usadas",
    );
    await expect(page.getByText("Sin sesiones", { exact: true })).toBeVisible();

    await shot(page, testInfo, "full");
  });

  test("long-name: shows long plan and pack names in full", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "long-name");
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Plan Semestral de alto rendimiento con seguimiento",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Paquete Recovery de 12 sesiones con fisioterapia")).toBeVisible();
    await expect(page.getByRole("meter", { name: "Sesiones usadas" })).toHaveAttribute(
      "aria-valuetext",
      "3 de 12 sesiones usadas",
    );
    await expect(page.getByRole("link", { name: "Renovar plan" })).toHaveCount(0);

    await shot(page, testInfo, "long-name");
  });
});
