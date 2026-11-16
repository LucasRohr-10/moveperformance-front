import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { MyPaymentPageDto } from "@/lib/api/types";

import { getMyPayments } from "./get-my-payments";
import { PaymentHistorySection, PaymentHistorySkeleton } from "./payment-history-section";

vi.mock("./get-my-payments");
vi.mock("./payment-history-list", () => ({
  PaymentHistoryList: ({ page, origin }: { page: MyPaymentPageDto; origin?: string }) => (
    <div>
      list with {page.items.length} for {origin ?? "all"}
    </div>
  ),
}));

const getMock = vi.mocked(getMyPayments);

const page: MyPaymentPageDto = { items: [], total: 0, page: 2, pageSize: 20 };

describe("PaymentHistorySection", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("asks for the origin and the page it was given and hands the result to the list", async () => {
    getMock.mockResolvedValue(page);

    render(await PaymentHistorySection({ origin: "auto_debit", page: 2 }));

    expect(getMock).toHaveBeenCalledWith("auto_debit", 2);
    expect(screen.getByText("list with 0 for auto_debit")).toBeDefined();
  });

  it("shows an alert with a retry link when the API fails", async () => {
    getMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    render(await PaymentHistorySection({ origin: undefined, page: 1 }));

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar tus pagos.");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/history?tab=pagos");
  });
});

describe("PaymentHistorySkeleton", () => {
  it("says it is loading and marks itself busy", () => {
    render(<PaymentHistorySkeleton />);

    expect(screen.getByText("Cargando tus pagos…")).toBeDefined();
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
  });
});
