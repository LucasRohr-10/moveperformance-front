import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { getMyUpcomingBookings } from "./get-my-upcoming-bookings";
import { booking } from "./test-rows";
import { UpcomingBookingsSection } from "./upcoming-bookings-section";

vi.mock("./get-my-upcoming-bookings");
vi.mock("./upcoming-bookings-card", () => ({
  UpcomingBookingsCard: ({ bookings }: { bookings: unknown[] }) => <div>card with {bookings.length}</div>,
}));

const getMock = vi.mocked(getMyUpcomingBookings);

describe("UpcomingBookingsSection", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("hands the bookings to the card", async () => {
    getMock.mockResolvedValue([booking(), booking({ id: "b2" })]);

    render(await UpcomingBookingsSection());

    expect(screen.getByText("card with 2")).toBeDefined();
  });

  it("shows an error card with a retry link when the API fails", async () => {
    getMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    render(await UpcomingBookingsSection());

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar tus reservas.");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/dashboard");
  });
});
