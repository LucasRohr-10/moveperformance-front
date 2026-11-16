import { expect, test, type Page } from "@playwright/test";

import { useScenario } from "./support/use-scenario";

const PHONE = { width: 375, height: 812 };

const monthCard = (page: Page) =>
  page.getByText("Tu mes en MOVE").locator("xpath=ancestor::div[contains(@class,'rounded')][1]");

async function expectNoHorizontalScroll(page: Page) {
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
}

test.describe("Activity in the client area", () => {
  test("shows the real numbers on the profile and links to the activity page", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "activity");

    await page.goto("/dashboard");

    const card = monthCard(page);
    await expect(card.getByText("Octubre")).toBeVisible();
    await expect(card.getByText("8", { exact: true })).toBeVisible();
    await expect(card.getByText("2.3")).toBeVisible();
    await expect(card.getByText("Racha")).toBeVisible();
    await expect(card.getByText("3", { exact: true })).toBeVisible();

    await card.getByRole("link", { name: /Ver mi actividad/ }).click();

    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByRole("heading", { level: 1, name: "Actividad" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Asistencia" })).toHaveAttribute("aria-current", "page");
  });

  test("names the page Actividad in the menu", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "activity");

    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "Actividad" }).first()).toHaveAttribute("href", "/history");
  });

  test("lists every attendance state under its month with the month's attended count", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "activity");

    await page.goto("/history");

    for (const badge of ["Presente", "Ausente", "Sin marcar", "Cancelada"]) {
      await expect(page.getByText(badge, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("El staff todavía no marcó tu asistencia.")).toBeVisible();
    await expect(page.getByText("OCTUBRE 2026")).toBeVisible();
    await expect(page.getByText("1 asistencia", { exact: true })).toBeVisible();
    await expect(page.getByText("SEPTIEMBRE 2026")).toBeVisible();
    await expect(page.getByText("20 asistencias")).toBeVisible();
  });

  test("pages through a long history without leaving the Asistencia tab", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "activity");

    await page.goto("/history");
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    await page.getByRole("link", { name: "Siguiente" }).click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Página 2 de 2")).toBeVisible();
    await expect(page.getByRole("link", { name: "Asistencia" })).toHaveAttribute("aria-current", "page");
  });

  test("switches to the payments tab and back", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "activity");

    await page.goto("/history");
    await page.getByRole("link", { name: "Pagos", exact: true }).click();

    await expect(page).toHaveURL(/tab=pagos/);
    await expect(page.getByRole("link", { name: "Pagos", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Todavía no tenés pagos.")).toBeVisible();

    await page.getByRole("link", { name: "Asistencia" }).click();

    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByText("OCTUBRE 2026")).toBeVisible();
  });

  test("invites a client who never attended to book, on the profile and in the history", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "activity-empty");

    await page.goto("/dashboard");
    await expect(page.getByText("Acá vas a ver tu racha")).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver mi actividad/ })).toHaveCount(0);

    await page.goto("/history");
    await expect(page.getByText("Todavía no tenés turnos pasados.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Reservar" }).first()).toHaveAttribute("href", "/bookings");
  });

  test("fits a phone: no horizontal scroll on the profile or on the history", async ({ context, page, baseURL }) => {
    await useScenario(context, baseURL!, "activity");
    await page.setViewportSize(PHONE);

    await page.goto("/dashboard");
    await expect(monthCard(page).getByText("Racha")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto("/history");
    await expect(page.getByText("OCTUBRE 2026")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("sends someone without a session to /login", async ({ page }) => {
    await page.goto("/history");

    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fhistory$/);
  });
});
