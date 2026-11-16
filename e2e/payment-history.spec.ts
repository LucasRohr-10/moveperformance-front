import { expect, test } from "@playwright/test";

import { useScenario } from "./support/use-scenario";

const cardButton = (page: import("@playwright/test").Page, title: string) =>
  page.getByRole("button", { name: new RegExp(title) });

test.describe("Payment history in the client area", () => {
  test("shows each state's badge next to the title of its card", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "payments");

    await page.goto("/history?tab=pagos");

    await expect(cardButton(page, "Recovery · Paquete 4 sesiones.*Rechazado")).toBeVisible();
    await expect(cardButton(page, "Performance · Mensual.*En proceso")).toBeVisible();
    await expect(cardButton(page, "Rehab · Evaluación.*Pendiente")).toBeVisible();
    await expect(cardButton(page, "Performance · Mensual.*Vencido")).toBeVisible();
    await expect(cardButton(page, "Performance · Mensual.*Reembolsado")).toBeVisible();
    await expect(cardButton(page, "Recovery · Sesión individual.*Aprobado")).toBeVisible();
  });

  test("opens a card to show its note and rows, and never the provider's code", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "payments");
    await page.goto("/history?tab=pagos");

    await cardButton(page, "Recovery · Paquete 4 sesiones.*Rechazado").click();

    // A closed card keeps its detail in the DOM (hidden), so look inside the open card only.
    const detail = page.getByRole("region", { name: "Recovery · Paquete 4 sesiones" });
    await expect(detail.getByText("No se pudo realizar el pago")).toBeVisible();
    await expect(detail.getByText("Tu tarjeta no tiene saldo suficiente.")).toBeVisible();
    await expect(detail.getByText("Intentado")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("cc_rejected");
  });

  test("filters by origin from the URL", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "payments");

    await page.goto("/history?tab=pagos");
    await page.getByRole("link", { name: "Débitos automáticos" }).click();

    await expect(page).toHaveURL(/origin=auto_debit/);
    await expect(page.getByText("Débito automático").first()).toBeVisible();
    await expect(page.getByText("Pago único")).toHaveCount(0);
  });

  test("pages through a long history", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "payments");

    await page.goto("/history?tab=pagos");
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await page.getByRole("link", { name: "Siguiente" }).click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
  });

  test("says there are no payments yet", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "payments-empty");

    await page.goto("/history?tab=pagos");

    await expect(page.getByText("Todavía no tenés pagos.")).toBeVisible();
  });

  test("sends someone without a session to /login", async ({ page }) => {
    await page.goto("/history");

    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fhistory$/);
  });
});
