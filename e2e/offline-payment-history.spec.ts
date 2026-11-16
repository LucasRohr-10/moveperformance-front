import { expect, test, type Page } from "@playwright/test";

import { OFFLINE_PAID_IDS } from "./support/offline-charges-fixtures";
import { useScenario } from "./support/use-scenario";

const cardButton = (page: Page, title: string) => page.getByRole("button", { name: new RegExp(title) });

test.describe("Offline payments in the client's history", () => {
  test("shows the paid offline charge with its method and receipt", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "offline-paid");
    await page.goto("/history?tab=pagos");

    const card = cardButton(page, "Rehab · Evaluación.*Aprobado");
    await expect(card).toContainText("Efectivo · 30/10/2026");
    await card.click();

    const detail = page.getByRole("region", { name: "Rehab · Evaluación" });
    await expect(detail.getByText("Pago registrado")).toBeVisible();
    await expect(detail.getByText("Pagaste en efectivo el 30/10/2026. Lo registró el equipo de MOVE.")).toBeVisible();
    await expect(detail.getByRole("term").filter({ hasText: "Medio" })).toBeVisible();
    await expect(detail.getByRole("definition").filter({ hasText: "Efectivo" })).toBeVisible();
    await expect(detail.getByText("N.º de operación")).toHaveCount(0);

    const opened = context.waitForEvent("page");
    await detail.getByRole("button", { name: "Ver comprobante" }).click();
    const tab = await opened;
    await tab.waitForURL(new RegExp(`/files/fake-${OFFLINE_PAID_IDS.cash}$`));
  });

  test("leaves Mercado Pago cards as they were", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "offline-paid");
    await page.goto("/history?tab=pagos");

    const card = cardButton(page, "Recovery · Sesión individual.*Aprobado");
    await expect(card).toContainText("Pago único");
    await card.click();

    const detail = page.getByRole("region", { name: "Recovery · Sesión individual" });
    await expect(detail.getByText("Pago acreditado")).toBeVisible();
    await expect(detail.getByText("N.º de operación")).toBeVisible();
    await expect(detail.getByText("Aprobado el")).toBeVisible();
    await expect(detail.getByRole("term").filter({ hasText: "Medio" })).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "Ver comprobante" })).toHaveCount(0);
  });
});
