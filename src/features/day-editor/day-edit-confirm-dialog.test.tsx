import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DayImpactDto } from "@/lib/api/types";

import { DayEditConfirmDialog } from "./day-edit-confirm-dialog";

function impact(bookings: Partial<DayImpactDto["affectedBookings"]>, cancelledSlots = 4): DayImpactDto {
  const merged = { total: 0, package: 0, planOrFollowup: 0, payment: 0, ...bookings };
  return { cancelledSlots, createdSlots: 0, modifiedSlots: 0, affectedBookings: { ...merged, total: merged.package + merged.planOrFollowup + merged.payment } };
}

function dialog(overrides: Partial<Parameters<typeof DayEditConfirmDialog>[0]> = {}) {
  return (
    <DayEditConfirmDialog
      impact={impact({ package: 2, planOrFollowup: 1, payment: 2 })}
      subtitle="Mié. 12/11 · Recovery 09:00 · franja de la tarde (3)"
      reason="Mantenimiento de la sala de Recovery"
      isBusy={false}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...overrides}
    />
  );
}

function countOf(label: string): string | null {
  return screen.getByText(label).parentElement?.lastElementChild?.textContent ?? null;
}

describe("DayEditConfirmDialog", () => {
  it("shows grouped counts without client names", () => {
    render(dialog());

    expect(screen.getByRole("dialog", { name: "¿Cancelar 4 turnos con 5 reservas?" })).toBeDefined();
    expect(screen.getByText("Mié. 12/11 · Recovery 09:00 · franja de la tarde (3)")).toBeDefined();
    expect(countOf("Con paquete · la sesión vuelve al paquete")).toBe("2");
    expect(countOf("Con plan · no consume nada")).toBe("1");
    expect(countOf("Pagadas aparte · quedan para revisar")).toBe("2");
    expect(screen.getByText("Los nombres los ves después en la lista de cada turno y en Pagos → Para revisar.")).toBeDefined();
    expect(screen.getByText(/se pagaron aparte/)).toBeDefined();
    expect(
      screen.getByText('Cada cliente recibe un mail y un aviso en la app con el motivo: "Mantenimiento de la sala de Recovery".'),
    ).toBeDefined();
  });

  it("hides the paid-apart warning when there are no payment bookings", () => {
    render(dialog({ impact: impact({ package: 3 }) }));

    expect(screen.queryByText(/se pagaron aparte/)).toBeNull();
    expect(screen.queryByText("Pagadas aparte · quedan para revisar")).toBeNull();
    expect(screen.queryByText("Con plan · no consume nada")).toBeNull();
    expect(countOf("Con paquete · la sesión vuelve al paquete")).toBe("3");
  });

  it("uses the singular for one booking paid apart", () => {
    render(dialog({ impact: impact({ payment: 1 }, 1) }));

    expect(screen.getByRole("dialog", { name: "¿Cancelar 1 turno con 1 reserva?" })).toBeDefined();
    expect(screen.getByText("1 reserva se pagó aparte.")).toBeDefined();
  });

  it("confirm button reads \"Cancelar {m} reservas y guardar\" and confirms", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(dialog({ onConfirm }));

    await user.click(screen.getByRole("button", { name: "Cancelar 5 reservas y guardar" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("goes back without saving and locks both buttons while busy", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(dialog({ onCancel }));

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(dialog({ isBusy: true }));
    expect((screen.getByRole("button", { name: "Volver" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancelar 5 reservas y guardar" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
