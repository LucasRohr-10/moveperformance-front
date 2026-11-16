import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import { addDaysToDate, todayBusinessDate } from "@/features/bookings/slots";
import type { AuthenticatedUser } from "@/lib/session";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/day-editor/day-editor-panel", () => ({
  DayEditorPanel: ({ from, to }: { from: string; to?: string }) => (
    <div data-testid="day-editor-panel">{`${from}|${to ?? ""}`}</div>
  ),
}));

import { requireRole } from "@/lib/session";

import { StaffEditDayContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);
const searchParams = (query: Record<string, string> = {}) => Promise.resolve(query);
const staff: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: null,
  email: "juan@move.uy",
  phone: null,
  birthDate: null,
  role: USER_ROLES.STAFF,
};

describe("StaffEditDayContent", () => {
  it("is reserved for staff and opens the editor for the date in the URL", async () => {
    requireRoleMock.mockResolvedValue(staff);
    const tomorrow = addDaysToDate(todayBusinessDate(), 1);

    renderWithSnackbar(await StaffEditDayContent({ searchParams: searchParams({ date: tomorrow }) }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Editar día" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Asistencias" })).toHaveProperty(
      "href",
      expect.stringContaining("/staff/schedule"),
    );
    expect(screen.getByTestId("day-editor-panel").textContent).toBe(`${tomorrow}|`);
  });

  it("passes the end of a range to the editor", async () => {
    requireRoleMock.mockResolvedValue(staff);
    const from = addDaysToDate(todayBusinessDate(), 1);
    const to = addDaysToDate(todayBusinessDate(), 3);

    renderWithSnackbar(await StaffEditDayContent({ searchParams: searchParams({ date: from, to }) }));

    expect(screen.getByTestId("day-editor-panel").textContent).toBe(`${from}|${to}`);
  });

  it("editor page with an invalid date shows the empty state", async () => {
    requireRoleMock.mockResolvedValue(staff);

    renderWithSnackbar(await StaffEditDayContent({ searchParams: searchParams({ date: "no-es-una-fecha" }) }));

    expect(screen.getByText("Ese día no se puede editar")).toBeDefined();
    expect(screen.queryByTestId("day-editor-panel")).toBeNull();
    expect(screen.getByRole("link", { name: "Volver a turnos y asistencia" })).toBeDefined();
  });

  it("shows the empty state for a day outside the window or already gone", async () => {
    requireRoleMock.mockResolvedValue(staff);
    const yesterday = addDaysToDate(todayBusinessDate(), -1);

    renderWithSnackbar(await StaffEditDayContent({ searchParams: searchParams({ date: yesterday }) }));

    expect(screen.getByText("Ese día no se puede editar")).toBeDefined();
  });

  it("shows the empty state when the date is missing", async () => {
    requireRoleMock.mockResolvedValue(staff);

    renderWithSnackbar(await StaffEditDayContent({ searchParams: searchParams() }));

    expect(screen.getByText("Ese día no se puede editar")).toBeDefined();
  });
});
