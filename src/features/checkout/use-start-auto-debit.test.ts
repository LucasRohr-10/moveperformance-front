import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { startAutoDebit } from "@/features/auto-debits";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/features/auto-debits", () => ({ startAutoDebit: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./redirect-to-payment", () => ({ redirectToPayment: vi.fn() }));

import { redirectToPayment } from "./redirect-to-payment";
import { useStartAutoDebit } from "./use-start-auto-debit";

const startAutoDebitMock = vi.mocked(startAutoDebit);
const redirectToPaymentMock = vi.mocked(redirectToPayment);

const created = { externalReference: "ref-1", redirectUrl: "https://mp.test/subscribe" };

describe("useStartAutoDebit", () => {
  beforeEach(() => {
    startAutoDebitMock.mockReset();
    redirectToPaymentMock.mockReset();
  });

  it("starts once on a double click and redirects to the payment link", async () => {
    startAutoDebitMock.mockResolvedValue(created);
    const { result } = renderHook(() => useStartAutoDebit("plan-1"));

    await act(async () => {
      result.current.start();
      result.current.start();
    });

    expect(startAutoDebitMock).toHaveBeenCalledTimes(1);
    expect(startAutoDebitMock).toHaveBeenCalledWith("plan-1");
    expect(redirectToPaymentMock).toHaveBeenCalledTimes(1);
    expect(redirectToPaymentMock).toHaveBeenCalledWith("https://mp.test/subscribe");
    expect(result.current.isStarting).toBe(true);
  });

  it("is blocked when the API says the debit is already active", async () => {
    startAutoDebitMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "AUTO_DEBIT_ACTIVE", message: "Ya tenés un débito." }),
    );
    const { result } = renderHook(() => useStartAutoDebit("plan-1"));

    await act(async () => {
      result.current.start();
    });

    expect(result.current.isBlocked).toBe(true);
    expect(result.current.isStarting).toBe(false);
    expect(redirectToPaymentMock).not.toHaveBeenCalled();
  });

  it("shows the API message for any other error and lets the client try again", async () => {
    startAutoDebitMock.mockRejectedValue(
      new ApiError({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR", message: "Mercado Pago no responde." }),
    );
    const { result } = renderHook(() => useStartAutoDebit("plan-1"));

    await act(async () => {
      result.current.start();
    });

    expect(result.current.error).toBe("Mercado Pago no responde.");
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.isStarting).toBe(false);
  });
});
