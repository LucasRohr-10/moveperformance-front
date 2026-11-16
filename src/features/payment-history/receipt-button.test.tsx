import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMyReceiptLink } from "./get-my-receipt-link";
import { ReceiptButton } from "./receipt-button";

const showSnackbar = vi.hoisted(() => vi.fn());
const openReceiptMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/snackbar", () => ({ useSnackbar: () => ({ showSnackbar }) }));
vi.mock("@/features/payments/staff/open-receipt", () => ({ openReceipt: openReceiptMock }));
vi.mock("./get-my-receipt-link", () => ({ getMyReceiptLink: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("ReceiptButton", () => {
  it("opens the client's receipt", async () => {
    openReceiptMock.mockImplementation(async (getLink: () => Promise<unknown>) => {
      await getLink();
      return true;
    });
    render(<ReceiptButton purchaseId="purchase-1" />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Ver comprobante" }));

    expect(getMyReceiptLink).toHaveBeenCalledWith("purchase-1");
    expect(showSnackbar).not.toHaveBeenCalled();
  });

  it("shows the error snackbar when it fails", async () => {
    openReceiptMock.mockResolvedValue(false);
    render(<ReceiptButton purchaseId="purchase-1" />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Ver comprobante" }));

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({
        tone: "danger",
        title: "No pudimos abrir el comprobante. Probá de nuevo.",
      }),
    );
  });
});
