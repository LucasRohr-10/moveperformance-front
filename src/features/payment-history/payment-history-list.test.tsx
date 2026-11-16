import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MyPaymentDto, MyPaymentPageDto } from "@/lib/api/types";

import { PaymentHistoryList } from "./payment-history-list";

vi.mock("./payment-card", () => ({
  PaymentCard: ({ model }: { model: { title: string } }) => <div data-testid="card">{model.title}</div>,
}));

const payment = (id: string, itemName = "Mensual"): MyPaymentDto => ({
  id,
  state: "approved",
  origin: "one_time",
  paymentMethod: "mercado_pago",
  paidOn: null,
  hasReceipt: false,
  kind: "plan",
  service: "performance",
  itemName,
  amount: 2400,
  currency: "UYU",
  createdAt: "2026-10-26T13:00:00.000Z",
  approvedAt: null,
  lastPaymentAt: null,
  refundedAt: null,
  paymentId: null,
  reasonCode: null,
  delivered: null,
});

const pageOf = (items: MyPaymentDto[], overrides: Partial<MyPaymentPageDto> = {}): MyPaymentPageDto => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  ...overrides,
});

const hrefOf = (name: string) => screen.getByRole("link", { name }).getAttribute("href");

describe("PaymentHistoryList", () => {
  it("shows one card per payment, in the order the API gave", () => {
    render(<PaymentHistoryList page={pageOf([payment("p1", "Mensual"), payment("p2", "Trimestral")])} origin={undefined} />);

    expect(screen.getAllByTestId("card").map((card) => card.textContent)).toEqual([
      "Performance · Mensual",
      "Performance · Trimestral",
    ]);
  });

  it("offers the three filters as links that keep nothing but their origin", () => {
    render(<PaymentHistoryList page={pageOf([payment("p1")])} origin={undefined} />);

    expect(hrefOf("Todos")).toBe("/history?tab=pagos");
    expect(hrefOf("Pagos únicos")).toBe("/history?tab=pagos&origin=one_time");
    expect(hrefOf("Débitos automáticos")).toBe("/history?tab=pagos&origin=auto_debit");
  });

  it("marks only the active filter as the current one", () => {
    render(<PaymentHistoryList page={pageOf([payment("p1")])} origin="auto_debit" />);

    const current = (name: string) => screen.getByRole("link", { name }).getAttribute("aria-current");
    expect(current("Débitos automáticos")).toBe("page");
    expect(current("Todos")).toBeNull();
    expect(current("Pagos únicos")).toBeNull();
  });

  it("pages with links that keep the origin, and drops the page number on the first page", () => {
    render(
      <PaymentHistoryList
        page={pageOf([payment("p1")], { total: 45, page: 2, pageSize: 20 })}
        origin="auto_debit"
      />,
    );

    expect(screen.getByText("Página 2 de 3")).toBeDefined();
    expect(hrefOf("Anterior")).toBe("/history?tab=pagos&origin=auto_debit");
    expect(hrefOf("Siguiente")).toBe("/history?tab=pagos&origin=auto_debit&page=3");
  });

  it("has no previous link on the first page and no next link on the last", () => {
    const { rerender } = render(
      <PaymentHistoryList page={pageOf([payment("p1")], { total: 45, page: 1 })} origin={undefined} />,
    );
    expect(screen.queryByRole("link", { name: "Anterior" })).toBeNull();
    expect(hrefOf("Siguiente")).toBe("/history?tab=pagos&page=2");

    rerender(<PaymentHistoryList page={pageOf([payment("p1")], { total: 45, page: 3 })} origin={undefined} />);
    expect(screen.queryByRole("link", { name: "Siguiente" })).toBeNull();
    expect(hrefOf("Anterior")).toBe("/history?tab=pagos&page=2");
  });

  it("shows no paging when everything fits in one page", () => {
    render(<PaymentHistoryList page={pageOf([payment("p1")])} origin={undefined} />);

    expect(screen.queryByText(/Página/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Siguiente" })).toBeNull();
  });

  it("says the client has no payments yet", () => {
    render(<PaymentHistoryList page={pageOf([])} origin={undefined} />);

    expect(screen.getByText("Todavía no tenés pagos.")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Volver al principio" })).toBeNull();
  });

  it("says a filter found nothing", () => {
    render(<PaymentHistoryList page={pageOf([])} origin="auto_debit" />);

    expect(screen.getByText("No hay pagos para este filtro.")).toBeDefined();
  });

  it("offers a way back from a page past the end", () => {
    render(<PaymentHistoryList page={pageOf([], { total: 5, page: 4 })} origin="one_time" />);

    expect(screen.getByText("No hay pagos en esta página.")).toBeDefined();
    expect(hrefOf("Volver al principio")).toBe("/history?tab=pagos&origin=one_time");
  });
});
