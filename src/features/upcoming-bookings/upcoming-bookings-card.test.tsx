import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { cancelBooking } from "./cancel-booking";
import { booking, TODAY } from "./test-rows";
import { UpcomingBookingsCard } from "./upcoming-bookings-card";

const refresh = vi.fn();
const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("./cancel-booking");

const cancelBookingMock = vi.mocked(cancelBooking);

const FIVE = [
  booking({ id: "today", startsAt: "2026-10-23T21:00:00Z", service: "performance", label: "Entrenamiento semi personalizado", durationMinutes: 60, canCancel: false }),
  booking({ id: "recovery", startsAt: "2026-10-24T13:30:00Z" }),
  booking({ id: "pending", startsAt: "2026-10-26T10:00:00Z", status: "pending_payment", canCancel: false, service: "rehab", label: "Evaluación y Diagnóstico · 60 min" }),
  booking({ id: "fourth", startsAt: "2026-10-27T10:00:00Z", service: "performance", label: "Entrenamiento semi personalizado" }),
  booking({ id: "fifth", startsAt: "2026-11-09T10:00:00Z", service: "performance", label: "Entrenamiento semi personalizado" }),
];

function renderCard(bookings = FIVE) {
  return renderWithSnackbar(<UpcomingBookingsCard bookings={bookings} today={TODAY} />);
}

describe("UpcomingBookingsCard", () => {
  beforeEach(() => {
    search = "";
    refresh.mockReset();
    replace.mockReset();
    cancelBookingMock.mockReset();
  });

  it("lists the first four bookings and offers to see all when there are more", () => {
    renderCard();

    expect(screen.getByText("Próximas reservas")).toBeDefined();
    expect(screen.getByText("Mostrando 4 de 5")).toBeDefined();
    expect(screen.getAllByText(/^(Entrenamiento|Sesión|Evaluación)/)).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Ver todas (5) →" })).toBeDefined();
  });

  it("hides 'Ver todas' when everything already fits in the card", () => {
    renderCard(FIVE.slice(0, 4));

    expect(screen.getByText("4 reservas")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Ver todas/ })).toBeNull();
  });

  it("invites to book when there are no upcoming bookings", () => {
    renderCard([]);

    expect(screen.getByText("No tenés reservas próximas.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reservar →" }).getAttribute("href")).toBe("/bookings");
  });

  it("marks today's booking and the one waiting for payment, which cannot be cancelled", () => {
    renderCard();

    expect(screen.getByText("HOY")).toBeDefined();
    expect(screen.getByText("Pago pendiente")).toBeDefined();
    expect(screen.getAllByRole("button", { name: /^Cancelar reserva/ })).toHaveLength(2);
  });

  it("confirms with a ticket, without the booking label, and can be dismissed", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva del Sáb 24 Oct · 10:30" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("¿Querés cancelar?");
    expect(dialog.textContent).toContain("10:30");
    expect(dialog.textContent).not.toContain("Sesión Recovery");

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cancelBookingMock).not.toHaveBeenCalled();
  });

  it("cancels after confirming, removes the row and shows the success snackbar", async () => {
    cancelBookingMock.mockResolvedValue({ ...booking({ id: "recovery" }), status: "cancelled", canCancel: false, cancelledAt: "2026-10-23T20:00:00Z", contactForRefund: false });
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva del Sáb 24 Oct · 10:30" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    await waitFor(() => expect(screen.getAllByText(/Reserva cancelada/).length).toBeGreaterThan(0));
    expect(cancelBookingMock).toHaveBeenCalledWith("recovery");
    expect(screen.queryByText("Sesión Recovery · 45 min")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the full list from the button", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Ver todas (5) →" }));

    expect(screen.getByRole("dialog").textContent).toContain("Tus reservas");
  });

  it("opens the full list from the address even when there are few bookings, and clears the address on close", () => {
    search = "bookings=open";
    renderCard(FIVE.slice(0, 2));

    expect(screen.getByRole("dialog").textContent).toContain("Tus reservas");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(replace).toHaveBeenCalledWith("/dashboard", { scroll: false });
  });

  it("does not touch the address when the list was opened by hand", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Ver todas (5) →" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(replace).not.toHaveBeenCalled();
  });
});
