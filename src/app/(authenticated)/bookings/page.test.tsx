import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/features/bookings/get-bookable-slots", () => ({
  getBookableSlots: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/features/bookings/get-booking-window", () => ({
  getBookingWindow: vi.fn().mockResolvedValue({ bookingWindowDays: 30, lastBookableDate: "2026-11-24" }),
}));
vi.mock("@/features/subscriptions", () => ({
  getMySubscriptions: vi.fn().mockResolvedValue({ performance: null, upcomingPerformances: [], recoveryPacks: [] }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { getMySubscriptions } from "@/features/subscriptions";
import { requireRole } from "@/lib/session";

import { BookingsContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);
const getMySubscriptionsMock = vi.mocked(getMySubscriptions);

describe("BookingsContent", () => {
  it("is reserved for clients and renders the booking grid", async () => {
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

    renderWithSnackbar(await BookingsContent({ searchParams: Promise.resolve({}) }));

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(await screen.findAllByText("Reservá tu horario.")).toHaveLength(2);
  });

  it("starts the grid on the service requested via the URL", async () => {
    requireRoleMock.mockResolvedValue({
      id: "1",
      name: "Ana Perez",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      role: USER_ROLES.CLIENT,
    });

    renderWithSnackbar(await BookingsContent({ searchParams: Promise.resolve({ service: "rehab" }) }));

    const [desktop] = await screen.findAllByRole("button", { name: "Fisioterapia" });
    expect(desktop.className).toContain("bg-white");
  });

  it("ignores an invalid service in the URL and falls back to the default", async () => {
    requireRoleMock.mockResolvedValue({
      id: "1",
      name: "Ana Perez",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      role: USER_ROLES.CLIENT,
    });

    renderWithSnackbar(await BookingsContent({ searchParams: Promise.resolve({ service: "<script>" }) }));

    const [desktop] = await screen.findAllByRole("button", { name: "Performance" });
    expect(desktop.className).toContain("bg-white");
  });

  it("still renders the grid when the subscriptions can't be loaded", async () => {
    requireRoleMock.mockResolvedValue({
      id: "1",
      name: "Ana Perez",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      role: USER_ROLES.CLIENT,
    });
    getMySubscriptionsMock.mockRejectedValueOnce(new Error("network"));

    renderWithSnackbar(await BookingsContent({ searchParams: Promise.resolve({}) }));

    expect(await screen.findAllByText("Reservá tu horario.")).toHaveLength(2);
  });
});
