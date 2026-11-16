import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";
import type { AuthenticatedUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/features/subscriptions", () => ({
  MySubscriptionsSection: () => <div>subscriptions section</div>,
  MySubscriptionsSkeleton: () => <div>subscriptions skeleton</div>,
}));

vi.mock("@/features/upcoming-bookings", () => ({
  UpcomingBookingsSection: () => <div>upcoming bookings section</div>,
  UpcomingBookingsSkeleton: () => <div>upcoming bookings skeleton</div>,
}));

vi.mock("@/features/dashboard/month-stats-card", () => ({
  MonthStatsCard: () => <div>Tu mes en MOVE</div>,
  MonthStatsSkeleton: () => <div>month stats skeleton</div>,
}));

vi.mock("@/features/checkins/pending-checkin-section", () => ({
  PendingCheckinSection: () => <div>pending check-in section</div>,
}));

import { requireRole } from "@/lib/session";

import { DashboardContent } from "./page";

const requireRoleMock = vi.mocked(requireRole);

describe("DashboardContent", () => {
  it("is reserved for clients and greets the signed-in user", async () => {
    const user: AuthenticatedUser = {
      id: "1",
      name: "Ana",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      role: USER_ROLES.CLIENT,
    };
    requireRoleMock.mockResolvedValue(user);

    renderWithSnackbar(await DashboardContent());

    expect(requireRoleMock).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hola, Ana." }),
    ).toBeDefined();
    expect(screen.getByText("subscriptions section")).toBeDefined();
    expect(screen.getByText("pending check-in section")).toBeDefined();
    const upcoming = screen.getByText("upcoming bookings section");
    expect(upcoming.compareDocumentPosition(screen.getByText("subscriptions section"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      screen.getByText("pending check-in section").compareDocumentPosition(upcoming),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText("Tu mes en MOVE")).toBeDefined();
    expect(screen.getByText("Reservar")).toBeDefined();
    expect(screen.queryByText("Próximamente")).toBeNull();
  });
});
