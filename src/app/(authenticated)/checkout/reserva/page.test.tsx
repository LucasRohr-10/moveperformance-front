import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { USER_ROLES } from "@/config/constants/user-roles.constants";

vi.mock("@/lib/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/features/checkout/booking-checkout", () => ({
  BookingCheckout: (props: { service?: string; date?: string; slotId?: string }) => (
    <p>
      booking checkout {props.service} {props.date} {props.slotId}
    </p>
  ),
  pickerServiceFor: (service: string | undefined) => service ?? "rehab",
}));
vi.mock("@/features/checkout/checkout-message-card", () => ({ CheckoutSkeleton: () => <p>skeleton</p> }));

import { requireRole } from "@/lib/session";

import BookingCheckoutPage, { BookingCheckoutContent } from "./page";

describe("BookingCheckoutContent", () => {
  it("is reserved for clients and renders the checkout of the slot in the URL", async () => {
    renderWithSnackbar(
      await BookingCheckoutContent({ service: "rehab", date: "2026-10-21", slotId: "slot-1" }),
    );

    expect(vi.mocked(requireRole)).toHaveBeenCalledWith(USER_ROLES.CLIENT);
    expect(screen.getByText("booking checkout rehab 2026-10-21 slot-1")).toBeDefined();
  });
});

describe("BookingCheckoutPage", () => {
  it("links back to the picker of the service in the URL", async () => {
    renderWithSnackbar(
      await BookingCheckoutPage({
        searchParams: Promise.resolve({ service: "recovery", date: "2026-10-21", slot: "slot-1" }),
      }),
    );

    expect(screen.getByRole("link", { name: /Volver a turnos/ }).getAttribute("href")).toBe(
      "/bookings?service=recovery",
    );
  });

  it("uses the first value of a repeated query parameter for the back link", async () => {
    renderWithSnackbar(
      await BookingCheckoutPage({
        searchParams: Promise.resolve({
          service: ["rehab", "recovery"],
          date: ["2026-10-21", "2026-10-22"],
          slot: ["slot-1", "slot-2"],
        }),
      }),
    );

    expect(screen.getByRole("link", { name: /Volver a turnos/ }).getAttribute("href")).toBe(
      "/bookings?service=rehab",
    );
  });

  it("falls back to the Rehab picker when the service is missing", async () => {
    renderWithSnackbar(await BookingCheckoutPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: /Volver a turnos/ }).getAttribute("href")).toBe(
      "/bookings?service=rehab",
    );
  });
});
