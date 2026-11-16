import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { rowOf } from "./test-rows";
import { UpcomingBookingRowView } from "./upcoming-booking-row";

describe("UpcomingBookingRowView", () => {
  it("shows the date block, the service, the label, the time and the duration", () => {
    render(<UpcomingBookingRowView row={rowOf()} showMonth />);

    expect(screen.getByText("SÁB")).toBeDefined();
    expect(screen.getByText("24")).toBeDefined();
    expect(screen.getByText("OCT")).toBeDefined();
    expect(screen.getByText("Recovery")).toBeDefined();
    expect(screen.getByText("Sesión Recovery · 45 min")).toBeDefined();
    expect(screen.getByText("10:30")).toBeDefined();
    expect(screen.getByText("45 min")).toBeDefined();
  });

  it("leaves the month out of the date block when asked", () => {
    render(<UpcomingBookingRowView row={rowOf()} showMonth={false} />);

    expect(screen.queryByText("OCT")).toBeNull();
  });

  it("says HOY instead of the weekday for today's booking", () => {
    render(<UpcomingBookingRowView row={rowOf({ startsAt: "2026-10-23T21:00:00Z" })} showMonth />);

    expect(screen.getByText("HOY")).toBeDefined();
  });

  it("flags a booking that still waits for payment", () => {
    render(<UpcomingBookingRowView row={rowOf({ status: "pending_payment", canCancel: false })} showMonth />);

    expect(screen.getByText("Pago pendiente")).toBeDefined();
  });

  it("offers the trash button only when the booking can be cancelled", () => {
    const onCancel = vi.fn();
    const row = rowOf();
    const { rerender } = render(<UpcomingBookingRowView row={row} showMonth onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva del Sáb 24 Oct · 10:30" }));
    expect(onCancel).toHaveBeenCalledWith(row);

    rerender(<UpcomingBookingRowView row={rowOf({ canCancel: false })} showMonth onCancel={onCancel} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the overlay inside the row", () => {
    render(<UpcomingBookingRowView row={rowOf()} showMonth overlay={<p>¿Querés cancelar?</p>} />);

    expect(screen.getByText("¿Querés cancelar?")).toBeDefined();
  });
});
