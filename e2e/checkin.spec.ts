import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { OWNER_COOKIE, SCENARIO_COOKIE } from "./support/scenarios";
import { setOwner, setScenario } from "./support/use-scenario";

const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;
const THANKS = "¡Gracias! El equipo de MOVE revisa tus respuestas.";
// Next keeps an empty role="alert" (the route announcer) in every page: only the ones with text are ours.
const withText = { hasText: /\S/ };

async function actAs(page: Page, baseURL: string, scenario: Parameters<typeof setScenario>[2]): Promise<string> {
  const owner = randomUUID();
  await setScenario(page.context(), baseURL, scenario);
  await setOwner(page.context(), baseURL, owner);
  return owner;
}

test.describe("Monthly check-in", () => {
  test("el cliente responde su check-in", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "checkin-pending");

    await page.goto("/dashboard");
    await expect(page.getByText("Tenés un check-in pendiente")).toBeVisible();
    await expect(page.getByText("Te toma 1 minuto y nos ayuda a acompañarte mejor.")).toBeVisible();
    await page.getByRole("link", { name: "Responder check-in" }).click();

    await expect(page).toHaveURL(/\/check-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "¿Cómo venís, Ana?" })).toBeVisible();
    await page.getByText("Bien", { exact: true }).click();
    await page.getByText("Sí, leve", { exact: true }).click();
    await page.getByLabel("¿Dónde?").fill("Rodilla derecha");
    await page.getByText("Siguen igual", { exact: true }).click();
    await page.getByRole("button", { name: "Enviar respuesta" }).click();

    await expect(page.getByRole("status").filter({ hasText: THANKS })).toHaveText(THANKS);
    await expect(page.getByRole("button", { name: "Enviar respuesta" })).toBeDisabled();
  });

  test("asks for what is missing before sending", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "checkin-pending");

    await page.goto("/check-in");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();

    await expect(page.getByText("Elegí cómo te sentís.")).toBeVisible();
    await expect(page.getByText("Contanos si sentiste alguna molestia.")).toBeVisible();
    await expect(page.getByText("Contanos si cambiaron tus objetivos.")).toBeVisible();

    await page.getByText("Sí, leve", { exact: true }).click();
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await expect(page.getByText("Contanos dónde sentís la molestia.")).toBeVisible();
  });

  test("tells the client there is nothing to answer", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "none");

    await page.goto("/dashboard");
    await expect(page.getByText("Tenés un check-in pendiente")).toHaveCount(0);

    await page.goto("/check-in");
    await expect(page.getByText("No tenés check-ins pendientes.")).toBeVisible();
  });

  test("explains when the check-in was already answered somewhere else", async ({ page, baseURL }) => {
    const owner = await actAs(page, baseURL!, "checkin-pending");
    await page.goto("/check-in");
    const answeredElsewhere = await page.request.post(`${API}/me/checkins/c-2026-10`, {
      headers: { Cookie: `${SCENARIO_COOKIE}=checkin-pending; ${OWNER_COOKIE}=${owner}` },
      data: { feeling: "good", pain: "none", goals: "same" },
    });
    expect(answeredElsewhere.status()).toBe(200);

    await page.getByText("Bien", { exact: true }).click();
    await page.getByText("No", { exact: true }).click();
    await page.getByText("Siguen igual", { exact: true }).click();
    await page.getByRole("button", { name: "Enviar respuesta" }).click();

    await expect(page.getByRole("alert").filter(withText)).toHaveText("Este check-in ya fue respondido.");
    await expect(page.getByText("No tenés check-ins pendientes.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar respuesta" })).toHaveCount(0);
  });
});
