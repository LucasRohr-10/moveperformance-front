// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetchClient } from "@/lib/api/client";
import type { BirthdaySettingsDto, TodayBirthdayDto } from "@/lib/api/types";

import {
  getBirthdaySettings,
  listTodayBirthdays,
  recordWhatsappOpened,
  saveBirthdaySettings,
} from "./staff-birthdays-api";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetchClient: vi.fn(),
}));

const apiFetchClientMock = vi.mocked(apiFetchClient);

const SETTINGS: BirthdaySettingsDto = { message: "Hola", emailEnabled: true, whatsappEnabled: false, sendHour: 9 };

const ANA: TodayBirthdayDto = {
  clientId: "c1",
  name: "Ana",
  lastName: "Pérez",
  phone: "+59899123456",
  age: 36,
  mailSentAt: null,
  whatsappOpenedAt: "2026-11-04T12:14:00.000Z",
};

describe("staff birthdays API", () => {
  beforeEach(() => {
    apiFetchClientMock.mockReset();
  });

  it("getBirthdaySettings reads the settings", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(SETTINGS));

    await expect(getBirthdaySettings()).resolves.toEqual(SETTINGS);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/birthdays/settings");
  });

  it("saveBirthdaySettings puts the whole settings", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(SETTINGS));

    await expect(saveBirthdaySettings(SETTINGS)).resolves.toEqual(SETTINGS);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/birthdays/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(SETTINGS),
    });
  });

  it("listTodayBirthdays reads today's list", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ date: "2026-11-04", items: [ANA] }));

    await expect(listTodayBirthdays()).resolves.toEqual({ date: "2026-11-04", items: [ANA] });
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/birthdays/today");
  });

  it("recordWhatsappOpened posts for the client", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json(ANA));

    await expect(recordWhatsappOpened("c1")).resolves.toEqual(ANA);
    expect(apiFetchClientMock).toHaveBeenCalledWith("/api/v1/staff/birthdays/today/c1/whatsapp", {
      method: "POST",
    });
  });

  it("throws on an API error", async () => {
    apiFetchClientMock.mockResolvedValue(Response.json({ code: "BIRTHDAY_NOT_FOUND" }, { status: 404 }));

    await expect(recordWhatsappOpened("c1")).rejects.toBeDefined();
  });
});
