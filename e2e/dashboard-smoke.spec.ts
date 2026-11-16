import { expect, test } from "@playwright/test";

import { useScenario } from "./support/use-scenario";

test("shows the greeting on the dashboard for a signed-in client", async ({
  context,
  page,
  baseURL,
}) => {
  await useScenario(context, baseURL!, "none");

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Hola, Ana." }),
  ).toBeVisible();
});

test("sends someone without a session from the dashboard to /login", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard$/);
});
