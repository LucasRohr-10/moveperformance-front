import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/features/plans/staff/staff-plans-panel", () => ({
  StaffPlansPanel: () => <div data-testid="staff-plans-panel" />,
}));

import { requireRole } from "@/lib/session";

import { StaffPlansContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

const staff: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899123456",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

describe("StaffPlansContent", () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
  });

  it("is reserved for staff and shows the panel", async () => {
    requireRoleMock.mockResolvedValue(staff);

    renderWithSnackbar(await StaffPlansContent());

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByTestId("staff-plans-panel")).toBeDefined();
  });

  it("shows nothing when the role check redirects", async () => {
    requireRoleMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(StaffPlansContent()).rejects.toThrow("NEXT_REDIRECT");
  });
});
