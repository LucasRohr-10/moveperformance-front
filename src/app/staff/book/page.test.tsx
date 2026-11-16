import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { OfflinePrices } from "@/features/bookings/staff/offline-price";
import { getSettings } from "@/features/settings/get-settings";
import type { AuthenticatedUser } from "@/lib/session";
import { requireRole } from "@/lib/session";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { StaffBookContent } from "./page";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/settings/get-settings", () => ({ getSettings: vi.fn() }));
vi.mock("@/features/bookings/staff/staff-booking-panel", () => ({
  StaffBookingPanel: ({ initialClientId, prices }: { initialClientId: string | null; prices: OfflinePrices }) => (
    <div data-testid="panel" data-client={initialClientId ?? ""} data-prices={JSON.stringify(prices)} />
  ),
}));

const requireRoleMock = vi.mocked(requireRole);
const getSettingsMock = vi.mocked(getSettings);

const STAFF: AuthenticatedUser = {
  id: "2",
  name: "Juan",
  lastName: "Pereira",
  email: "juan@move.uy",
  phone: "+59899765432",
  birthDate: null,
  role: USER_ROLES.STAFF,
};

const SETTINGS = {
  offlinePriceRehabEvaluation: 1800,
  offlinePriceRehabFollowup: 1200,
  offlinePriceRecoverySession: 900,
  offlinePricePerformanceClass: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireRoleMock.mockResolvedValue(STAFF);
  getSettingsMock.mockResolvedValue(SETTINGS as Awaited<ReturnType<typeof getSettings>>);
});

describe("StaffBookContent", () => {
  it("is reserved for staff and reads clientId", async () => {
    renderWithSnackbar(await StaffBookContent({ searchParams: Promise.resolve({ clientId: "c1" }) }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.STAFF);
    expect(screen.getByRole("heading", { level: 1, name: "Reservar" })).toBeDefined();
    expect(
      screen.getByText("Reservale a un cliente cualquier servicio. Lo que no cubre su plan se cobra por fuera."),
    ).toBeDefined();
    expect(screen.getByTestId("panel").getAttribute("data-client")).toBe("c1");
  });

  it("starts without a client when the URL has none", async () => {
    renderWithSnackbar(await StaffBookContent({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("panel").getAttribute("data-client")).toBe("");
  });

  it("reads the prices on the server and passes them to the panel", async () => {
    renderWithSnackbar(await StaffBookContent({ searchParams: Promise.resolve({}) }));

    expect(JSON.parse(screen.getByTestId("panel").getAttribute("data-prices") ?? "")).toEqual({
      rehabEvaluation: 1800,
      rehabFollowup: 1200,
      recoverySession: 900,
      performanceClass: null,
    });
  });

  it("passes empty prices when settings fail", async () => {
    getSettingsMock.mockRejectedValue(new Error("boom"));

    renderWithSnackbar(await StaffBookContent({ searchParams: Promise.resolve({}) }));

    expect(JSON.parse(screen.getByTestId("panel").getAttribute("data-prices") ?? "")).toEqual({
      rehabEvaluation: null,
      rehabFollowup: null,
      recoverySession: null,
      performanceClass: null,
    });
  });
});
