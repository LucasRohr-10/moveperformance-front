import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { DashboardParams } from "@/features/dashboard/staff/dashboard-params";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));
// The parts that read the API are async Server Components: each has its own test, here they are stubs.
vi.mock("@/features/dashboard/staff/hoy/hoy-view", () => ({ HoyView: () => <div data-testid="hoy-view" /> }));
vi.mock("@/features/dashboard/staff/negocio/negocio-view", () => ({
  NegocioView: ({ params }: { params: DashboardParams }) => <div data-testid="negocio-view">{params.tab}</div>,
}));
vi.mock("@/features/dashboard/staff/hoy/today-line", () => ({ TodayLine: () => <p>Hoy hay 14 reservas en 6 turnos.</p> }));
vi.mock("@/features/dashboard/staff/hoy/pending-view-switch", async () => {
  const { DashboardViewSwitch } = await import("@/features/dashboard/staff/dashboard-view-switch");
  return {
    PendingViewSwitch: ({ params }: { params: DashboardParams }) => <DashboardViewSwitch params={params} pendingCount={3} />,
  };
});

import { requireRole } from "@/lib/session";

import { StaffHomeContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

const USER: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59894555555",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

describe("StaffHomeContent", () => {
  it("is reserved for staff and renders the Hoy view by default", async () => {
    requireRoleMock.mockResolvedValue(USER);

    renderWithSnackbar(await StaffHomeContent({ searchParams: Promise.resolve({}) }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hola, Juan.");
    expect(screen.getByRole("link", { name: /^Hoy/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /^Negocio/ }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("Hoy hay 14 reservas en 6 turnos.")).toBeDefined();
    expect(screen.getByTestId("hoy-view")).toBeDefined();
  });

  it("marks Negocio as current when the URL says so", async () => {
    requireRoleMock.mockResolvedValue(USER);

    renderWithSnackbar(await StaffHomeContent({ searchParams: Promise.resolve({ vista: "negocio" }) }));

    expect(screen.getByRole("link", { name: /^Negocio/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.queryByTestId("hoy-view")).toBeNull();
    expect(screen.getByTestId("negocio-view")).toBeDefined();
  });

  it("hands the tab from the URL to the Negocio view and shows no Hoy", async () => {
    requireRoleMock.mockResolvedValue(USER);

    renderWithSnackbar(
      await StaffHomeContent({ searchParams: Promise.resolve({ vista: "negocio", tab: "turnos" }) }),
    );

    expect(screen.getByTestId("negocio-view").textContent).toBe("turnos");
  });
});
