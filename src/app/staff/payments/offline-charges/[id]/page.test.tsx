import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/payments/staff/offline-charge-detail-panel", () => ({
  OfflineChargeDetailPanel: ({ chargeId }: { chargeId: string }) => (
    <div data-testid="offline-charge-detail-panel">{chargeId}</div>
  ),
}));

import { requireRole } from "@/lib/session";

import { StaffOfflineChargeDetailContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

describe("StaffOfflineChargeDetailContent", () => {
  it("is reserved for staff and shows the panel", async () => {
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

    renderWithSnackbar(await StaffOfflineChargeDetailContent({ chargeId: "ch1" }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByTestId("offline-charge-detail-panel").textContent).toBe("ch1");
  });
});
