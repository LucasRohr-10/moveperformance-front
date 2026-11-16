import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { setOwner, setScenario } from "./support/use-scenario";

const FAR_FUTURE = "2099-12-31";

async function actAsStaff(page: Page, baseURL: string): Promise<void> {
  await setScenario(page.context(), baseURL, "staff-announcements-mixed");
  await setOwner(page.context(), baseURL, randomUUID());
}

test.describe("Staff announcements", () => {
  test("lists the active ones first and the expired ones grouped by month", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);

    await page.goto("/staff/announcements");

    await expect(page.getByRole("heading", { name: "Comunicados", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Activos · 2" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("El lunes abrimos de 8:00 a 14:00 por el feriado.")).toBeVisible();

    await page.getByRole("button", { name: "Vencidos · 3" }).click();

    await expect(page.getByRole("heading", { name: "OCTUBRE 2026" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "SEPTIEMBRE 2026" })).toBeVisible();
    await expect(page.getByText("El lunes abrimos de 8:00 a 14:00 por el feriado.")).toBeHidden();
  });

  test("publishes a new announcement and sees it among the active ones", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/announcements");

    await page.getByLabel("Mensaje").fill("Mañana abrimos más tarde.");
    await page.getByLabel("Visible hasta").fill(FAR_FUTURE);
    await page.getByRole("button", { name: "Publicar" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("¿Publicar a todos los clientes?")).toBeVisible();
    await expect(dialog.getByText("Mañana abrimos más tarde.")).toBeVisible();
    await dialog.getByRole("button", { name: "Publicar" }).click();

    await expect(page.getByText("Comunicado publicado.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Activos · 3" })).toBeVisible();
    await expect(page.getByText("Mañana abrimos más tarde.")).toBeVisible();
  });

  test("Volver in the confirmation publishes nothing and keeps what was typed", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/announcements");
    await page.getByLabel("Mensaje").fill("Mañana abrimos más tarde.");
    await page.getByLabel("Visible hasta").fill(FAR_FUTURE);

    await page.getByRole("button", { name: "Publicar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Volver" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByLabel("Mensaje")).toHaveValue("Mañana abrimos más tarde.");
    await expect(page.getByRole("button", { name: "Activos · 2" })).toBeVisible();
  });

  test("editing an announcement does not ask for confirmation", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/announcements");

    await page.getByRole("button", { name: "Acciones del comunicado" }).first().click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
    await page.getByLabel("Mensaje").fill("El lunes abrimos de 9:00 a 14:00.");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("deletes an active announcement from the ··· menu after confirming", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/announcements");
    await expect(page.getByText("El lunes abrimos de 8:00 a 14:00 por el feriado.")).toBeVisible();

    await page.getByRole("button", { name: "Acciones del comunicado" }).nth(1).click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("¿Eliminar este comunicado?")).toBeVisible();
    await expect(dialog.getByText("Deja de verse ahora mismo en la campanita de notificaciones de todos los clientes.")).toBeVisible();
    await dialog.getByRole("button", { name: "Eliminar" }).click();

    await expect(page.getByText("Comunicado eliminado.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Activos · 1" })).toBeVisible();
    await expect(page.getByText("El lunes abrimos de 8:00 a 14:00 por el feriado.")).toBeHidden();
  });

  test("Volver in the delete confirmation keeps the announcement", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/announcements");

    await page.getByRole("button", { name: "Acciones del comunicado" }).first().click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Volver" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "Activos · 2" })).toBeVisible();
  });

  test("warns about the empty fields instead of publishing", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/announcements");

    await page.getByRole("button", { name: "Publicar" }).click();

    await expect(page.getByText("Escribí el mensaje.")).toBeVisible();
    await expect(page.getByText("Elegí una fecha.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("corrects the text of an expired announcement without touching its date", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/announcements");
    await page.getByRole("button", { name: "Vencidos · 3" }).click();

    await page.getByRole("button", { name: "Editar" }).first().click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
    await page.getByLabel("Mensaje").fill("Nueva sala de Recovery: ya podés reservar las botas.");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    await expect(page.getByText("Elegí hoy o una fecha posterior.")).toBeHidden();
    await expect(page.getByText("Nueva sala de Recovery: ya podés reservar las botas.")).toBeVisible();
    await expect(page.getByText(/Editado el \d{1,2}\/\d{1,2} por Lucía Gómez/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Vencidos · 3" })).toBeVisible();
  });

  test("the staff has no bell on the phone", async ({ page, baseURL, isMobile }) => {
    test.skip(!isMobile, "The bell only matters on the phone header; the desktop sidebar never had one.");
    await actAsStaff(page, baseURL!);

    await page.goto("/staff/announcements");

    await expect(page.getByRole("button", { name: /^Cuenta de/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Notificaciones/ })).toHaveCount(0);
  });
});
