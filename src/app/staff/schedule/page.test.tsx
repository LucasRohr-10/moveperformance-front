import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/features/attendance/staff/daily-slots-panel", () => ({
  DailySlotsPanel: ({ initialDate }: { initialDate: string }) => (
    <div data-testid="daily-slots-panel">{initialDate}</div>
  ),
}));

import { requireRole } from "@/lib/session";

import { StaffScheduleContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);
const searchParams = (query: Record<string, string> = {}) => Promise.resolve(query);

describe("StaffScheduleContent", () => {
  it("is reserved for staff and shows the daily attendance panel", async () => {
    const user: AuthenticatedUser = {
      id: "2",
      name: "Juan Pereira",
      lastName: "Pereira",
      email: "juan@move.uy",
      phone: "+59899123456",
      birthDate: null,
      role: USER_ROLES.STAFF,
    };
    requireRoleMock.mockResolvedValue(user);

    renderWithSnackbar(await StaffScheduleContent({ searchParams: searchParams() }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(
      screen.getByRole("heading", { level: 1, name: "Asistencias" }),
    ).toBeDefined();
    expect(screen.getByTestId("daily-slots-panel")).toBeDefined();
    // Those two live in the sidebar now, not as tabs on this page.
    expect(screen.queryByRole("link", { name: "Plantillas de turnos" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Profesionales" })).toBeNull();
  });

  it("passes the date from the URL to the daily slots panel", async () => {
    requireRoleMock.mockResolvedValue({
      id: "2",
      name: "Juan",
      lastName: null,
      email: "juan@move.uy",
      phone: null,
      birthDate: null,
      role: USER_ROLES.STAFF,
    });

    renderWithSnackbar(await StaffScheduleContent({ searchParams: searchParams({ date: "2026-11-02" }) }));

    expect(screen.getByTestId("daily-slots-panel").textContent).toBe("2026-11-02");
  });
});
