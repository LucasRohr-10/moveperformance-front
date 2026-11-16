import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/bookings/public-reserve/public-booking", () => ({
  PublicBooking: ({ service, initialUser }: { service: string; initialUser: unknown }) => (
    <div data-testid="public-booking" data-service={service} data-user={initialUser ? "signed-in" : "anonymous"} />
  ),
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
  SessionUnavailableError: class SessionUnavailableError extends Error {},
}));

import { getCurrentUser } from "@/lib/session";

import { ReservarContent } from "./page";

const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("ReservarContent", () => {
  it("passes the requested service and the anonymous visitor through", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    render(await ReservarContent({ searchParams: Promise.resolve({ service: "rehab" }) }));

    const node = screen.getByTestId("public-booking");
    expect(node.getAttribute("data-service")).toBe("rehab");
    expect(node.getAttribute("data-user")).toBe("anonymous");
  });

  it("falls back to performance for a missing or invalid service", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    render(await ReservarContent({ searchParams: Promise.resolve({ service: "<script>" }) }));

    expect(screen.getByTestId("public-booking").getAttribute("data-service")).toBe("performance");
  });

  it("passes the signed-in visitor through when a session exists", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "1",
      name: "Ana",
      lastName: "Perez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      role: "client",
    });
    render(await ReservarContent({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("public-booking").getAttribute("data-user")).toBe("signed-in");
  });

  it("treats a down backend as an anonymous visitor instead of breaking the page", async () => {
    const { SessionUnavailableError } = await import("@/lib/session");
    getCurrentUserMock.mockRejectedValue(new SessionUnavailableError());
    render(await ReservarContent({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("public-booking").getAttribute("data-user")).toBe("anonymous");
  });
});
