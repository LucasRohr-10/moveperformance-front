import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SnackbarProvider } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import type { BirthdaysTodayDto } from "@/lib/api/types";

import { BirthdayTodayCard } from "./birthday-today-card";
import { getBirthdaysToday } from "./get-birthdays-today";
import { nextRedirectError } from "./today-fixtures";

vi.mock("./get-birthdays-today");
vi.mock("@/features/birthdays", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/birthdays")>()),
  recordWhatsappOpened: vi.fn(),
}));

const getBirthdaysTodayMock = vi.mocked(getBirthdaysToday);

// 21:00Z is 18:00 in Montevideo.
const DATA: BirthdaysTodayDto = {
  message: "Que tengas un gran día",
  whatsappEnabled: true,
  items: [
    {
      clientId: "c1",
      name: "Martina",
      lastName: "Pérez",
      phone: "+59899123456",
      age: 29,
      whatsappOpenedAt: null,
      booking: { service: "performance", startsAt: "2026-11-03T21:00:00.000Z" },
    },
    {
      clientId: "c2",
      name: "Diego",
      lastName: null,
      phone: "+59898765432",
      age: 41,
      whatsappOpenedAt: null,
      booking: { service: "rehab", startsAt: "2026-11-03T13:30:00.000Z" },
    },
  ],
};

const renderCard = async () => render(await BirthdayTodayCard(), { wrapper: SnackbarProvider });

describe("BirthdayTodayCard", () => {
  beforeEach(() => {
    getBirthdaysTodayMock.mockReset();
  });

  it("hides the birthday card when nobody has a booking today", async () => {
    getBirthdaysTodayMock.mockResolvedValue({ ...DATA, items: [] });

    await renderCard();

    expect(screen.queryByText("Cumpleaños hoy")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders one line per birthday client with its own WhatsApp link", async () => {
    getBirthdaysTodayMock.mockResolvedValue(DATA);

    await renderCard();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2, name: "Cumpleaños hoy" })).toBeDefined();
    expect(within(rows[0]).getByRole("link", { name: "Martina Pérez" }).getAttribute("href")).toBe("/staff/clients/c1");
    expect(rows[0].textContent).toContain("cumple 29 · Performance 18:00");
    expect(rows[1].textContent).toContain("Diego · cumple 41 · Rehab 10:30");

    const whatsapp = screen.getAllByRole("link", { name: "Saludar por WhatsApp" });
    expect(whatsapp).toHaveLength(2);
    expect(whatsapp[0].getAttribute("href")).toBe(
      `https://wa.me/59899123456?text=${encodeURIComponent("¡Feliz cumple, Martina! 🎉\nQue tengas un gran día")}`,
    );
    expect(whatsapp[0].getAttribute("target")).toBe("_blank");
    expect(whatsapp[1].getAttribute("href")).toContain("https://wa.me/59898765432");
    // The WhatsApp link is a sibling of the client link, never inside it.
    const clientLink = within(rows[0]).getByRole("link", { name: "Martina Pérez" });
    expect(clientLink.contains(whatsapp[0])).toBe(false);
    expect(whatsapp[0].closest("a[href^='/staff/clients']")).toBeNull();
  });

  it("offers no WhatsApp when it is off or the client has no phone", async () => {
    getBirthdaysTodayMock.mockResolvedValue({
      ...DATA,
      items: [DATA.items[0], { ...DATA.items[1], phone: null }],
    });
    const { unmount } = await renderCard();
    expect(screen.getAllByRole("link", { name: "Saludar por WhatsApp" })).toHaveLength(1);
    unmount();

    getBirthdaysTodayMock.mockResolvedValue({ ...DATA, whatsappEnabled: false });
    await renderCard();
    expect(screen.queryByRole("link", { name: "Saludar por WhatsApp" })).toBeNull();
  });

  it("shows an alert with Reintentar when the API fails", async () => {
    getBirthdaysTodayMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    await renderCard();

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar los cumpleaños de hoy");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/staff");
  });

  it("lets a Next error such as a redirect through instead of swallowing it", async () => {
    const redirectError = nextRedirectError();
    getBirthdaysTodayMock.mockRejectedValue(redirectError);

    await expect(BirthdayTodayCard()).rejects.toBe(redirectError);
  });
});
