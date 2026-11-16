import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { setOwner, setScenario } from "./support/use-scenario";

const ANA_RECORD = "/staff/clients/client-ana-gomez";
const DEACTIVATION_BANNER = /^Dado de baja el \d{2}\/\d{2}\/\d{4} por Lucía Gómez · Se mudó$/;
const PROVIDER_DOWN_MESSAGE =
  "No pudimos cancelar el débito automático en Mercado Pago y el cliente sigue activo. Probá de nuevo en unos minutos.";

// Each test is its own staff client, so what one changes never shows up in another running in parallel.
async function actAsStaff(
  page: Page,
  baseURL: string,
  scenario: "staff-clients" | "staff-clients-provider-down" = "staff-clients",
): Promise<void> {
  await setScenario(page.context(), baseURL, scenario);
  await setOwner(page.context(), baseURL, randomUUID());
}

async function fillNewClient(page: Page, email: string): Promise<void> {
  await page.getByLabel("Nombre").fill("Bruno");
  await page.getByLabel("Apellido").fill("Nuevo");
  await page.getByLabel("Fecha de nacimiento").fill("1995-06-01");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Teléfono").fill("099 111 222");
  await page.getByRole("button", { name: "Generar" }).click();
}

test.describe("Staff clients", () => {
  test("creates a client with a generated password and opens their record", async ({ page, baseURL, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/clients");

    await page.getByRole("link", { name: "Nuevo cliente" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Nuevo cliente" })).toBeVisible();
    await fillNewClient(page, "bruno@move.test");
    await expect(page.getByLabel("Clave", { exact: true })).toHaveValue(/^.{12}$/);

    await page.getByRole("button", { name: "Copiar" }).click();
    await expect(page.getByText("Clave copiada.")).toBeVisible();

    await page.getByRole("button", { name: "Crear cliente" }).click();

    await expect(page.getByText("Cliente creado.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Bruno Nuevo" })).toBeVisible();
  });

  test("says the email is taken", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/clients/new");

    await fillNewClient(page, "ana@move.test");
    await page.getByRole("button", { name: "Crear cliente" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Ya hay una cuenta con ese email." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir su ficha →" })).toHaveCount(0);
  });

  test("links to the unconfirmed client's record", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/clients/new");

    await fillNewClient(page, "pendiente@move.test");
    await page.getByRole("button", { name: "Crear cliente" }).click();
    await page.getByRole("link", { name: "Abrir su ficha →" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Carla Pendiente" })).toBeVisible();
  });

  test("lists deactivated clients with their date", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/clients");
    await expect(page.getByText("Ana Gómez").first()).toBeVisible();
    await expect(page.getByText("Diego Baja")).toHaveCount(0);

    await page.getByRole("group", { name: "Filtrar clientes" }).getByRole("link", { name: "Dados de baja" }).click();

    await expect(page).toHaveURL(/\/staff\/clients\?status=deactivated$/);
    const row = page.getByRole("row", { name: /Diego Baja/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText("20/10/2026");
    await expect(page.getByText("1 cliente dado de baja.")).toBeVisible();
    await expect(page.getByText("Ana Gómez")).toHaveCount(0);
  });

  test("keeps the filter and the search in the URL, so a reload shows the same list", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto("/staff/clients?status=deactivated&q=diego");

    await expect(page.getByRole("link", { name: "Dados de baja" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("textbox", { name: "Buscar" })).toHaveValue("diego");
    await expect(page.getByRole("row", { name: /Diego Baja/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("row", { name: /Diego Baja/ })).toBeVisible();

    await page.getByRole("link", { name: "Activos" }).click();
    await expect(page).toHaveURL(/\/staff\/clients\?q=diego$/);
  });

  test("edits the client's name", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto(ANA_RECORD);

    await page.getByRole("button", { name: "Editar datos" }).click();
    const dialog = page.getByRole("dialog", { name: "Editar datos de Ana Gómez" });
    await dialog.getByLabel("Nombre").fill("Anita");
    await dialog.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Datos guardados.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Anita Gómez" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("changes the password", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto(ANA_RECORD);

    await page.getByRole("button", { name: "Cambiar clave" }).click();
    const dialog = page.getByRole("dialog", { name: "Cambiar la clave de Ana Gómez" });
    await dialog.getByRole("button", { name: "Generar" }).click();
    await dialog.getByRole("button", { name: "Cambiar clave" }).click();

    await expect(page.getByText("Clave cambiada.")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("deactivates showing what gets cancelled, then reactivates", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto(ANA_RECORD);
    await expect(page.getByText("Al día")).toBeVisible();

    await page.getByRole("button", { name: "Dar de baja" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Dar de baja a Ana Gómez?" });
    await expect(dialog.getByText("Se cancelan 2 reservas futuras.")).toBeVisible();
    await expect(dialog.getByText("El plan queda inactivo mientras esté de baja.")).toBeVisible();
    await expect(dialog.getByText(/Tiene 3 sesiones de Recovery que quedan sin usar mientras esté de baja/)).toBeVisible();
    await expect(dialog.getByText("Se cancela el débito automático.")).toBeVisible();
    await dialog.getByLabel("Motivo (opcional)").fill("Se mudó");
    await dialog.getByRole("button", { name: "Dar de baja" }).click();

    await expect(page.getByText("Cliente dado de baja.")).toBeVisible();
    await expect(page.getByText(DEACTIVATION_BANNER)).toBeVisible();
    await expect(page.getByText("Inactivo · cliente dado de baja")).toBeVisible();
    await expect(page.getByText("Al día")).toHaveCount(0);

    await page.getByRole("button", { name: "Reactivar" }).click();
    await page.getByRole("dialog", { name: "¿Reactivar a Ana Gómez?" }).getByRole("button", { name: "Reactivar" }).click();

    await expect(page.getByText("Cliente reactivado.")).toBeVisible();
    await expect(page.getByText(DEACTIVATION_BANNER)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Dar de baja" })).toBeVisible();
    await expect(page.getByText("Al día")).toBeVisible();
  });

  test("keeps the client active when Mercado Pago fails", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!, "staff-clients-provider-down");
    await page.goto(ANA_RECORD);

    await page.getByRole("button", { name: "Dar de baja" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Dar de baja a Ana Gómez?" });
    await dialog.getByLabel("Motivo (opcional)").fill("Se mudó");
    await dialog.getByRole("button", { name: "Dar de baja" }).click();

    await expect(page.getByText(PROVIDER_DOWN_MESSAGE)).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Motivo (opcional)")).toHaveValue("Se mudó");

    await dialog.getByRole("button", { name: "Volver" }).click();
    await expect(page.getByText(/^Dado de baja el/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Dar de baja" })).toBeVisible();
    await expect(page.getByText("Al día")).toBeVisible();
  });
});
