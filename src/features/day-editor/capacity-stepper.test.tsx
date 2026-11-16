import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CapacityStepper } from "./capacity-stepper";

describe("CapacityStepper", () => {
  it("cannot go below the fullest slot's booked count and explains why", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CapacityStepper value={3} fullest={{ booked: 3, time: "10:00" }} onChange={onChange} />);

    const lower = screen.getByRole("button", { name: "Menos cupo" }) as HTMLButtonElement;
    expect(lower.disabled).toBe(true);
    expect(
      screen.getByText("No puede bajar de 3, porque el turno de las 10:00 ya tiene 3 reservas."),
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Más cupo" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("lets it go down while it is above the booked count", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CapacityStepper value={6} fullest={{ booked: 3, time: "10:00" }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Menos cupo" }));

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("says nothing when no slot has bookings, and still never goes below 1", () => {
    render(<CapacityStepper value={1} fullest={null} onChange={vi.fn()} />);

    expect(screen.queryByText(/No puede bajar/)).toBeNull();
    expect((screen.getByRole("button", { name: "Menos cupo" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("uses the singular for one booking", () => {
    render(<CapacityStepper value={1} fullest={{ booked: 1, time: "09:00" }} onChange={vi.fn()} />);

    expect(screen.getByText("No puede bajar de 1, porque el turno de las 09:00 ya tiene 1 reserva.")).toBeDefined();
  });
});
