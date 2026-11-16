import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BookableSlot, RehabKind, ServiceType } from "@/lib/api/types";

import { OfflineChargeDialog } from "./offline-charge-dialog";
import type { OfflinePrices } from "./offline-price";

const PRICES: OfflinePrices = {
  rehabEvaluation: 1800,
  rehabFollowup: 1200,
  recoverySession: 900,
  performanceClass: 700,
};
const NO_PRICES: OfflinePrices = {
  rehabEvaluation: null,
  rehabFollowup: null,
  recoverySession: null,
  performanceClass: null,
};

// 11:00Z is 08:00 in Montevideo.
function slotOf(id: string, service: ServiceType, startsAt = "2026-11-03T11:00:00.000Z"): BookableSlot {
  return {
    id,
    service,
    startsAt,
    endsAt: "2026-11-03T12:00:00.000Z",
    durationMinutes: 60,
    capacity: 10,
    available: 5,
    isFull: false,
    alreadyBooked: false,
  };
}

const REHAB = slotOf("rehab-1", "rehab");

interface Overrides {
  slots?: BookableSlot[];
  kindOf?: (slotId: string) => RehabKind;
  prices?: OfflinePrices;
  previewFailed?: boolean;
  isBusy?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function renderDialog(overrides: Overrides = {}) {
  const onConfirm = overrides.onConfirm ?? vi.fn();
  render(
    <OfflineChargeDialog
      slots={overrides.slots ?? [REHAB]}
      kindOf={overrides.kindOf ?? (() => "evaluation")}
      prices={overrides.prices ?? PRICES}
      previewFailed={overrides.previewFailed ?? false}
      isBusy={overrides.isBusy ?? false}
      onConfirm={onConfirm}
      onCancel={overrides.onCancel ?? vi.fn()}
    />,
  );
  return onConfirm;
}

describe("OfflineChargeDialog", () => {
  it("titles with the count", () => {
    const { unmount } = render(
      <OfflineChargeDialog
        slots={[REHAB]}
        kindOf={() => "evaluation"}
        prices={PRICES}
        previewFailed={false}
        isBusy={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "1 reserva se cobra por fuera" })).toBeDefined();
    unmount();

    renderDialog({ slots: [REHAB, slotOf("rec-1", "recovery")] });

    expect(screen.getByRole("dialog", { name: "2 reservas se cobran por fuera" })).toBeDefined();
  });

  it("says the client still gets the booking email", () => {
    renderDialog();

    expect(screen.getByText("Al cliente le llega el mail de reserva confirmada igual.")).toBeDefined();
  });

  it("asks only for the slots charged offline", () => {
    renderDialog({ slots: [slotOf("rec-2", "recovery", "2026-11-06T13:00:00.000Z")] });

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Recovery · vie 06/11 10:00");
    expect(screen.queryByText(/Performance/)).toBeNull();
  });

  it("shows each slot like the mockup", () => {
    renderDialog();

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Rehab · mar 03/11 08:00 · Evaluación")).toBeDefined();
    expect(within(row).getByText("Monto")).toBeDefined();
    expect(within(row).getByText("$ 1.800")).toBeDefined();
    expect(within(row).getByText("Precio de Configuración.")).toBeDefined();
  });

  it("shows the real amount when the price has cents", () => {
    renderDialog({ prices: { ...PRICES, rehabEvaluation: 1800.5 } });

    expect(within(screen.getByRole("listitem")).getByText("$ 1.800,50")).toBeDefined();
  });

  it("shows each slot's fixed staff price as text", () => {
    renderDialog({
      slots: [
        slotOf("r-eval", "rehab"),
        slotOf("r-follow", "rehab"),
        slotOf("rec", "recovery"),
        slotOf("perf", "performance"),
      ],
      kindOf: (id) => (id === "r-follow" ? "followup" : "evaluation"),
    });

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent ?? "");
    expect(rows[0]).toContain("$ 1.800");
    expect(rows[1]).toContain("$ 1.200");
    expect(rows[2]).toContain("$ 900");
    expect(rows[3]).toContain("$ 700");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("says there is no price when it is null", () => {
    renderDialog({ prices: NO_PRICES });

    expect(
      screen.getByText("Sin precio en Configuración. El monto se carga al registrar el pago."),
    ).toBeDefined();
    expect(screen.queryByText("Precio de Configuración.")).toBeNull();
  });

  it("starts on A definir", () => {
    renderDialog();

    const group = screen.getByRole("radiogroup", { name: "¿Cómo va a pagar?" });
    expect(within(group).getByRole("radio", { name: "A definir" }).getAttribute("aria-checked")).toBe("true");
    expect(within(group).getByRole("radio", { name: "Efectivo" }).getAttribute("aria-checked")).toBe("false");
    expect(within(group).getByRole("radio", { name: "Transferencia" }).getAttribute("aria-checked")).toBe("false");
  });

  it("shows the preview warning when it failed", () => {
    renderDialog({ previewFailed: true });

    expect(
      screen.getByText("No pudimos ver qué cubre su plan. Si algún turno lo cubre, no se cobra."),
    ).toBeDefined();
  });

  it("does not show the preview warning when it worked", () => {
    renderDialog();

    expect(screen.queryByText(/No pudimos ver qué cubre su plan/)).toBeNull();
  });

  it("confirms with the method only", async () => {
    const user = userEvent.setup();
    const onConfirm = renderDialog();

    await user.click(screen.getByRole("radio", { name: "Efectivo" }));
    await user.click(screen.getByRole("button", { name: "Reservar" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({ paymentMethod: "cash" });
  });

  it("confirms A definir when nothing was chosen", async () => {
    const user = userEvent.setup();
    const onConfirm = renderDialog();

    await user.click(screen.getByRole("button", { name: "Reservar" }));

    expect(onConfirm).toHaveBeenCalledWith({ paymentMethod: "undecided" });
  });

  it("goes back with Volver", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons and says Reservando… while busy", () => {
    renderDialog({ isBusy: true });

    expect(screen.getByRole("button", { name: "Reservando…" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Volver" }).hasAttribute("disabled")).toBe(true);
  });
});
