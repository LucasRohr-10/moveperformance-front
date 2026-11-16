import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { BirthdaysTodayDto } from "@/lib/api/types";

import { parseDashboardParams } from "../dashboard-params";
import { getBirthdaysToday } from "./get-birthdays-today";
import { getTodaySummary } from "./get-today-summary";
import { PendingViewSwitch } from "./pending-view-switch";
import { nextRedirectError, SUMMARY } from "./today-fixtures";

vi.mock("./get-today-summary");
vi.mock("./get-birthdays-today");

const getTodaySummaryMock = vi.mocked(getTodaySummary);
const getBirthdaysTodayMock = vi.mocked(getBirthdaysToday);

const BIRTHDAYS: BirthdaysTodayDto = {
  message: "Hola",
  whatsappEnabled: true,
  items: [
    {
      clientId: "c1",
      name: "Martina",
      lastName: null,
      phone: null,
      age: 29,
      whatsappOpenedAt: null,
      booking: { service: "performance", startsAt: "2026-11-03T21:00:00.000Z" },
    },
  ],
};

const FAILURE = new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" });
const params = parseDashboardParams({});

describe("PendingViewSwitch", () => {
  beforeEach(() => {
    getTodaySummaryMock.mockReset();
    getBirthdaysTodayMock.mockReset();
  });

  it("badges Hoy with the tiles that ask for something plus the birthday", async () => {
    getTodaySummaryMock.mockResolvedValue(SUMMARY);
    getBirthdaysTodayMock.mockResolvedValue(BIRTHDAYS);

    render(await PendingViewSwitch({ params }));

    expect(screen.getByRole("link", { name: /^Hoy/ }).textContent).toContain("4");
  });

  it("counts without the birthday when the birthdays fail", async () => {
    getTodaySummaryMock.mockResolvedValue(SUMMARY);
    getBirthdaysTodayMock.mockRejectedValue(FAILURE);

    render(await PendingViewSwitch({ params }));

    expect(screen.getByRole("link", { name: /^Hoy/ }).textContent).toContain("3");
  });

  it("shows no badge when the summary fails, and the switch still works", async () => {
    getTodaySummaryMock.mockRejectedValue(FAILURE);
    getBirthdaysTodayMock.mockResolvedValue(BIRTHDAYS);

    render(await PendingViewSwitch({ params }));

    expect(screen.getByRole("link", { name: /^Hoy/ }).textContent).toBe("HoyLo que hay que hacer hoy");
    expect(screen.getByRole("link", { name: /^Negocio/ }).getAttribute("href")).toBe("/staff?vista=negocio");
  });

  it("lets a Next error from the summary through instead of swallowing it", async () => {
    const redirectError = nextRedirectError();
    getTodaySummaryMock.mockRejectedValue(redirectError);
    getBirthdaysTodayMock.mockResolvedValue(BIRTHDAYS);

    await expect(PendingViewSwitch({ params })).rejects.toBe(redirectError);
  });

  it("lets a Next error from the birthdays through instead of counting without them", async () => {
    const redirectError = nextRedirectError();
    getTodaySummaryMock.mockResolvedValue(SUMMARY);
    getBirthdaysTodayMock.mockRejectedValue(redirectError);

    await expect(PendingViewSwitch({ params })).rejects.toBe(redirectError);
  });
});
