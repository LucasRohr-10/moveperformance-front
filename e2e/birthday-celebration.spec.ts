import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { setOwner, setScenario } from "./support/use-scenario";

async function actAs(page: Page, baseURL: string, scenario: "client-birthday" | "none") {
  await setScenario(page.context(), baseURL, scenario);
  await setOwner(page.context(), baseURL, randomUUID());
}

test.describe("Birthday celebration", () => {
  test("celebrates the client on their birthday for five seconds, once", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "client-birthday");

    await page.goto("/dashboard");

    const greeting = page.getByText("¡Hoy es tu día!");
    await expect(greeting).toBeVisible();
    await expect(page.getByText("Ana!")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(greeting).toBeHidden({ timeout: 7000 });

    await page.reload();
    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
    await expect(page.getByText("¡Hoy es tu día!")).toBeHidden();
  });

  test("a client whose birthday is not today sees nothing", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "none");

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
    await expect(page.getByText("¡Hoy es tu día!")).toBeHidden();
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("shows the greeting without falling confetti", async ({ page, baseURL }) => {
      await actAs(page, baseURL!, "client-birthday");

      await page.goto("/dashboard");

      await expect(page.getByText("¡Hoy es tu día!")).toBeVisible();
      await expect(page.locator("canvas")).toHaveCount(0);
    });
  });
});
