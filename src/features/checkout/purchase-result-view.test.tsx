import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PurchaseResultModel } from "./present-purchase-result";
import { PurchaseResultView } from "./purchase-result-view";

const APPROVED: PurchaseResultModel = {
  badge: { label: "Aprobado", tone: "success" },
  title: "¡Listo! Tu pago fue aprobado.",
  body: "Tu plan mensual ya está activo.",
  details: [],
  action: { label: "Ir a mi perfil", href: "/dashboard" },
  secondaryAction: null,
  canRecheck: false,
  isWaiting: false,
  selectionNote: null,
  transferDetails: null,
};

const IN_PROCESS: PurchaseResultModel = {
  badge: { label: "Pendiente", tone: "warning" },
  title: "Pago en proceso",
  body: "Tu pago todavía no se acreditó. Cuando se acredite, lo vas a ver en tu perfil.",
  details: [],
  action: null,
  secondaryAction: null,
  canRecheck: true,
  isWaiting: false,
  selectionNote: null,
  transferDetails: null,
};

describe("PurchaseResultView", () => {
  it("renders an approved result as a tick, title, body and action, without the card", () => {
    const { container } = render(<PurchaseResultView model={APPROVED} onRecheck={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Aprobado" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeDefined();
    expect(screen.getByText("Tu plan mensual ya está activo.")).toBeDefined();
    expect(container.querySelector("dl")).toBeNull();
    expect(container.querySelector("[data-purchase-approved]")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Ir a mi perfil" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.queryByRole("button", { name: "Volver a consultar" })).toBeNull();
  });

  it("keeps the details of an approved booking under the body", () => {
    const booking: PurchaseResultModel = {
      ...APPROVED,
      body: "Tu reserva está confirmada.",
      details: [
        { label: "Turno", value: "Evaluación y Diagnóstico" },
        { label: "Total", value: "$ 1.800" },
      ],
    };
    const { container } = render(<PurchaseResultView model={booking} onRecheck={vi.fn()} />);

    const terms = [...container.querySelectorAll("dt")].map((dt) => dt.textContent);
    const values = [...container.querySelectorAll("dd")].map((dd) => dd.textContent);
    expect(terms).toEqual(["Turno", "Total"]);
    expect(values).toEqual(["Evaluación y Diagnóstico", "$ 1.800"]);
  });

  it("offers 'Volver a consultar' only when the model allows it and calls onRecheck", async () => {
    const onRecheck = vi.fn();
    const { container } = render(<PurchaseResultView model={IN_PROCESS} onRecheck={onRecheck} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("dl")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Volver a consultar" }));
    expect(onRecheck).toHaveBeenCalledTimes(1);
  });

  it("marks the card busy while waiting", () => {
    const waiting: PurchaseResultModel = { ...IN_PROCESS, title: "Confirmando tu pago", canRecheck: false, isWaiting: true };
    const { container } = render(<PurchaseResultView model={waiting} onRecheck={vi.fn()} />);

    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the main actions at least 44 px high on mobile", () => {
    render(
      <PurchaseResultView model={{ ...IN_PROCESS, action: { label: "Intentar de nuevo", href: "/x" } }} onRecheck={vi.fn()} />,
    );

    expect(screen.getByRole("link", { name: "Intentar de nuevo" }).className).toContain("min-h-11");
    expect(screen.getByRole("button", { name: "Volver a consultar" }).className).toContain("min-h-11");
  });
});
