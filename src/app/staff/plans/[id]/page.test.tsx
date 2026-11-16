import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/plans/staff/edit-plan-panel", () => ({
  EditPlanPanel: ({ planId }: { planId: string }) => (
    <div data-testid="edit-plan-panel">{planId}</div>
  ),
}));

import { requireRole } from "@/lib/session";

import { EditPlanContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

describe("EditPlanContent", () => {
  it("is reserved for staff and shows the edit panel for the given plan", async () => {
    const user: AuthenticatedUser = {
      id: "2",
      name: "Juan",
      lastName: "Pereira",
      email: "juan@move.uy",
      phone: "+59899123456",
      birthDate: null,
      role: USER_ROLES.STAFF,
    };
    requireRoleMock.mockResolvedValue(user);

    renderWithSnackbar(await EditPlanContent({ planId: "plan-1" }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Editar plan" })).toBeDefined();
    expect(screen.getByTestId("edit-plan-panel").textContent).toBe("plan-1");
  });

  it("shows nothing when the role check redirects", async () => {
    requireRoleMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(EditPlanContent({ planId: "plan-1" })).rejects.toThrow("NEXT_REDIRECT");
  });
});
