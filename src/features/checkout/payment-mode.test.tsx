import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { PaymentModeField } from "./payment-mode";
import type { PaymentModeOption } from "./present-checkout";

const NO_OFFLINE = { priceLine: null, howTo: null, transferDetails: null, disabledReason: null };

const options: PaymentModeOption[] = [
  { value: "one_time", label: "Pago único", description: null, ...NO_OFFLINE },
  {
    value: "auto_debit",
    label: "Débito automático",
    description: "Se cobra automáticamente cada mes con Mercado Pago.",
    ...NO_OFFLINE,
  },
];

describe("PaymentModeField", () => {
  it("groups the two options under the question and checks the selected one", () => {
    render(<PaymentModeField options={options} value="one_time" onChange={vi.fn()} />);

    const group = screen.getByRole("group", { name: "¿Cómo querés pagar?" });
    expect(group).toBeDefined();
    expect(screen.getByRole("radio", { name: "Pago único" })).toHaveProperty("checked", true);
    expect(screen.getByRole("radio", { name: "Débito automático" })).toHaveProperty("checked", false);
  });

  it("describes the debit option and tells the choice", async () => {
    const onChange = vi.fn();
    render(<PaymentModeField options={options} value="one_time" onChange={onChange} />);

    const debit = screen.getByRole("radio", { name: "Débito automático" });
    expect(debit.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Se cobra automáticamente cada mes con Mercado Pago.")).toBeDefined();

    await userEvent.click(debit);

    expect(onChange).toHaveBeenCalledWith("auto_debit");
  });
});

const withPrice = (priceLine: PaymentModeOption["priceLine"]) => ({
  priceLine,
  howTo: "Pagás en MOVE",
  transferDetails: null,
  disabledReason: null,
});

const offlineOptions: PaymentModeOption[] = [
  { value: "one_time", label: "Pago único", description: "Con Mercado Pago · $ 3.000", ...NO_OFFLINE },
  {
    value: "cash",
    label: "Efectivo",
    description: null,
    ...withPrice({ full: "$ 3.000", discounted: "$ 2.700", percent: 10 }),
  },
  {
    value: "transfer",
    label: "Transferencia",
    description: null,
    priceLine: { full: "$ 3.000", discounted: "$ 2.700", percent: 10 },
    howTo: "Transferís y mandás el comprobante a:",
    transferDetails: "BROU · Caja de ahorro 000000000-00001",
    disabledReason: null,
  },
];

// What a screen reader announces after the name: the text of every element aria-describedby points at.
const descriptionOf = (element: HTMLElement): string =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");

describe("PaymentModeField with cash and transfer", () => {
  it("shows the full price crossed out, the discounted one and the percent, then how to pay", () => {
    renderWithSnackbar(<PaymentModeField options={offlineOptions} value="cash" onChange={vi.fn()} />);

    const full = screen.getAllByText("$ 3.000").find((node) => node.className.includes("line-through"));
    expect(full?.className).toContain("text-muted");
    const discounted = screen.getAllByText("$ 2.700")[0];
    expect(discounted.className).toContain("text-success");
    expect(discounted.className).toContain("font-semibold");
    expect(screen.getAllByText("(10% off)").length).toBe(2);
    expect(screen.getByText("Pagás en MOVE")).toBeDefined();
  });

  it("shows only the price when there is no discount", () => {
    const options = [
      { ...offlineOptions[1], priceLine: { full: "$ 3.000", discounted: null, percent: null } },
    ];
    render(<PaymentModeField options={options} value="cash" onChange={vi.fn()} />);

    expect(screen.getByText("$ 3.000").className).not.toContain("line-through");
    expect(screen.queryByText(/% off/)).toBeNull();
  });

  it("shows the transfer details under the option", () => {
    renderWithSnackbar(<PaymentModeField options={offlineOptions} value="transfer" onChange={vi.fn()} />);

    expect(screen.getByText("BROU · Caja de ahorro 000000000-00001")).toBeDefined();
    expect(screen.getByRole("button", { name: "Copiar datos" })).toBeDefined();
  });

  it("reads the price and how to pay when the option is focused, and the transfer details too", () => {
    renderWithSnackbar(<PaymentModeField options={offlineOptions} value="cash" onChange={vi.fn()} />);

    const cash = descriptionOf(screen.getByRole("radio", { name: "Efectivo" }));
    expect(cash).toContain("$ 3.000$ 2.700 (10% off)");
    expect(cash).toContain("Pagás en MOVE");
    const transfer = descriptionOf(screen.getByRole("radio", { name: "Transferencia" }));
    expect(transfer).toContain("(10% off)");
    expect(transfer).toContain("Transferís y mandás el comprobante a:");
    expect(transfer).toContain("BROU · Caja de ahorro 000000000-00001");
    expect(descriptionOf(screen.getByRole("radio", { name: "Pago único" }))).toBe("Con Mercado Pago · $ 3.000");
  });

  it("reads the reason after the points when the option is disabled", () => {
    const reason = "Tenés 2 cosas sin pagar en MOVE, que es el máximo.";
    const options = offlineOptions.map((option) =>
      option.value === "one_time" ? option : { ...option, transferDetails: null, disabledReason: reason },
    );
    render(<PaymentModeField options={options} value="one_time" onChange={vi.fn()} />);

    const description = descriptionOf(screen.getByRole("radio", { name: "Efectivo" }));
    expect(description).toContain("Pagás en MOVE");
    expect(description.indexOf(reason)).toBeGreaterThan(description.indexOf("Pagás en MOVE"));
  });

  it("makes the whole card of an enabled option a label around its radio, so touching it anywhere chooses it", async () => {
    const onChange = vi.fn();
    renderWithSnackbar(<PaymentModeField options={offlineOptions} value="one_time" onChange={onChange} />);

    const cash = screen.getByRole("radio", { name: "Efectivo" });
    const card = cash.closest("label");
    expect(card).not.toBeNull();
    // The card holds the radio and the text of the option, not only its title.
    expect(card?.textContent).toContain("Pagás en MOVE");

    await userEvent.click(card as HTMLElement);

    expect(onChange).toHaveBeenCalledWith("cash");
  });

  it("keeps the radio of a disabled option focusable but outside any label, so touching it does nothing", async () => {
    const reason = "Tenés 2 cosas sin pagar en MOVE, que es el máximo.";
    const options = offlineOptions.map((option) =>
      option.value === "one_time" ? option : { ...option, transferDetails: null, disabledReason: reason },
    );
    const onChange = vi.fn();
    render(<PaymentModeField options={options} value="one_time" onChange={onChange} />);

    const cash = screen.getByRole("radio", { name: "Efectivo" });
    expect(cash.closest("label")).toBeNull();
    cash.focus();
    expect(document.activeElement).toBe(cash);
    await userEvent.click(screen.getByText("Pagás en MOVE"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the transfer details out of the label: copying them is not choosing the option", async () => {
    renderWithSnackbar(<PaymentModeField options={offlineOptions} value="one_time" onChange={vi.fn()} />);

    const transfer = screen.getByRole("radio", { name: "Transferencia" });
    expect(transfer.closest("label")?.contains(screen.getByRole("button", { name: "Copiar datos" }))).toBe(false);
  });

  it("does not select an option that is disabled, and says why once", async () => {
    const reason = "Tenés 2 cosas sin pagar en MOVE, que es el máximo.";
    const options = offlineOptions.map((option) =>
      option.value === "one_time" ? option : { ...option, transferDetails: null, disabledReason: reason },
    );
    const onChange = vi.fn();
    render(<PaymentModeField options={options} value="one_time" onChange={onChange} />);

    const cash = screen.getByRole("radio", { name: "Efectivo" });
    await userEvent.click(cash);

    expect(cash.getAttribute("aria-disabled")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Pago único" })).toHaveProperty("checked", true);
    expect(screen.getAllByText(reason)).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Pago único" }).getAttribute("aria-disabled")).toBeNull();
  });
});
