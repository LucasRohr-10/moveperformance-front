import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BirthdaySettingsDto, TodayBirthdaysDto } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { getBirthdaySettings, recordWhatsappOpened } from "./staff-birthdays-api";
import { StaffBirthdaysPanel } from "./staff-birthdays-panel";

vi.mock("./staff-birthdays-api");

const getSettingsMock = vi.mocked(getBirthdaySettings);
const recordMock = vi.mocked(recordWhatsappOpened);

const SETTINGS: BirthdaySettingsDto = { message: "Hola", emailEnabled: true, whatsappEnabled: true, sendHour: 9 };

const TODAY: TodayBirthdaysDto = {
  date: "2026-11-04",
  items: [
    {
      clientId: "c1",
      name: "Ana",
      lastName: "Pérez",
      phone: "+59899123456",
      age: 36,
      mailSentAt: "2026-11-04T12:00:00.000Z",
      whatsappOpenedAt: null,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("StaffBirthdaysPanel", () => {
  it("loads the settings into the form and counts today's mails", async () => {
    getSettingsMock.mockResolvedValue(SETTINGS);

    renderWithSnackbar(<StaffBirthdaysPanel today={TODAY} todayFailed={false} onRetryToday={vi.fn()} onTodayChange={vi.fn()} />);

    expect(await screen.findByLabelText("Mensaje")).toBeDefined();
    expect(screen.getByText("Hoy salió 1 mail.")).toBeDefined();
  });

  it("offers a retry when the settings cannot be loaded", async () => {
    getSettingsMock.mockRejectedValueOnce(new Error("down")).mockResolvedValue(SETTINGS);
    renderWithSnackbar(<StaffBirthdaysPanel today={TODAY} todayFailed={false} onRetryToday={vi.fn()} onTodayChange={vi.fn()} />);

    await userEvent.setup().click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await screen.findByLabelText("Mensaje")).toBeDefined();
  });

  it("shows today's list and passes the recorded greeting up", async () => {
    getSettingsMock.mockResolvedValue(SETTINGS);
    const opened = { ...TODAY.items[0], whatsappOpenedAt: "2026-11-04T12:14:00.000Z" };
    recordMock.mockResolvedValue(opened);
    const onTodayChange = vi.fn();
    renderWithSnackbar(<StaffBirthdaysPanel today={TODAY} todayFailed={false} onRetryToday={vi.fn()} onTodayChange={onTodayChange} />);

    await userEvent.setup().click(await screen.findByRole("link", { name: "Saludar por WhatsApp" }));

    await vi.waitFor(() => expect(onTodayChange).toHaveBeenCalledWith({ ...TODAY, items: [opened] }));
  });

  it("says when today's birthdays could not be loaded and lets staff retry", async () => {
    getSettingsMock.mockResolvedValue(SETTINGS);
    const onRetryToday = vi.fn();
    renderWithSnackbar(
      <StaffBirthdaysPanel today={null} todayFailed onRetryToday={onRetryToday} onTodayChange={vi.fn()} />,
    );

    expect(await screen.findByText("No pudimos cargar los cumpleaños de hoy")).toBeDefined();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetryToday).toHaveBeenCalled();
  });
});
