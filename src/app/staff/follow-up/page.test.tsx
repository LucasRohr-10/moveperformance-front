import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/features/followup", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/followup")>()),
  FollowupPanel: ({ type, riskOnly }: { type: string | null; riskOnly?: boolean }) => (
    <div data-testid="followup-panel">{riskOnly ? "risk" : (type ?? "all")}</div>
  ),
}));

import { requireRole } from "@/lib/session";

import { StaffFollowUpContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

const staff: AuthenticatedUser = {
  id: "2",
  name: "Juan Pereira",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899765432",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

const searchParams = (tipo?: string, riesgo?: string) =>
  Promise.resolve({ ...(tipo ? { tipo } : {}), ...(riesgo ? { riesgo } : {}) });

describe("StaffFollowUpContent", () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
    requireRoleMock.mockResolvedValue(staff);
  });

  it("renders the follow-up screen for staff", async () => {
    renderWithSnackbar(await StaffFollowUpContent({ searchParams: searchParams() }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Seguimiento y retención" })).toBeDefined();
    expect(
      screen.getByText(
        "Alertas automáticas sobre situaciones que requieren revisión del equipo. Cada alerta permite contactar al cliente y registrar el resultado del seguimiento.",
      ),
    ).toBeDefined();
    expect(screen.getByTestId("followup-panel").textContent).toBe("all");
  });

  it("filters by the type in the URL", async () => {
    renderWithSnackbar(await StaffFollowUpContent({ searchParams: searchParams("expiring") }));

    expect(screen.getByTestId("followup-panel").textContent).toBe("expiring");
  });

  it("falls back to all the alerts for an unknown type", async () => {
    renderWithSnackbar(await StaffFollowUpContent({ searchParams: searchParams("cualquiera") }));

    expect(screen.getByTestId("followup-panel").textContent).toBe("all");
  });

  it("passes the filter from the URL", async () => {
    renderWithSnackbar(await StaffFollowUpContent({ searchParams: searchParams(undefined, "true") }));

    expect(screen.getByTestId("followup-panel").textContent).toBe("risk");
  });

  it("gives the risk filter priority over a type", async () => {
    renderWithSnackbar(await StaffFollowUpContent({ searchParams: searchParams("expiring", "true") }));

    expect(screen.getByTestId("followup-panel").textContent).toBe("risk");
  });

  it("ignores riesgo when it is not true", async () => {
    renderWithSnackbar(await StaffFollowUpContent({ searchParams: searchParams(undefined, "si") }));

    expect(screen.getByTestId("followup-panel").textContent).toBe("all");
  });
});
