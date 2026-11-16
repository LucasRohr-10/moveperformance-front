import { defineConfig, devices } from "@playwright/test";

const webPort = Number(process.env.E2E_WEB_PORT ?? 3300);
const apiPort = Number(process.env.E2E_API_PORT ?? 4300);
const baseURL = `http://localhost:${webPort}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: process.env.E2E_ARTIFACTS_DIR ?? "test-results",
  globalSetup: "./e2e/global-setup.ts",
  // Under load a click can land before the page is hydrated and get lost (the simulator buttons, the login form).
  retries: 2,
  // next dev compiles each route on its first visit, which can take longer than the default 5 s when workers share it.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    locale: "es-UY",
    timezoneId: "America/Montevideo",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${webPort}`,
    url: baseURL,
    env: { NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}` },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
