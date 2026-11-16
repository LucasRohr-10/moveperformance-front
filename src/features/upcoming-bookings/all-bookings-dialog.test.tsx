import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AllBookingsDialog } from "./all-bookings-dialog";
import { toUpcomingRows, type UpcomingBookingRow } from "./present-upcoming-bookings";
import { TODAY, booking } from "./test-rows";

const ROWS = toUpcomingRows(
  [
    booking({ id: "oct-rec", startsAt: "2026-10-24T13:30:00Z", service: "recovery" }),
    booking({
      id: "oct-perf",
      startsAt: "2026-10-26T10:00:00Z",
      service: "performance",
      label: "Entrenamiento semi personalizado",
      durationMinutes: 60,
    }),
    booking({ id: "nov-rec", startsAt: "2026-11-04T22:00:00Z", service: "recovery" }),
  ],
  TODAY,
);

function renderDialog(overrides: Partial<Parameters<typeof AllBookingsDialog>[0]> = {}) {
  const props = {
    rows: ROWS,
    currentMonthKey: "2026-10",
    cancel: vi.fn().mockResolvedValue(true),
    busyId: null,
    onClose: vi.fn(),
    ...overrides,
  };
  const view = render(<AllBookingsDialog {...props} />);
  return { ...view, props };
}

const titles = () => screen.queryAllByText(/^(Sesión Recovery|Entrenamiento)/).map((node) => node.textContent);

describe("AllBookingsDialog", () => {
  it("opens in the month of the first booking and lists it in order", () => {
    renderDialog();

    expect(screen.getByText("Octubre 2026")).toBeDefined();
    expect(screen.getByText("2 reservas en octubre")).toBeDefined();
    expect(titles()).toEqual(["Sesión Recovery · 45 min", "Entrenamiento semi personalizado"]);
    expect(screen.queryByText("OCT")).toBeNull();
  });

  it("opens in a later month when that is where the first booking is", () => {
    renderDialog({ rows: ROWS.filter((row) => row.monthKey === "2026-11") });

    expect(screen.getByText("Noviembre 2026")).toBeDefined();
    expect(screen.getByRole("button", { name: "Mes anterior" }).hasAttribute("disabled")).toBe(true);
  });

  it("moves between months with the arrows and stops at the ends", () => {
    renderDialog();

    const previous = screen.getByRole("button", { name: "Mes anterior" });
    const next = screen.getByRole("button", { name: "Mes siguiente" });
    expect(previous.hasAttribute("disabled")).toBe(true);

    fireEvent.click(next);
    expect(screen.getByText("Noviembre 2026")).toBeDefined();
    expect(screen.getByText("1 reserva en noviembre")).toBeDefined();
    expect(next.hasAttribute("disabled")).toBe(true);

    fireEvent.click(previous);
    expect(screen.getByText("Octubre 2026")).toBeDefined();
  });

  it("filters by service and keeps the filter when the month changes", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Recovery" }));
    expect(titles()).toEqual(["Sesión Recovery · 45 min"]);

    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(titles()).toEqual(["Sesión Recovery · 45 min"]);
    expect(screen.getByRole("button", { name: "Recovery" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("asks in the same row before cancelling and lets the client back out", () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva del Sáb 24 Oct · 10:30" }));
    expect(screen.getByText("¿Querés cancelar?")).toBeDefined();
    expect(screen.getByText("Sáb 24 Oct · 10:30")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(props.cancel).not.toHaveBeenCalled();
  });

  it("cancels the booking after the confirmation", () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva del Sáb 24 Oct · 10:30" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    expect(props.cancel).toHaveBeenCalledWith(ROWS[0]);
  });

  it("stays on the month when its last booking is cancelled", () => {
    const { rerender, props } = renderDialog({ rows: [ROWS[0], ROWS[2]] });

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva del Sáb 24 Oct · 10:30" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar" }));
    rerender(<AllBookingsDialog {...props} rows={[ROWS[2]]} />);

    expect(screen.getByText("Octubre 2026")).toBeDefined();
    expect(screen.getByText("No tenés reservas este mes.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Mes siguiente" }).hasAttribute("disabled")).toBe(false);
  });

  it("shows an empty month with both arrows off when there are no bookings", () => {
    renderDialog({ rows: [] as UpcomingBookingRow[] });

    expect(screen.getByText("Octubre 2026")).toBeDefined();
    expect(screen.getByText("No tenés reservas este mes.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Mes anterior" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Mes siguiente" }).hasAttribute("disabled")).toBe(true);
  });

  it("closes the confirmation first with Escape, then the dialog", () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva del Sáb 24 Oct · 10:30" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("is a labelled modal that closes from its button and from the backdrop", () => {
    const { props } = renderDialog();

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(within(dialog).getByText("Tus reservas")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.pointerDown(dialog.parentElement!);
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
