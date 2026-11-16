import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { setOwner, setScenario } from "./support/use-scenario";

// Each test is its own staff user for the fake API, so what one changes never shows up in another.
async function actAs(page: Page, baseURL: string, scenario: Parameters<typeof setScenario>[2]): Promise<void> {
  await setScenario(page.context(), baseURL, scenario);
  await setOwner(page.context(), baseURL, randomUUID());
}

const filters = (page: Page) => page.getByRole("group", { name: "Filtrar alertas" });
// Results show up in the shared snackbar: an icon and a close button come with the text.
const snackbar = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });
const cardOf = (page: Page, name: string) => page.locator("li", { hasText: name });

test.describe("Staff follow-up", () => {
  test("el staff filtra, contacta, registra un motivo y gestiona una alerta", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff");

    await page.goto("/staff/follow-up");
    await expect(page.getByRole("heading", { level: 1, name: "Seguimiento y retención" })).toBeVisible();
    await expect(filters(page).getByRole("button", { name: "Todas · 8" })).toHaveAttribute("aria-pressed", "true");

    await filters(page).getByRole("button", { name: "Por vencer · 1" }).click();
    await expect(page).toHaveURL(/\/staff\/follow-up\?tipo=expiring$/);
    await expect(cardOf(page, "Ana Pérez")).toBeVisible();
    await expect(cardOf(page, "Martín Rodríguez")).toHaveCount(0);

    const ana = cardOf(page, "Ana Pérez");
    await ana.getByRole("button", { name: "Más acciones" }).click();
    await ana.getByRole("button", { name: "Otro canal de contacto" }).click();
    await expect(ana.getByLabel("Canal")).toBeFocused();
    await ana.getByRole("button", { name: "Registrar envío" }).click();
    await expect(snackbar(page, "Contacto registrado. Vas a poder cargar el resultado desde la lista.")).toBeVisible();
    await expect(ana.getByRole("group", { name: "Contactar a Ana Pérez" })).toHaveCount(0);

    await ana.getByRole("button", { name: "Más acciones" }).click();
    await ana.getByRole("button", { name: "Registrar motivo" }).click();
    await ana.getByText("Vacaciones", { exact: true }).click();
    await ana.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(snackbar(page, "Motivo registrado.")).toBeVisible();
    // Like the back, a pause hands in the open alerts of that client: the card leaves the list.
    await expect(cardOf(page, "Ana Pérez")).toHaveCount(0);

    await filters(page).getByRole("button", { name: "Todas · 7" }).click();
    await expect(page).toHaveURL(/\/staff\/follow-up$/);
    const martin = cardOf(page, "Martín Rodríguez");
    await martin.getByRole("button", { name: "Marcar gestionado" }).click();
    await martin.getByRole("button", { name: "Sí, marcar gestionado" }).click();

    await expect(snackbar(page, "Alerta marcada como gestionada.")).toBeVisible();
    await expect(cardOf(page, "Martín Rodríguez")).toHaveCount(0);
    await expect(filters(page).getByRole("button", { name: "Todas · 6" })).toBeVisible();
    await expect(filters(page).getByRole("button", { name: "Vencidos sin renovar · 0" })).toBeVisible();
  });

  test("el botón de WhatsApp abre el chat del cliente y registra el contacto", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff");
    await page.context().route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "ok" }));

    await page.goto("/staff/follow-up");
    const martin = cardOf(page, "Martín Rodríguez");
    const whatsapp = martin.getByRole("link", { name: "Escribir por WhatsApp a Martín Rodríguez" });
    await expect(whatsapp).toHaveAttribute("href", "https://wa.me/59899765432");

    const chat = page.context().waitForEvent("page");
    await whatsapp.click();
    await expect((await chat).url()).toBe("https://wa.me/59899765432");

    await expect(snackbar(page, "Contacto registrado. Vas a poder cargar el resultado desde la lista.")).toBeVisible();
    // A client without a phone cannot open the chat: its button is disabled.
    await expect(
      cardOf(page, "Ana Pérez").getByRole("button", { name: "Ana Pérez no tiene teléfono cargado" }),
    ).toBeDisabled();
  });

  test("el staff ve el historial y finaliza la pausa", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff");

    await page.goto("/staff/follow-up");
    const lucia = cardOf(page, "Lucía Fernández");
    await expect(lucia.getByText("Re-contactar el 01/11/2026")).toBeVisible();
    await expect(lucia.getByRole("button", { name: "Marcar gestionado" })).toBeVisible();
    await lucia.getByRole("button", { name: "Más acciones" }).click();
    await lucia.getByRole("link", { name: "Ver historial" }).click();

    await expect(page).toHaveURL(/\/staff\/clients\/client-lucia-fernandez$/);
    await expect(page.getByRole("heading", { level: 2, name: "Seguimiento" })).toBeVisible();
    await expect(page.getByTestId("followup-status")).toHaveText("Seguimiento pausado");
    await expect(page.getByTestId("followup-detail")).toHaveText("Lesión · hasta el 01/11/2026");
    await expect(
      page.getByTestId("history-row").filter({ hasText: "Seguimiento pausado" }),
    ).toContainText("Lesión · hasta el 01/11/2026");

    await page.getByRole("button", { name: "Reanudar" }).click();
    await expect(
      page.getByText("¿Finalizar la pausa? El cliente vuelve a recibir alertas según su plan y su asistencia."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sí, finalizar" }).click();

    await expect(snackbar(page, "Pausa finalizada.")).toBeVisible();
    await expect(page.getByTestId("followup-status")).toHaveText("Seguimiento activo");
    await expect(page.getByRole("tab", { name: "Pausar" })).toBeEnabled();
    await expect(page.getByTestId("history-row").filter({ hasText: "Pausa finalizada" })).toBeVisible();
  });

  test("a contact shows up in the history of the client", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff");

    await page.goto("/staff/follow-up");
    const ana = cardOf(page, "Ana Pérez");
    await ana.getByRole("button", { name: "Más acciones" }).click();
    await ana.getByRole("button", { name: "Otro canal de contacto" }).click();
    await ana.getByLabel("Canal").selectOption({ label: "Teléfono" });
    await ana.getByRole("button", { name: "Registrar envío" }).click();
    await expect(snackbar(page, "Contacto registrado. Vas a poder cargar el resultado desde la lista.")).toBeVisible();

    await ana.getByRole("button", { name: "Más acciones" }).click();
    await ana.getByRole("link", { name: "Ver historial" }).click();

    const line = page.getByTestId("history-row").filter({ hasText: "Teléfono" });
    await expect(line).toHaveCount(1);
    await line.getByRole("button", { name: "Completar resultado" }).click();
    await line.getByLabel("Nota (opcional)").fill("Renueva el lunes");
    await line.getByRole("button", { name: "Guardar resultado" }).click();
    await expect(snackbar(page, "Resultado guardado.")).toBeVisible();

    await expect(line).toContainText("Teléfono · Habló con la persona");
    await expect(line).toContainText("Renueva el lunes");
  });

  test("shows all the alerts when the type in the URL is unknown", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff");

    await page.goto("/staff/follow-up?tipo=cualquiera");

    await expect(filters(page).getByRole("button", { name: "Todas · 8" })).toHaveAttribute("aria-pressed", "true");
    await expect(cardOf(page, "Ana Pérez")).toBeVisible();
    await expect(cardOf(page, "Martín Rodríguez")).toBeVisible();
  });

  test("sin alertas", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff-empty");

    await page.goto("/staff/follow-up");
    await expect(page.getByText("Sin alertas")).toBeVisible();
    await expect(page.getByText("No hay alertas abiertas para revisar.")).toBeVisible();
    await expect(filters(page).getByRole("button", { name: "Todas · 0" })).toBeVisible();

    await page.goto("/staff/follow-up?tipo=expiring");
    await expect(page.getByText('No hay alertas de "Por vencer" para revisar.')).toBeVisible();
  });

  test("con los contadores caídos la lista se carga igual", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "staff-error");

    await page.goto("/staff/follow-up");

    await expect(page.getByText("No pudimos cargar los contadores.")).toBeVisible();
    await expect(cardOf(page, "Ana Pérez")).toBeVisible();
    await expect(filters(page).getByRole("button", { name: "Todas", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reintentar contadores" }).click();
    await expect(page.getByText("No pudimos cargar los contadores.")).toBeVisible();
  });

  test("a client cannot open the staff screen", async ({ page, baseURL }) => {
    await actAs(page, baseURL!, "none");

    await page.goto("/staff/follow-up");

    await expect(page).not.toHaveURL(/\/staff\/follow-up/);
  });
});
