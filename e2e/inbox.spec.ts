import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { setOwner, setScenario } from "./support/use-scenario";

const NOTICE_COUNT = 7;

async function actAs(page: Page, baseURL: string, scenario: Parameters<typeof setScenario>[2]): Promise<void> {
  await setScenario(page.context(), baseURL, scenario);
  await setOwner(page.context(), baseURL, randomUUID());
}

// Only the bell of the current viewport is visible: the other one is `display: none`, so the role query skips it.
const bell = (page: Page) => page.getByRole("button", { name: /^Notificaciones/ });
const panel = (page: Page) => page.getByRole("dialog", { name: "Notificaciones" });

test.describe("Inbox bell", () => {
  test("shows the unread count on the bell", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "inbox-mixed");

    await page.goto("/dashboard");

    await expect(page.getByRole("button", { name: "Notificaciones, 3 sin leer" })).toBeVisible();
  });

  test("lists the seven notices separated by lines and marks one as read", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "inbox-mixed");
    await page.goto("/dashboard");

    await bell(page).click();

    await expect(panel(page)).toBeVisible();
    const items = panel(page).getByRole("listitem");
    await expect(items).toHaveCount(NOTICE_COUNT);
    await expect(panel(page).getByRole("list")).toHaveClass(/divide-y/);
    await expect(items.first()).toContainText("MOVE canceló tu turno");
    await expect(panel(page).getByRole("button", { name: "Marcar como leído" })).toHaveCount(3);

    await panel(page).getByRole("button", { name: "Marcar como leído" }).first().click();

    await expect(page.getByRole("button", { name: "Notificaciones, 2 sin leer" })).toBeVisible();
    await expect(panel(page).getByRole("button", { name: "Marcar como leído" })).toHaveCount(2);
  });

  test("reading does not need the panel to be opened again: the count survives a reload", async ({
    page,
    baseURL,
  }) => {
    await actAs(page, baseURL!, "inbox-mixed");
    await page.goto("/dashboard");
    await bell(page).click();
    await panel(page).getByRole("button", { name: "Marcar como leído" }).first().click();
    await expect(page.getByRole("button", { name: "Notificaciones, 2 sin leer" })).toBeVisible();

    await page.reload();

    await expect(page.getByRole("button", { name: "Notificaciones, 2 sin leer" })).toBeVisible();
  });

  test("the action of a notice goes to its page", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "inbox-mixed");
    await page.goto("/dashboard");
    await bell(page).click();

    await panel(page).getByRole("button", { name: "Reservar otro turno" }).click();

    await expect(page).toHaveURL(/\/bookings\?service=recovery$/);
  });

  test("shows the empty state", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "inbox-empty");
    await page.goto("/dashboard");

    await expect(page.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();
    await bell(page).click();

    await expect(panel(page).getByText("No tenés avisos")).toBeVisible();
  });

  test("shows the error state and offers to retry", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "inbox-error");
    await page.goto("/dashboard");

    await bell(page).click();

    await expect(panel(page).getByText("No pudimos cargar tus avisos")).toBeVisible();
    await expect(panel(page).getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  test("Escape closes the panel and gives the focus back to the bell", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "inbox-mixed");
    await page.goto("/dashboard");
    await bell(page).click();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(panel(page)).toBeHidden();
    await expect(bell(page)).toBeFocused();
  });

  test("a click outside closes the panel", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "inbox-mixed");
    await page.goto("/dashboard");
    await bell(page).click();
    await expect(panel(page)).toBeVisible();

    // The top-left corner is the header, outside the bell on both layouts and clear of the phone panel.
    await page.mouse.click(4, 4);

    await expect(panel(page)).toBeHidden();
  });
});
