import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));

vi.mock("@/features/attendance/staff/attendance-roster-panel", () => ({
  AttendanceRosterPanel: ({ timeSlotId }: { timeSlotId: string }) => (
    <div data-testid="attendance-roster-panel">{timeSlotId}</div>
  ),
}));

vi.mock("@/features/attendance/staff/time-slot-detail-api", () => ({
  getTimeSlotDetail: vi.fn(),
  listDailySlots: vi.fn(),
}));

import { getTimeSlotDetail, listDailySlots } from "@/features/attendance/staff/time-slot-detail-api";
import { requireRole } from "@/lib/session";

import { StaffShiftRosterContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);
const getTimeSlotDetailMock = vi.mocked(getTimeSlotDetail);
const listDailySlotsMock = vi.mocked(listDailySlots);

const user: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899123456",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

describe("StaffShiftRosterContent", () => {
  it("titles the page with the slot's time, service, professional and reservation count", async () => {
    requireRoleMock.mockResolvedValue(user);
    getTimeSlotDetailMock.mockResolvedValue({
      id: "slot-1",
      service: "performance",
      // 22:00 UTC is 19:00 in America/Montevideo (UTC-3, no DST).
      startsAt: "2026-10-21T22:00:00.000Z",
      endsAt: "2026-10-21T23:00:00.000Z",
      capacity: 10,
      booked: 8,
      professionalName: "Juan Pérez",
      calendarBlockedAt: null,
      cancelledAt: null,
      cancelReason: null,
      staffEditedAt: null,
      isIndividual: false,
      templateProfessionalName: null,
      unmarkedAttendance: 0,
    });
    listDailySlotsMock.mockResolvedValue([]);

    renderWithSnackbar(await StaffShiftRosterContent({ timeSlotId: "slot-1" }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(getTimeSlotDetailMock).toHaveBeenCalledWith("slot-1");
    expect(
      screen.getByRole("heading", { level: 1, name: "19:00 · Performance" }),
    ).toBeDefined();
    expect(screen.getByText(/Juan Pérez · 8 de 10 reservas/)).toBeDefined();
    expect(screen.getByTestId("attendance-roster-panel").textContent).toBe("slot-1");
  });

  it("falls back to a generic title when the slot detail can't be loaded", async () => {
    requireRoleMock.mockResolvedValue(user);
    getTimeSlotDetailMock.mockRejectedValue(new Error("not found"));

    renderWithSnackbar(await StaffShiftRosterContent({ timeSlotId: "slot-404" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Asistencia del turno" }),
    ).toBeDefined();
    expect(screen.getByTestId("attendance-roster-panel").textContent).toBe("slot-404");
  });
});
