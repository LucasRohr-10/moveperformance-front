import { act, renderHook } from "@testing-library/react";
import { Activity, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { CheckoutResponseDto } from "@/lib/api/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const router = { push: pushMock, refresh: refreshMock };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./redirect-to-payment", () => ({ redirectToPayment: vi.fn() }));

import { redirectToPayment } from "./redirect-to-payment";
import { useStartCheckout } from "./use-start-checkout";

const redirectToPaymentMock = vi.mocked(redirectToPayment);

const FALLBACK_MESSAGE = "No pudimos iniciar el pago. Probá de nuevo en unos minutos.";

const checkoutResponse: CheckoutResponseDto = {
  purchaseId: "purchase-1",
  externalReference: "ref-1",
  redirectUrl: "https://pay.test/x",
  bookingId: null,
  holdExpiresAt: null,
};

describe("useStartCheckout", () => {
  beforeEach(() => {
    redirectToPaymentMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it("sends one request when pay is called twice in the same tick", async () => {
    const start = vi.fn().mockResolvedValue(checkoutResponse);
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
      result.current.pay();
    });

    expect(start).toHaveBeenCalledTimes(1);
  });

  it("redirects to the payment page and stays redirecting after a success", async () => {
    const start = vi.fn().mockResolvedValue(checkoutResponse);
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(redirectToPaymentMock).toHaveBeenCalledWith("https://pay.test/x");
    expect(result.current.isRedirecting).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("goes to the result page, and never to a provider, when there is no redirect URL (cash or transfer)", async () => {
    const start = vi.fn().mockResolvedValue({ ...checkoutResponse, redirectUrl: null, externalReference: "ref 2" });
    const { result } = renderHook(() => useStartCheckout(start, { byHand: true }));

    await act(async () => {
      result.current.pay();
    });

    expect(pushMock).toHaveBeenCalledWith("/checkout/resultado?ref=ref+2");
    expect(redirectToPaymentMock).not.toHaveBeenCalled();
    expect(result.current.isRedirecting).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("does not take a missing redirect URL as a purchase by hand when the client paid with Mercado Pago", async () => {
    const start = vi.fn().mockResolvedValue({ ...checkoutResponse, redirectUrl: null });
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(result.current.error).toEqual({ code: null, message: FALLBACK_MESSAGE });
    expect(result.current.isRedirecting).toBe(false);
  });

  it("never navigates for a redirect URL that is missing or empty", async () => {
    const start = vi.fn().mockResolvedValue({ ...checkoutResponse, redirectUrl: undefined });
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(result.current.error).toEqual({ code: null, message: FALLBACK_MESSAGE });
  });

  it("shows the API error and enables the button again", async () => {
    const start = vi.fn().mockRejectedValue(
      new ApiError({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR", message: FALLBACK_MESSAGE }),
    );
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(result.current.error).toEqual({ code: "PAYMENT_PROVIDER_ERROR", message: FALLBACK_MESSAGE });
    expect(result.current.isRedirecting).toBe(false);
    expect(redirectToPaymentMock).not.toHaveBeenCalled();
  });

  it("lets the client try again after an error", async () => {
    const start = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR", message: "x" }))
      .mockResolvedValueOnce(checkoutResponse);
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });
    await act(async () => {
      result.current.pay();
    });

    expect(start).toHaveBeenCalledTimes(2);
    expect(redirectToPaymentMock).toHaveBeenCalledWith("https://pay.test/x");
    expect(result.current.error).toBeNull();
  });

  it("falls back to a generic message when the failure is not an API error", async () => {
    const start = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(result.current.error).toEqual({ code: null, message: FALLBACK_MESSAGE });
    expect(result.current.isRedirecting).toBe(false);
  });

  it("ignores pay once a payment has started successfully", async () => {
    const start = vi.fn().mockResolvedValue(checkoutResponse);
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });
    await act(async () => {
      result.current.pay();
    });

    expect(start).toHaveBeenCalledTimes(1);
    expect(redirectToPaymentMock).toHaveBeenCalledTimes(1);
    expect(result.current.isRedirecting).toBe(true);
  });

  it("shows the fallback message and enables the button again when the redirect throws", async () => {
    redirectToPaymentMock.mockImplementation(() => {
      throw new TypeError("Invalid URL");
    });
    const start = vi.fn().mockResolvedValue(checkoutResponse);
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(result.current.error).toEqual({ code: null, message: FALLBACK_MESSAGE });
    expect(result.current.isRedirecting).toBe(false);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not a URL", "not a url"],
    ["plain http", "http://pay.test/x"],
    ["a script", "javascript:alert(1)"],
  ])("does not redirect and shows the fallback message when the redirect URL is %s", async (_name, redirectUrl) => {
    const start = vi.fn().mockResolvedValue({ ...checkoutResponse, redirectUrl });
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(redirectToPaymentMock).not.toHaveBeenCalled();
    expect(result.current.error).toEqual({ code: null, message: FALLBACK_MESSAGE });
    expect(result.current.isRedirecting).toBe(false);
  });

  it.each([
    ["localhost", "http://localhost:3000/checkout/simulado?ref=x"],
    ["127.0.0.1", "http://127.0.0.1:3000/checkout/simulado?ref=x"],
  ])("redirects to a plain http URL on the loopback host %s", async (_name, redirectUrl) => {
    const start = vi.fn().mockResolvedValue({ ...checkoutResponse, redirectUrl });
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(redirectToPaymentMock).toHaveBeenCalledWith(redirectUrl);
    expect(result.current.isRedirecting).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("lets the client try again after a redirect URL that could not be used", async () => {
    const start = vi
      .fn()
      .mockResolvedValueOnce({ ...checkoutResponse, redirectUrl: undefined })
      .mockResolvedValueOnce(checkoutResponse);
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });
    await act(async () => {
      result.current.pay();
    });

    expect(start).toHaveBeenCalledTimes(2);
    expect(redirectToPaymentMock).toHaveBeenCalledWith("https://pay.test/x");
  });

  it.each([
    ["the gateway answered without a JSON body (UNKNOWN)", { code: "UNKNOWN", message: "Bad Gateway" }],
    ["the error has no message", { code: "PAYMENT_PROVIDER_ERROR", message: "" }],
  ])("uses the Spanish fallback when %s", async (_name, body) => {
    const start = vi.fn().mockRejectedValue(new ApiError({ statusCode: 502, ...body }));
    const { result } = renderHook(() => useStartCheckout(start));

    await act(async () => {
      result.current.pay();
    });

    expect(result.current.error).toEqual({ code: body.code, message: FALLBACK_MESSAGE });
    expect(result.current.isRedirecting).toBe(false);
  });
});

describe("useStartCheckout after the API refuses a purchase by hand", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it.each(["UNPAID_LIMIT_REACHED", "TRANSFER_DISABLED"])(
    "refreshes the screen on %s, so the options show what the API says now",
    async (code) => {
      const start = vi.fn().mockRejectedValue(new ApiError({ statusCode: 409, code, message: "No se puede." }));
      const { result } = renderHook(() => useStartCheckout(start, { byHand: true }));

      await act(async () => {
        result.current.pay();
      });

      expect(refreshMock).toHaveBeenCalledTimes(1);
      expect(result.current.error).toEqual({ code, message: "No se puede." });
      expect(result.current.isRedirecting).toBe(false);
    },
  );

  it("does not refresh for any other error", async () => {
    const start = vi.fn().mockRejectedValue(new ApiError({ statusCode: 409, code: "SLOT_FULL", message: "Sin cupos." }));
    const { result } = renderHook(() => useStartCheckout(start, { byHand: true }));

    await act(async () => {
      result.current.pay();
    });

    expect(refreshMock).not.toHaveBeenCalled();
  });
});

describe("useStartCheckout when the client comes back to the screen", () => {
  beforeEach(() => {
    refreshMock.mockReset();
  });

  it("is ready to confirm again after the screen was hidden and shown (the browser Back button)", async () => {
    const start = vi.fn().mockResolvedValue({ ...checkoutResponse, redirectUrl: null });
    let mode: "visible" | "hidden" = "visible";
    const wrapper = ({ children }: { children: ReactNode }) => <Activity mode={mode}>{children}</Activity>;
    const { result, rerender } = renderHook(() => useStartCheckout(start, { byHand: true }), { wrapper });

    await act(async () => {
      result.current.pay();
    });
    expect(result.current.isRedirecting).toBe(true);

    // Next keeps the checkout alive but hidden behind the result page, and shows it again on Back.
    mode = "hidden";
    rerender();
    mode = "visible";
    rerender();

    expect(result.current.isRedirecting).toBe(false);
    await act(async () => {
      result.current.pay();
    });
    expect(start).toHaveBeenCalledTimes(2);
  });

  it("reads the options and the cap again when the client comes back after buying, so a second Confirmar does not use old data", async () => {
    const start = vi.fn().mockResolvedValue({ ...checkoutResponse, redirectUrl: null });
    let mode: "visible" | "hidden" = "visible";
    const wrapper = ({ children }: { children: ReactNode }) => <Activity mode={mode}>{children}</Activity>;
    const { result, rerender } = renderHook(() => useStartCheckout(start, { byHand: true }), { wrapper });
    expect(refreshMock).not.toHaveBeenCalled();
    await act(async () => {
      result.current.pay();
    });

    mode = "hidden";
    rerender();
    expect(refreshMock).not.toHaveBeenCalled();
    mode = "visible";
    rerender();

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("does not refresh when the screen is shown again without a purchase", async () => {
    const start = vi.fn();
    let mode: "visible" | "hidden" = "visible";
    const wrapper = ({ children }: { children: ReactNode }) => <Activity mode={mode}>{children}</Activity>;
    const { rerender } = renderHook(() => useStartCheckout(start, { byHand: true }), { wrapper });

    mode = "hidden";
    rerender();
    mode = "visible";
    rerender();

    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("still makes a single purchase on a double click", async () => {
    const start = vi.fn().mockResolvedValue({ ...checkoutResponse, redirectUrl: null });
    const { result } = renderHook(() => useStartCheckout(start, { byHand: true }));

    await act(async () => {
      result.current.pay();
      result.current.pay();
    });

    expect(start).toHaveBeenCalledTimes(1);
  });
});
