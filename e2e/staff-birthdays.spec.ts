import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { setOwner, setScenario } from "./support/use-scenario";

async function actAsStaff(page: Page, baseURL: string, scenario: "staff-birthdays" | "staff-birthdays-empty") {
  await setScenario(page.context(), baseURL, scenario);
  await setOwner(page.context(), baseURL, randomUUID());
}

test.describe("Staff birthdays", () => {
  test("saves the birthday greeting and previews it live", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!, "staff-birthdays");
    await page.goto("/staff/announcements");

    await page.getByRole("tab", { name: "Cumpleaños 2" }).click();
    const message = page.getByRole("textbox", { name: "Mensaje" });
    await expect(message).toHaveValue(/Hoy queremos celebrarte/);

    await message.fill("¡Que lo pases genial!\nTe esperamos.");
    await expect(page.getByTestId("whatsapp-preview")).toHaveText("¡Feliz cumple, Nombre! 🎉\n¡Que lo pases genial!\nTe esperamos.");
    await expect(page.getByTestId("mail-preview-message")).toHaveText("¡Que lo pases genial!\nTe esperamos.");

    // The checkbox itself is visually hidden: a person toggles it through its label.
    await page.locator("label").filter({ has: page.getByRole("checkbox", { name: /Mail/ }) }).click();
    await page.getByLabel("Hora").selectOption("10");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Saludo de cumpleaños guardado.")).toBeVisible();

    await page.reload();
    await page.getByRole("tab", { name: "Cumpleaños 2" }).click();
    await expect(page.getByRole("textbox", { name: "Mensaje" })).toHaveValue("¡Que lo pases genial!\nTe esperamos.");
    await expect(page.getByRole("checkbox", { name: /Mail/ })).not.toBeChecked();
    await expect(page.getByLabel("Hora")).toHaveValue("10");
  });

  test("greets by WhatsApp and records it", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!, "staff-birthdays");
    await page.context().route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "ok" }));
    await page.goto("/staff/announcements");
    await page.getByRole("tab", { name: "Cumpleaños 2" }).click();

    await expect(page.getByText("Ana Pérez", { exact: false })).toBeVisible();
    await expect(page.getByText(/Sin teléfono/)).toBeVisible();
    const whatsapp = page.getByRole("link", { name: "Saludar por WhatsApp" });
    await expect(whatsapp).toHaveCount(1);
    await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/59899123456\?text=/);

    const chat = page.context().waitForEvent("page");
    await whatsapp.click();
    expect((await chat).url()).toContain("https://wa.me/59899123456");

    await expect(page.getByRole("link", { name: /^WhatsApp abierto \d{2}:\d{2}$/ })).toBeVisible();
  });

  test("says when nobody has a birthday today", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!, "staff-birthdays-empty");
    await page.goto("/staff/announcements");

    await page.getByRole("tab", { name: "Cumpleaños" }).click();

    await expect(page.getByText("Hoy no cumple nadie.")).toBeVisible();
  });
});
