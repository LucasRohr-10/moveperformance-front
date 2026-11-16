import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/checkins/checkins-server-api", () => ({ getPendingCheckin: vi.fn() }));
vi.mock("@/features/checkins", () => ({
  CheckinForm: ({ checkin }: { checkin: { id: string } }) => <div data-testid="checkin-form">{checkin.id}</div>,
  NoPendingCheckin: () => <p>No tenés check-ins pendientes.</p>,
}));

import { getPendingCheckin } from "@/features/checkins/checkins-server-api";
import { requireRole } from "@/lib/session";

import { CheckInContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);
const pendingMock = vi.mocked(getPendingCheckin);

const client: AuthenticatedUser = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: USER_ROLES.CLIENT,
};

describe("CheckInContent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireRoleMock.mockResolvedValue(client);
  });

  it("greets the client by first name and shows the form", async () => {
    pendingMock.mockResolvedValue({ checkin: { id: "c-1", period: "2026-10", firstName: "Ana" } });

    renderWithSnackbar(await CheckInContent());

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(screen.getByRole("heading", { level: 1, name: "¿Cómo venís, Ana?" })).toBeDefined();
    expect(screen.getByText("Check-in mensual · te toma 1 minuto y nos ayuda a acompañarte mejor.")).toBeDefined();
    expect(screen.getByTestId("checkin-form").textContent).toBe("c-1");
  });

  it("tells the client when there is no pending check-in", async () => {
    pendingMock.mockResolvedValue({ checkin: null });

    renderWithSnackbar(await CheckInContent());

    expect(screen.getByText("No tenés check-ins pendientes.")).toBeDefined();
    expect(screen.queryByTestId("checkin-form")).toBeNull();
  });
});
