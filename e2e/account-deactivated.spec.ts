import { expect, test } from "@playwright/test";

import { setScenario } from "./support/use-scenario";

const DEACTIVATED_MESSAGE = "Tu cuenta está desactivada. Escribile a MOVE para reactivarla.";

function corsHeaders(baseURL: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": baseURL,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

test.describe("Deactivated account", () => {
  test("email and password show the deactivated message", async ({ page, baseURL }) => {
    const cors = corsHeaders(baseURL!);
    await page.route("**/api/auth/sign-in/email", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        headers: cors,
        body: JSON.stringify({ code: "ACCOUNT_DEACTIVATED", message: DEACTIVATED_MESSAGE }),
      });
    });
    await page.goto("/login");

    await page.getByLabel("Email").fill("diego@move.test");
    await page.getByLabel("Contraseña").fill("secret-123");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByRole("alert").filter({ hasText: DEACTIVATED_MESSAGE })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("Google sending back the error shows the same message", async ({ page }) => {
    await page.goto("/login?error=ACCOUNT_DEACTIVATED");

    await expect(page.getByText(DEACTIVATED_MESSAGE)).toBeVisible();
  });

  test("an open session of a deactivated account lands on login with the message", async ({ page, baseURL }) => {
    await setScenario(page.context(), baseURL!, "account-deactivated");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login\?error=ACCOUNT_DEACTIVATED$/);
    await expect(page.getByText(DEACTIVATED_MESSAGE)).toBeVisible();
    // The form is there and the page did not bounce back to /dashboard: no redirect loop.
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page).toHaveURL(/\/login\?error=ACCOUNT_DEACTIVATED$/);
  });
});
