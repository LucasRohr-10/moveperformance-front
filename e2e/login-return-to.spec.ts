import { type BrowserContext, expect, type Page, test } from "@playwright/test";

import type { ScenarioName, SpecialScenario } from "./support/scenarios";
import { setScenario } from "./support/use-scenario";

function corsHeaders(baseURL: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": baseURL,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// The fake API has no sign-in: answering it here is what "signs the client in",
// by setting the scenario cookie the fake API reads on every later request.
async function stubSignIn(
  context: BrowserContext,
  page: Page,
  baseURL: string,
  scenario: ScenarioName | SpecialScenario,
): Promise<void> {
  const cors = corsHeaders(baseURL);
  await page.route("**/api/auth/sign-in/email", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    await setScenario(context, baseURL, scenario);
    await route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: "{}" });
  });
}

// Same idea for Google: the real API answers with Google's URL and Google later
// sends the browser to `callbackURL`. Here the "Google" URL is the callbackURL
// itself, so the browser lands exactly where the API was told to send it.
async function stubGoogleSignIn(
  context: BrowserContext,
  page: Page,
  baseURL: string,
  scenario: ScenarioName | SpecialScenario,
): Promise<{ requested: () => { callbackURL: string; errorCallbackURL: string } | null }> {
  const cors = corsHeaders(baseURL);
  let requested: { callbackURL: string; errorCallbackURL: string } | null = null;
  await page.route("**/api/auth/sign-in/social", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    requested = route.request().postDataJSON() as { callbackURL: string; errorCallbackURL: string };
    await setScenario(context, baseURL, scenario);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: cors,
      body: JSON.stringify({ url: requested.callbackURL }),
    });
  });
  return { requested: () => requested };
}

async function signIn(page: Page): Promise<void> {
  await page.getByLabel("Email").fill("ana@move.test");
  await page.getByLabel("Contraseña").fill("secret-123");
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test.describe("Back to the page the mail button pointed to after signing in", () => {
  test("signed out, /history?tab=pagos → login → back on the Pagos tab", async ({ context, page, baseURL }) => {
    await stubSignIn(context, page, baseURL!, "payments");

    await page.goto("/history?tab=pagos");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fhistory%3Ftab%3Dpagos$/);
    await signIn(page);

    await expect(page).toHaveURL(/\/history\?tab=pagos$/);
    await expect(page.getByRole("link", { name: "Pagos", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("signed out, /dashboard?bookings=open → login → the bookings dialog is open", async ({
    context,
    page,
    baseURL,
  }) => {
    await stubSignIn(context, page, baseURL!, "none");

    await page.goto("/dashboard?bookings=open");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard%3Fbookings%3Dopen$/);
    await signIn(page);

    await expect(page).toHaveURL(/\/dashboard\?bookings=open$/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("signed out, /history?tab=pagos → login with Google → back on the Pagos tab", async ({
    context,
    page,
    baseURL,
  }) => {
    const google = await stubGoogleSignIn(context, page, baseURL!, "payments");

    await page.goto("/history?tab=pagos");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fhistory%3Ftab%3Dpagos$/);
    // The button is in the server HTML before React hydrates it, and a click before
    // that does nothing (no error, the page just stays on /login): wait for the scripts to settle.
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Continuar con Google" }).click();

    await expect(page).toHaveURL(/\/history\?tab=pagos$/);
    expect(google.requested()?.errorCallbackURL).toBe(
      `${baseURL}/login?redirectTo=${encodeURIComponent("/history?tab=pagos")}`,
    );
    await expect(page.getByRole("link", { name: "Pagos", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("/login?redirectTo=//evil.com → dashboard", async ({ context, page, baseURL }) => {
    await stubSignIn(context, page, baseURL!, "none");

    await page.goto("/login?redirectTo=//evil.com");
    await signIn(page);

    await expect(page).toHaveURL(`${baseURL}/dashboard`);
  });

  test("/login?redirectTo=/%09/evil.com (a tab before the second slash) → dashboard", async ({
    context,
    page,
    baseURL,
  }) => {
    await stubSignIn(context, page, baseURL!, "none");

    await page.goto("/login?redirectTo=%2F%09%2Fevil.com");
    await signIn(page);

    await expect(page).toHaveURL(`${baseURL}/dashboard`);
  });
});
