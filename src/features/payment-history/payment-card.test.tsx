import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MyPaymentDto } from "@/lib/api/types";

import { PaymentCard } from "./payment-card";
import { presentPayment } from "./present-payment";

vi.mock("./receipt-button", () => ({
  ReceiptButton: ({ purchaseId }: { purchaseId: string }) => <button type="button">Ver comprobante {purchaseId}</button>,
}));

const declined: MyPaymentDto = {
  id: "purchase-1",
  state: "declined",
  origin: "one_time",
  paymentMethod: "mercado_pago",
  paidOn: null,
  hasReceipt: false,
  kind: "plan",
  service: "recovery",
  itemName: "Paquete 4 sesiones",
  amount: 3600,
  currency: "UYU",
  createdAt: "2026-10-09T21:40:00.000Z",
  approvedAt: null,
  lastPaymentAt: "2026-10-09T21:42:00.000Z",
  refundedAt: null,
  paymentId: "1234498877",
  reasonCode: "cc_rejected_insufficient_amount",
  delivered: null,
};

const renderCard = (overrides: Partial<MyPaymentDto> = {}, defaultOpen?: boolean) =>
  render(<PaymentCard model={presentPayment({ ...declined, ...overrides })} defaultOpen={defaultOpen} />);

describe("PaymentCard", () => {
  it("shows the title with the status badge beside it, the subtitle and the amount", () => {
    renderCard();

    expect(screen.getByText("Recovery · Paquete 4 sesiones")).toBeDefined();
    expect(screen.getByText("Rechazado")).toBeDefined();
    expect(screen.getByText("Pago único · 09/10/2026")).toBeDefined();
    expect(screen.getByText("$ 3.600")).toBeDefined();
  });

  it("starts closed: the detail is hidden and the button says so", () => {
    renderCard();

    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("region", { hidden: true }).hidden).toBe(true);
  });

  it("opens on click and shows the note and the rows, then closes on a second click", () => {
    renderCard();
    const button = screen.getByRole("button");

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("region").hidden).toBe(false);
    expect(screen.getByText("No se pudo realizar el pago")).toBeDefined();
    expect(screen.getByText("Tu tarjeta no tiene saldo suficiente.")).toBeDefined();
    expect(screen.getByText("Intentado")).toBeDefined();
    expect(screen.getByText("09/10/2026 · 18:42")).toBeDefined();
    expect(screen.getByText("N.º de operación")).toBeDefined();

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("region", { hidden: true }).hidden).toBe(true);
  });

  it("can start open", () => {
    renderCard({}, true);

    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("region").hidden).toBe(false);
  });

  it("points the button at its detail", () => {
    renderCard();

    const region = screen.getByRole("region", { hidden: true });

    expect(screen.getByRole("button").getAttribute("aria-controls")).toBe(region.id);
    expect(region.id).not.toBe("");
  });

  it("strikes the amount through only when the purchase never paid", () => {
    renderCard();
    expect(screen.getByText("$ 3.600").className).toContain("line-through");
  });

  it("does not strike through the amount of an approved payment", () => {
    renderCard({ state: "approved", reasonCode: null });
    expect(screen.getByText("$ 3.600").className).not.toContain("line-through");
  });

  it("never shows the provider's code", () => {
    const { container } = renderCard({}, true);

    expect(container.textContent).not.toContain("cc_rejected");
  });

  it("shows Ver comprobante in the detail only with a receipt", () => {
    const paidOutside: Partial<MyPaymentDto> = {
      state: "approved",
      paymentMethod: "cash",
      paidOn: "2026-11-02",
      reasonCode: null,
    };
    const { unmount } = renderCard({ ...paidOutside, hasReceipt: true }, true);
    expect(screen.getByRole("button", { name: "Ver comprobante purchase-1" })).toBeDefined();
    unmount();

    renderCard({ ...paidOutside, hasReceipt: false }, true);
    expect(screen.queryByRole("button", { name: /Ver comprobante/ })).toBeNull();
  });
});
