import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PaymentNoteModel } from "./payment-card-model";
import { PaymentNote } from "./payment-note";

const note = (overrides: Partial<PaymentNoteModel> = {}): PaymentNoteModel => ({
  tone: "danger",
  icon: "cross",
  title: "No se pudo realizar el pago",
  body: "Tu tarjeta no tiene saldo suficiente.",
  ...overrides,
});

describe("PaymentNote", () => {
  it("shows the title and the body", () => {
    render(<PaymentNote note={note()} />);

    expect(screen.getByText("No se pudo realizar el pago")).toBeDefined();
    expect(screen.getByText("Tu tarjeta no tiene saldo suficiente.")).toBeDefined();
  });

  it("leaves no empty paragraph when there is no body", () => {
    const { container } = render(<PaymentNote note={note({ body: null })} />);

    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("spins the icon of a note that is waiting for something", () => {
    const { container } = render(<PaymentNote note={note({ tone: "warning", icon: "spinner" })} />);

    expect(container.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");
  });

  it.each(["check", "cross", "clock", "spinner", "calendar-x", "undo"] as const)(
    "hides the %s icon from assistive technology",
    (icon) => {
      const { container } = render(<PaymentNote note={note({ icon })} />);

      expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    },
  );
});
