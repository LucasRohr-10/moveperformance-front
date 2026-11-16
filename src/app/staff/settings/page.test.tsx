import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { CalendarStatus } from "@/lib/api/types";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/features/settings", () => ({
  getSettings: vi.fn(),
  SettingsForm: ({ initialValues }: { initialValues: { cancelLimitHours: number } }) => (
    <div data-testid="settings-form">hours:{initialValues.cancelLimitHours}</div>
  ),
}));
vi.mock("@/features/calendar", () => ({
  getCalendarStatus: vi.fn(),
  CalendarConnectionPanel: () => <div data-testid="calendar-panel" />,
}));

import { getCalendarStatus } from "@/features/calendar";
import { getSettings } from "@/features/settings";
import { requireRole } from "@/lib/session";

import { StaffSettingsContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);
const getSettingsMock = vi.mocked(getSettings);
const getCalendarStatusMock = vi.mocked(getCalendarStatus);

const staff: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899123456",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

const FOLLOWUP_SETTINGS = {
  expiringSoonDays: 7,
  noAttendanceDays: 7,
  prolongedInactivityDays: 30,
  frequencyDropRatio: 0.5,
  renewalGraceDays: 30,
  offlinePriceRehabEvaluation: null,
  offlinePriceRehabFollowup: null,
  offlinePriceRecoverySession: null,
  offlinePricePerformanceClass: null,
  offlineUnpaidLimit: 2,
  offlineDiscountEnabled: false,
  offlineDiscountPercent: null,
  transferEnabled: false,
  transferDetails: null,
};

const calendarStatus: CalendarStatus = { configured: true, professionals: [] };

function searchParams(params: { calendar?: string } = {}) {
  return Promise.resolve(params);
}

describe("StaffSettingsContent", () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
    getSettingsMock.mockReset();
    getCalendarStatusMock.mockReset();
    getCalendarStatusMock.mockResolvedValue(calendarStatus);
  });

  it("is reserved for staff and shows the form with the current settings", async () => {
    requireRoleMock.mockResolvedValue(staff);
    getSettingsMock.mockResolvedValue({
      cancelLimitHours: 4,
      bookingWindowDays: 14,
      pendingPaymentMinutes: 15,
      ...FOLLOWUP_SETTINGS,
    });

    renderWithSnackbar(await StaffSettingsContent({ searchParams: searchParams() }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Configuración" })).toBeDefined();
    expect(screen.getByTestId("settings-form").textContent).toBe("hours:4");
    expect(screen.getByTestId("calendar-panel")).toBeDefined();
  });

  it("does not read the settings when the role check redirects", async () => {
    requireRoleMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(StaffSettingsContent({ searchParams: searchParams() })).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(getSettingsMock).not.toHaveBeenCalled();
    expect(getCalendarStatusMock).not.toHaveBeenCalled();
  });

  it("shows a success message after a successful Google Calendar connection", async () => {
    requireRoleMock.mockResolvedValue(staff);
    getSettingsMock.mockResolvedValue({
      cancelLimitHours: 4,
      bookingWindowDays: 14,
      pendingPaymentMinutes: 15,
      ...FOLLOWUP_SETTINGS,
    });

    renderWithSnackbar(await StaffSettingsContent({ searchParams: searchParams({ calendar: "connected" }) }));

    expect(screen.getByText("Google Calendar conectado.")).toBeDefined();
  });

  it("shows an error message when the Google Calendar connection failed", async () => {
    requireRoleMock.mockResolvedValue(staff);
    getSettingsMock.mockResolvedValue({
      cancelLimitHours: 4,
      bookingWindowDays: 14,
      pendingPaymentMinutes: 15,
      ...FOLLOWUP_SETTINGS,
    });

    renderWithSnackbar(await StaffSettingsContent({ searchParams: searchParams({ calendar: "error" }) }));

    expect(screen.getByText("No se pudo conectar Google Calendar.")).toBeDefined();
  });
});
