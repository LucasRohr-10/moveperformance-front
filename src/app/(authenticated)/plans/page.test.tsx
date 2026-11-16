import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/features/plans", () => ({
  PlansSelectorSection: () => <div data-testid="plans-selector" />,
}));

import { requireRole } from "@/lib/session";

import { PlansContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

describe("PlansContent", () => {
  it("is reserved for clients and lists the Performance and Recovery plans", async () => {
    const user: AuthenticatedUser = {
      id: "1",
      name: "Ana Perez",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      role: USER_ROLES.CLIENT,
    };
    requireRoleMock.mockResolvedValue(user);

    renderWithSnackbar(await PlansContent());

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(
      screen.getByRole("heading", { level: 1, name: "Planes" }),
    ).toBeDefined();
    expect(screen.getByTestId("plans-selector")).toBeDefined();
    // Each service names itself inside its own card, so the page adds no headings of its own.
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.queryByText("Próximamente")).toBeNull();
  });
});
