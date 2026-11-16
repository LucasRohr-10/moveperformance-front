import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { daysBetween, isoWeekday, mondayOf } from "@/features/bookings/slots";
import type { StaffBookingsBatchDto, StaffBookingsInput } from "@/lib/api/types";

import { businessDateFromToday, STAFF_BOOKING_CLIENT_IDS as IDS } from "./support/offline-charges-fixtures";
import { setOwner, setScenario } from "./support/use-scenario";

const SLOT_TIME = "10:00";
const DAYS_PER_WEEK = 7;
const CAP_NOTICE =
  "Este cliente llegó al máximo de cosas sin pagar de Configuración. Registrá un pago o quitá los turnos que se cobran por fuera.";
const DEACTIVATED_NOTICE = "Este cliente está dado de baja. Reactivalo desde su ficha para reservarle.";

// Each test is its own staff member, so what one books never shows up in another running in parallel.
async function actAsStaff(page: Page, baseURL: string): Promise<void> {
  await setScenario(page.context(), baseURL, "staff-booking");
  await setOwner(page.context(), baseURL, randomUUID());
}

function isMobile(testInfo: TestInfo): boolean {
  return testInfo.project.name === "mobile";
}

function gridView(page: Page, testInfo: TestInfo): Locator {
  return page.getByTestId(isMobile(testInfo) ? "booking-grid-mobile" : "booking-grid-desktop");
}

function bookingRequest(page: Page, clientId: string) {
  return page.waitForRequest(
    (request) =>
      request.method() === "POST" && new URL(request.url()).pathname === `/api/v1/staff/clients/${clientId}/bookings`,
  );
}

function bookingResponse(page: Page, clientId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === `/api/v1/staff/clients/${clientId}/bookings`,
  );
}

/** "dd/mm" of a business date, as the pop-up writes a slot. */
function dayAndMonth(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

async function chooseClient(page: Page, search: string, fullName: string): Promise<void> {
  await page.getByRole("textbox", { name: "Cliente", exact: true }).fill(search);
  await page.getByRole("button", { name: `Elegir a ${fullName}` }).click();
  await expect(page.getByRole("region", { name: "Cliente elegido" })).toContainText(fullName);
}

async function openReservar(page: Page, search: string, fullName: string): Promise<void> {
  await page.goto("/staff/book");
  await expect(page.getByRole("heading", { level: 1, name: "Reservar" })).toBeVisible();
  await chooseClient(page, search, fullName);
}

async function chooseService(page: Page, testInfo: TestInfo, label: "Performance" | "Fisioterapia" | "Recovery") {
  await gridView(page, testInfo).getByRole("button", { name: new RegExp(`^${label}`) }).click();
}

/**
 * The 10:00 slot of a business date in the calendar: it moves to that week first. Desktop: the 10:00 row, the
 * date's column. Mobile: the day chip, then the slot. Keeps which week is on screen between picks.
 */
function calendar(page: Page, testInfo: TestInfo) {
  const view = gridView(page, testInfo);
  const firstMonday = mondayOf(businessDateFromToday(0));
  let week = 0;

  return {
    async pick(date: string): Promise<void> {
      const target = Math.floor(daysBetween(firstMonday, date) / DAYS_PER_WEEK);
      for (; week < target; week += 1) await view.getByRole("button", { name: "Semana siguiente" }).click();
      for (; week > target; week -= 1) await view.getByRole("button", { name: "Semana anterior" }).click();

      if (isMobile(testInfo)) {
        const dayNumber = String(Number(date.split("-")[2]));
        await view.getByRole("button").filter({ has: page.getByText(dayNumber, { exact: true }) }).first().click();
        await view.getByRole("button", { pressed: false }).filter({ hasText: SLOT_TIME }).click();
        return;
      }
      const row = view.locator(`xpath=.//div[span[normalize-space()='${SLOT_TIME}']]`);
      await row.locator(":scope > *").nth(isoWeekday(date)).click();
    },
  };
}

/** The cart with its coverage lines: the card next to the grid on desktop, the sheet on mobile. */
async function openCart(page: Page, testInfo: TestInfo): Promise<Locator> {
  if (!isMobile(testInfo)) return gridView(page, testInfo);
  await page.getByRole("button", { name: "Ver tu reserva" }).tap();
  return page.getByRole("dialog", { name: /^Reserva para / });
}

test.describe("Staff books for a client", () => {
  test("books a covered Performance slot with no pop-up", async ({ page, baseURL }, testInfo) => {
    await actAsStaff(page, baseURL!);
    await openReservar(page, "Sofía", "Sofía Pérez");

    await chooseService(page, testInfo, "Performance");
    await calendar(page, testInfo).pick(businessDateFromToday(2));
    const cart = await openCart(page, testInfo);
    await expect(cart.getByText("Incluido en su plan")).toBeVisible();

    const sent = bookingRequest(page, IDS.sofia);
    await cart.getByRole("button", { name: "Confirmar reservas" }).click();
    const body = (await sent).postDataJSON() as StaffBookingsInput;

    expect(body.paymentMethod).toBe("undecided");
    const snackbar = page.getByRole("status").filter({ hasText: "Turno reservado" });
    await expect(snackbar).toBeVisible();
    await expect(snackbar.getByRole("link", { name: "Ver ficha" })).toHaveAttribute("href", `/staff/clients/${IDS.sofia}`);
    await expect(page.getByRole("dialog", { name: /se cobra/ })).toHaveCount(0);
  });

  test("uses the pack on the first Recovery slot and charges the second offline", async ({ page, baseURL }, testInfo) => {
    await actAsStaff(page, baseURL!);
    await openReservar(page, "Sofía", "Sofía Pérez");
    const first = businessDateFromToday(2);
    const second = businessDateFromToday(3);

    await chooseService(page, testInfo, "Recovery");
    const picker = calendar(page, testInfo);
    await picker.pick(first);
    await picker.pick(second);
    const cart = await openCart(page, testInfo);
    await expect(cart.getByText("Usa 1 sesión del paquete")).toHaveCount(1);
    await expect(cart.getByText("Se cobra por fuera")).toHaveCount(1);

    await cart.getByRole("button", { name: "Confirmar reservas" }).click();
    const dialog = page.getByRole("dialog", { name: "1 reserva se cobra por fuera" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Al cliente le llega el mail de reserva confirmada igual.")).toBeVisible();
    await expect(dialog.getByRole("listitem")).toHaveCount(1);
    await expect(dialog.getByRole("listitem")).toContainText(`Recovery · `);
    await expect(dialog.getByRole("listitem")).toContainText(dayAndMonth(second));
    await expect(dialog.getByRole("listitem")).not.toContainText(dayAndMonth(first));
    await expect(dialog.getByText("$ 900")).toBeVisible();
    await expect(dialog.getByText("Precio de Configuración.")).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "A definir" })).toHaveAttribute("aria-checked", "true");

    const answered = bookingResponse(page, IDS.sofia);
    await dialog.getByRole("button", { name: "Reservar" }).click();
    const batch = (await (await answered).json()) as StaffBookingsBatchDto;

    expect(batch.booked.map((booked) => booked.source)).toEqual(["package", "staff_offline"]);
    expect(batch.booked[1].offlineCharge).toMatchObject({ amount: 900, paymentMethod: "undecided" });
    await expect(page.getByRole("status").filter({ hasText: "2 turnos reservados" })).toBeVisible();
  });

  test("books a Rehab follow-up offline at the configured price", async ({ page, baseURL }, testInfo) => {
    await actAsStaff(page, baseURL!);
    await openReservar(page, "Juan", "Juan Silva");

    await chooseService(page, testInfo, "Fisioterapia");
    await calendar(page, testInfo).pick(businessDateFromToday(2));
    const cart = await openCart(page, testInfo);
    await expect(cart.getByText("Se cobra por fuera")).toBeVisible();
    await cart.getByRole("radiogroup", { name: "Tipo de sesión" }).getByRole("radio", { name: "Seguimiento" }).click();

    await cart.getByRole("button", { name: "Confirmar reservas" }).click();
    const dialog = page.getByRole("dialog", { name: "1 reserva se cobra por fuera" });
    await expect(dialog.getByText(/^Rehab · .+ · Seguimiento$/)).toBeVisible();
    await expect(dialog.getByText("$ 1.500")).toBeVisible();
    // The price is fixed: it is changed in Configuración, never here.
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    await expect(dialog.getByRole("spinbutton")).toHaveCount(0);
    await dialog.getByRole("radio", { name: "Transferencia" }).click();

    const sent = bookingRequest(page, IDS.juan);
    const answered = bookingResponse(page, IDS.juan);
    await dialog.getByRole("button", { name: "Reservar" }).click();
    const body = (await sent).postDataJSON() as StaffBookingsInput & Record<string, unknown>;
    const batch = (await (await answered).json()) as StaffBookingsBatchDto;

    expect(body.paymentMethod).toBe("transfer");
    expect(body.items).toHaveLength(1);
    expect(body.items[0].rehabKind).toBe("followup");
    expect("amount" in body).toBe(false);
    expect("amount" in body.items[0]).toBe(false);
    expect(batch.booked[0].offlineCharge).toMatchObject({ amount: 1500, paymentMethod: "transfer" });
    await expect(page.getByRole("status").filter({ hasText: "Turno reservado" })).toBeVisible();
  });

  test("blocks the cart when the client is at the limit", async ({ page, baseURL }, testInfo) => {
    await actAsStaff(page, baseURL!);
    await openReservar(page, "Ana", "Ana Díaz");

    await chooseService(page, testInfo, "Performance");
    await calendar(page, testInfo).pick(businessDateFromToday(2));
    const cart = await openCart(page, testInfo);

    await expect(cart.getByText("Se cobra por fuera")).toBeVisible();
    await expect(cart.getByText(CAP_NOTICE)).toBeVisible();
    await expect(cart.getByRole("button", { name: "Confirmar reservas" })).toBeDisabled();
  });

  test("starts an empty cart when the client changes", async ({ page, baseURL }, testInfo) => {
    await actAsStaff(page, baseURL!);
    await openReservar(page, "Sofía", "Sofía Pérez");
    await chooseService(page, testInfo, "Performance");
    await calendar(page, testInfo).pick(businessDateFromToday(2));
    if (isMobile(testInfo)) {
      await expect(page.getByRole("button", { name: "Ver tu reserva" })).toBeVisible();
    } else {
      await expect(gridView(page, testInfo).getByText("Incluido en su plan")).toBeVisible();
    }

    await page.getByRole("region", { name: "Cliente elegido" }).getByRole("button", { name: "Cambiar cliente" }).click();
    await expect(page).toHaveURL(/\/staff\/book$/);
    await chooseClient(page, "Juan", "Juan Silva");

    await expect(page).toHaveURL(new RegExp(`\\?clientId=${IDS.juan}$`));
    if (isMobile(testInfo)) {
      await expect(gridView(page, testInfo).getByRole("button", { name: /^Performance/ })).toBeVisible();
      await expect(page.getByRole("button", { name: "Ver tu reserva" })).toHaveCount(0);
    } else {
      const view = gridView(page, testInfo);
      await expect(view.getByText("Reserva para Juan Silva")).toBeVisible();
      await expect(view.getByText("Elegí uno o más horarios de la grilla.")).toBeVisible();
    }
  });

  test("enters from the client's record", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto(`/staff/clients/${IDS.sofia}`);
    await expect(page.getByRole("heading", { level: 1, name: "Sofía Pérez" })).toBeVisible();

    await page.getByRole("link", { name: "Reservar para este cliente" }).click();

    await expect(page).toHaveURL(new RegExp(`/staff/book\\?clientId=${IDS.sofia}$`));
    const bar = page.getByRole("region", { name: "Cliente elegido" });
    await expect(bar).toContainText("Sofía Pérez");
    await expect(bar.getByRole("button", { name: "Cambiar cliente" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Cliente", exact: true })).toHaveCount(0);
  });

  test("refuses a deactivated client", async ({ page, baseURL }) => {
    await actAsStaff(page, baseURL!);
    await page.goto(`/staff/book?clientId=${IDS.diego}`);

    await expect(page.getByText(DEACTIVATED_NOTICE)).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir su ficha →" })).toHaveAttribute("href", `/staff/clients/${IDS.diego}`);
    await expect(page.getByRole("region", { name: "Cliente elegido" })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Cliente", exact: true })).toBeVisible();
    await expect(page.getByTestId("booking-grid-desktop")).toHaveCount(0);
  });
});
