import path from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { E2E_PLAN_IDS } from "./support/checkout-fixtures";
import { planAction, selectPlan } from "./support/plan-selector";
import { useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";
const PAY_LABEL = "Pagar con Mercado Pago";
const PROVIDER_ERROR_MESSAGE = "No pudimos iniciar el pago. Probá de nuevo en unos minutos.";
const CHECKOUT_POST_PATH = "/api/v1/checkout/plan";
// Next keeps the previous route in the DOM, hidden, after a client navigation.
const VISIBLE = { visible: true } as const;
const RENEWAL_NOTICE = /^Ya tenés un plan de Performance activo/;

async function shot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-checkout-plan-${name}.png`),
    fullPage: true,
  });
}

// The renewal notice shows each date under its label, in the "Cuándo empieza" section.
function dateUnder(page: Page, label: string) {
  return page.getByText(label, { exact: true }).filter(VISIBLE).locator("xpath=following-sibling::span");
}

function payButton(page: Page) {
  return page.getByRole("button", { name: PAY_LABEL });
}

function countCheckoutPosts(page: Page): () => number {
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === CHECKOUT_POST_PATH) posts += 1;
  });
  return () => posts;
}

async function payUntilSimulator(page: Page): Promise<void> {
  await payButton(page).click();
  await expect(page).toHaveURL(/\/checkout\/simulado\?ref=[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Simulador de pagos (desarrollo)" })).toBeVisible();
}

// The plan flow keeps a trace in every run, as evidence (Step 4).
test.use({ trace: "on" });

test.describe("Plan checkout", () => {
  test.describe("from /plans to an approved payment", () => {
    test("Contratar on Trimestral, pay, Aprobar: the result says approved", async ({
      context,
      page,
      baseURL,
    }, testInfo) => {
      await useScenario(context, baseURL!, "none");
      await page.goto("/plans");
      await expect(page.getByRole("heading", { name: "Planes", level: 1 })).toBeVisible();
      await shot(page, testInfo, "plans");

      await selectPlan(page, "Plan Trimestral");
      await planAction(page, "Contratar").click();
      await expect(page).toHaveURL(/\/checkout\/plan\/plan-trimestral$/);
      await expect(page.getByRole("heading", { name: "Confirmá tu plan.", level: 1 })).toBeVisible();
      await expect(page.getByText("Plan Trimestral", { exact: true }).filter(VISIBLE)).toBeVisible();
      await expect(page.getByText("$ 10.500").filter(VISIBLE)).toBeVisible();
      await expect(
        page.getByText(
          "Vas a pagar en Mercado Pago. Tu compra se confirma cuando Mercado Pago nos avisa que el pago se acreditó.",
        ).filter(VISIBLE),
      ).toBeVisible();
      await shot(page, testInfo, "summary-trimestral");

      await payUntilSimulator(page);
      await shot(page, testInfo, "simulator");

      await page.getByRole("button", { name: "Aprobar" }).click();
      await expect(page).toHaveURL(/\/checkout\/resultado\?ref=[0-9a-f-]{36}$/);
      const result = page.getByRole("status");
      await expect(result.getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeVisible();
      await expect(result.getByText("Tu plan trimestral ya está activo.").filter(VISIBLE)).toBeVisible();
      await expect(result.getByRole("img", { name: "Aprobado" })).toBeVisible();
      await expect(result.getByRole("link", { name: "Ir a mi perfil" })).toHaveAttribute("href", "/dashboard");
      await shot(page, testInfo, "result-approved");
    });
  });

  test("Rechazar: the plan stays pending and the result says the payment did not complete", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.trimestral}`);
    await payUntilSimulator(page);

    await page.getByRole("button", { name: "Rechazar" }).click();
    await expect(page).toHaveURL(/\/checkout\/resultado\?ref=[0-9a-f-]{36}&status=rejected$/);
    const result = page.getByRole("status");
    await expect(result.getByRole("heading", { name: "Pago no completado" })).toBeVisible();
    await expect(result.getByText("Mercado Pago no aprobó el pago. Podés intentarlo de nuevo.").filter(VISIBLE)).toBeVisible();
    await expect(result.getByText("Rechazado", { exact: true }).filter(VISIBLE)).toBeVisible();
    await expect(page.getByText("¡Listo! Tu pago fue aprobado.").filter(VISIBLE)).toHaveCount(0);
    await shot(page, testInfo, "result-rejected");

    const retry = result.getByRole("link", { name: "Intentar de nuevo" });
    await expect(retry).toHaveAttribute("href", "/checkout/plan/plan-trimestral");
    await retry.click();
    await expect(page).toHaveURL(/\/checkout\/plan\/plan-trimestral$/);
    await expect(payButton(page)).toBeEnabled();
  });

  test("active: the renewal notice carries the end date of the current plan and the day the new one starts", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "active");
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.mensual}`);

    await expect(page.getByText(RENEWAL_NOTICE).filter(VISIBLE)).toBeVisible();
    await expect(dateUnder(page, "Plan actual hasta")).toHaveText("15/11/2026");
    await expect(dateUnder(page, "Plan Mensual desde")).toHaveText("16/11/2026");
    await expect(page.getByText("$ 3.900").filter(VISIBLE)).toBeVisible();
    await expect(page.getByText("Seguimiento mensual").filter(VISIBLE)).toBeVisible();
    await shot(page, testInfo, "summary-renewal");
  });

  test("active-with-two-upcoming: the renewal notice starts after the last queued plan", async ({
    context,
    page,
    baseURL,
  }) => {
    await useScenario(context, baseURL!, "active-with-two-upcoming");
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.mensual}`);

    await expect(dateUnder(page, "Plan actual hasta")).toHaveText("15/03/2027");
    await expect(dateUnder(page, "Plan Mensual desde")).toHaveText("16/03/2027");
  });

  test("none: no renewal notice", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.mensual}`);

    await expect(page.getByText("$ 3.900").filter(VISIBLE)).toBeVisible();
    await expect(page.getByText(RENEWAL_NOTICE).filter(VISIBLE)).toHaveCount(0);
  });

  test("session pack: sessions, validity and the expiry note", async ({ context, page, baseURL }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto("/plans");

    await selectPlan(page, "Paquete 4 sesiones");
    await planAction(page, "Contratar paquete").click();
    await expect(page).toHaveURL(/\/checkout\/plan\/plan-pack-4$/);
    await expect(page.getByText("$ 3.200").filter(VISIBLE)).toBeVisible();
    const rows = page.getByRole("term");
    await expect(rows.filter({ hasText: "Sesiones" })).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: /^4$/ })).toBeVisible();
    await expect(rows.filter({ hasText: "Vigencia del paquete" })).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: "30 días" })).toBeVisible();
    await expect(page.getByText("Las sesiones no usadas vencen al final del período.").filter(VISIBLE)).toBeVisible();
    await shot(page, testInfo, "summary-pack");
  });

  test("checkout-provider-down: the 502 message shows and the button is enabled again", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "checkout-provider-down");
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.trimestral}`);

    await payButton(page).click();
    await expect(page.getByRole("alert").filter({ hasText: PROVIDER_ERROR_MESSAGE })).toBeVisible();
    await expect(payButton(page)).toBeEnabled();
    await expect(page).toHaveURL(/\/checkout\/plan\/plan-trimestral$/);
    await shot(page, testInfo, "provider-down");
  });

  test("checkout-plan-inactive: says the plan is not available and never leaves for Mercado Pago", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "checkout-plan-inactive");
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.trimestral}`);

    await payButton(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Este plan no está disponible." })).toBeVisible();
    await expect(page).toHaveURL(/\/checkout\/plan\/plan-trimestral$/);
    await expect(page.getByRole("link", { name: /Mercado Pago/ })).toHaveCount(0);
    await shot(page, testInfo, "plan-inactive");
  });

  test("an unknown plan id shows Plan no disponible with a way back to the plans", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    await page.goto("/checkout/plan/plan-que-no-existe");

    await expect(page.getByRole("heading", { name: "Plan no disponible" })).toBeVisible();
    await expect(page.getByText("Este plan no existe o no se puede contratar online.").filter(VISIBLE)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver planes" })).toHaveAttribute("href", "/plans");
    await expect(payButton(page)).toHaveCount(0);
    await shot(page, testInfo, "unknown-plan");
  });

  test("a plan that is booked, not bought (single session), is not sold here", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "none");
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.recoverySingle}`);

    await expect(page.getByRole("heading", { name: "Plan no disponible" })).toBeVisible();
    await expect(payButton(page)).toHaveCount(0);
  });

  test("a fast double click sends one POST and the button stays disabled after the 201", async ({
    context,
    page,
    baseURL,
  }) => {
    await useScenario(context, baseURL!, "none");
    const posts = countCheckoutPosts(page);
    let releaseResponse: () => void = () => undefined;
    const responseHeld = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    await page.route(`**${CHECKOUT_POST_PATH}`, async (route) => {
      if (route.request().method() === "POST") await responseHeld;
      await route.continue();
    });
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.trimestral}`);

    await payButton(page).dblclick();
    const busy = page.getByRole("button", { name: "Te llevamos a Mercado Pago…" });
    await expect(busy).toBeDisabled();
    releaseResponse();
    await expect(page).toHaveURL(/\/checkout\/simulado\?ref=/);
    expect(posts(), "POST /checkout/plan requests").toBe(1);
  });

  test("without a session, the checkout sends the visitor to /login", async ({ page }) => {
    await page.goto(`/checkout/plan/${E2E_PLAN_IDS.trimestral}`);
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fcheckout%2Fplan%2Fplan-trimestral$/);
  });
});
