import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/clients/staff/client-detail-panel", () => ({
  ClientDetailPanel: ({ clientId }: { clientId: string }) => (
    <div data-testid="client-detail-panel">{clientId}</div>
  ),
}));

import { requireRole } from "@/lib/session";

import { StaffClientDetailContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

describe("StaffClientDetailContent", () => {
  it("is reserved for staff and shows the detail panel for the given client", async () => {
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

    renderWithSnackbar(await StaffClientDetailContent({ clientId: "client-1" }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByTestId("client-detail-panel").textContent).toBe(
      "client-1",
    );
  });
});
