import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/plans/staff/new-plan-panel", () => ({
  NewPlanPanel: () => <div data-testid="new-plan-panel" />,
}));

import { requireRole } from "@/lib/session";

import { NewPlanContent } from "./page";

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

describe("NewPlanContent", () => {
  it("is reserved for staff and shows the heading and the panel", async () => {
    requireRoleMock.mockResolvedValue(staff);

    renderWithSnackbar(await NewPlanContent());

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Nuevo plan" })).toBeDefined();
    expect(screen.getByTestId("new-plan-panel")).toBeDefined();
  });

  it("shows nothing when the role check redirects", async () => {
    requireRoleMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(NewPlanContent()).rejects.toThrow("NEXT_REDIRECT");
  });
});
