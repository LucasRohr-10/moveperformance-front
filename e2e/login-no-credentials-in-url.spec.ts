import { expect, test } from "@playwright/test";

// A form sent before React has loaded is sent by the browser itself: a GET to the same
// address with every named field in the query string. Scripts off is that moment, frozen.
test.describe("Login form before React has loaded", () => {
  test("does not send the email or the password in the address bar", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/login?redirectTo=%2Fhistory");
    await page.getByLabel("Email").fill("ana@move.test");
    await page.getByLabel("Contraseña").fill("secret-123");

    await expect(page.getByRole("button", { name: "Ingresar" })).toBeDisabled();
    // Enter in a field is the other way to send a form: a disabled send button stops it too.
    await page.getByLabel("Contraseña").press("Enter");
    await page.waitForTimeout(500);

    expect(page.url()).not.toContain("password");
    expect(page.url()).not.toContain("email");
    expect(new URL(page.url()).search).toBe("?redirectTo=%2Fhistory");

    await context.close();
  });

  test("can be sent as usual once React is in charge", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  });
});
