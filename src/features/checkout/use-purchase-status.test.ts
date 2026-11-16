import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { PurchaseStatusDto } from "@/lib/api/types";

vi.mock("./checkout-api", () => ({ getPurchaseStatus: vi.fn() }));

import { getPurchaseStatus } from "./checkout-api";
import { MAX_POLL_ATTEMPTS, POLL_INTERVAL_MS, usePurchaseStatus } from "./use-purchase-status";

const getPurchaseStatusMock = vi.mocked(getPurchaseStatus);

const PENDING: PurchaseStatusDto = {
  externalReference: "ref-1",
  kind: "plan",
  status: "pending",
  itemName: "Plan mensual",
  service: "performance",
  amount: 2500,
  currency: "UYU",
  planId: "plan-1",
  bookingId: null,
  startsAt: null,
  needsAttention: false,
  paymentStatus: null,
  paymentStatusDetail: null,
  paymentMethod: "mercado_pago",
  transferDetails: null,
};
const APPROVED: PurchaseStatusDto = { ...PENDING, status: "approved" };

const serverError = () =>
  new ApiError({ statusCode: 500, code: "INTERNAL_ERROR", message: "Error interno." });

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function renderStatus() {
  return renderHook(({ reference }) => usePurchaseStatus(reference), { initialProps: { reference: "ref-1" } });
}

describe("usePurchaseStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("polls every 3 s for at most 20 attempts", () => {
    expect(POLL_INTERVAL_MS).toBe(3000);
    expect(MAX_POLL_ATTEMPTS).toBe(20);
  });

  it("starts loading and asks only once when the purchase is already approved", async () => {
    getPurchaseStatusMock.mockResolvedValue(APPROVED);
    const { result } = renderStatus();
    expect(result.current.state).toEqual({ phase: "loading" });

    await advance(0);
    expect(result.current.state).toEqual({ phase: "loaded", purchase: APPROVED, timedOut: false });

    await advance(60_000);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);
    expect(getPurchaseStatusMock).toHaveBeenCalledWith("ref-1");
  });

  it.each(["cash", "transfer"] as const)(
    "does not keep asking about a pending %s purchase: it is final for the client",
    async (paymentMethod) => {
      const byHand = { ...PENDING, paymentMethod };
      getPurchaseStatusMock.mockResolvedValue(byHand);
      const { result } = renderStatus();

      await advance(0);
      await advance(POLL_INTERVAL_MS * 3);

      expect(result.current.state).toEqual({ phase: "loaded", purchase: byHand, timedOut: false });
      expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);
    },
  );

  it("stops asking once the API says the last payment was rejected: the purchase stays pending but the answer is final", async () => {
    const rejected = { ...PENDING, paymentStatus: "rejected" as const, paymentStatusDetail: "cc_rejected_card_disabled" };
    getPurchaseStatusMock.mockResolvedValue(rejected);
    const { result } = renderStatus();

    await advance(0);
    await advance(POLL_INTERVAL_MS * 3);

    expect(result.current.state).toEqual({ phase: "loaded", purchase: rejected, timedOut: false });
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);
  });

  it("keeps asking while the last payment is in process, and moves on when it is credited", async () => {
    const inProcess = { ...PENDING, paymentStatus: "in_process" as const, paymentStatusDetail: "pending_contingency" };
    getPurchaseStatusMock.mockResolvedValueOnce(inProcess).mockResolvedValue(APPROVED);
    const { result } = renderStatus();
    await advance(0);
    expect(result.current.state).toEqual({ phase: "loaded", purchase: inProcess, timedOut: false });

    await advance(POLL_INTERVAL_MS);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ phase: "loaded", purchase: APPROVED, timedOut: false });
  });

  it("asks again only 3000 ms after a pending answer", async () => {
    getPurchaseStatusMock.mockResolvedValue(PENDING);
    renderStatus();
    await advance(0);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);

    await advance(POLL_INTERVAL_MS - 1);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(2);
  });

  it("stops after exactly 20 requests while pending and marks the state as timed out", async () => {
    getPurchaseStatusMock.mockResolvedValue(PENDING);
    const { result } = renderStatus();

    await advance(POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);
    expect(result.current.state).toEqual({ phase: "loaded", purchase: PENDING, timedOut: true });

    await advance(60_000);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);
  });

  it("keeps the last purchase and keeps polling when a request fails in between", async () => {
    getPurchaseStatusMock
      .mockResolvedValueOnce(PENDING)
      .mockRejectedValueOnce(serverError())
      .mockResolvedValue(APPROVED);
    const { result } = renderStatus();
    await advance(0);

    await advance(POLL_INTERVAL_MS);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ phase: "loaded", purchase: PENDING, timedOut: false });

    await advance(POLL_INTERVAL_MS);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(3);
    expect(result.current.state).toEqual({ phase: "loaded", purchase: APPROVED, timedOut: false });
  });

  it("counts failed polls too: persistent errors after a pending answer time out after 20 calls", async () => {
    getPurchaseStatusMock.mockResolvedValueOnce(PENDING).mockRejectedValue(serverError());
    const { result } = renderStatus();

    await advance(POLL_INTERVAL_MS * 40);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);
    expect(result.current.state).toEqual({ phase: "loaded", purchase: PENDING, timedOut: true });
  });

  it("reports not-found on PURCHASE_NOT_FOUND and asks no more", async () => {
    getPurchaseStatusMock.mockRejectedValue(
      new ApiError({ statusCode: 404, code: "PURCHASE_NOT_FOUND", message: "No encontramos la compra." }),
    );
    const { result } = renderStatus();
    await advance(0);
    expect(result.current.state).toEqual({ phase: "not-found" });

    await advance(60_000);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);
  });

  it("reports error when the first request fails for another reason, and recheck recovers it", async () => {
    getPurchaseStatusMock.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(APPROVED);
    const { result } = renderStatus();
    await advance(0);
    expect(result.current.state).toEqual({ phase: "error" });

    await advance(60_000);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);

    act(() => result.current.recheck());
    expect(result.current.state).toEqual({ phase: "loading" });
    await advance(0);
    expect(result.current.state).toEqual({ phase: "loaded", purchase: APPROVED, timedOut: false });
  });

  it("sends no request after unmount", async () => {
    getPurchaseStatusMock.mockResolvedValue(PENDING);
    const { unmount } = renderStatus();
    await advance(0);
    unmount();

    await advance(10_000);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a response that arrives after unmount", async () => {
    let resolve: (purchase: PurchaseStatusDto) => void = () => undefined;
    getPurchaseStatusMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result, unmount } = renderStatus();
    unmount();

    await act(async () => resolve(PENDING));
    await advance(10_000);
    expect(result.current.state).toEqual({ phase: "loading" });
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);
  });

  it("recheck after the time-out waits again and resets the count", async () => {
    getPurchaseStatusMock.mockResolvedValue(PENDING);
    const { result } = renderStatus();
    await advance(POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS);
    expect(result.current.state).toMatchObject({ timedOut: true });

    act(() => result.current.recheck());
    expect(result.current.state).toEqual({ phase: "loaded", purchase: PENDING, timedOut: false });

    await advance(POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS * 2);
    expect(result.current.state).toMatchObject({ timedOut: true });

    await advance(60_000);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS * 2);
  });

  it("does not overlap a slow request: the next one waits 3000 ms after it finishes", async () => {
    const SLOW_MS = 5000;
    getPurchaseStatusMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(PENDING), SLOW_MS)),
    );
    renderStatus();

    await advance(POLL_INTERVAL_MS);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);

    // The first answer lands at 5000 ms, so the second request is due at 8000 ms.
    await advance(SLOW_MS - 1);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(getPurchaseStatusMock).toHaveBeenCalledTimes(2);
  });

  it("returns to loading and drops the last purchase when the reference changes", async () => {
    getPurchaseStatusMock.mockResolvedValueOnce(APPROVED).mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = renderStatus();
    await advance(0);
    expect(result.current.state).toMatchObject({ phase: "loaded", purchase: APPROVED });

    rerender({ reference: "ref-2" });
    expect(result.current.state).toEqual({ phase: "loading" });
    expect(getPurchaseStatusMock).toHaveBeenLastCalledWith("ref-2");
  });

  it("does not show the previous purchase when the new reference fails to load", async () => {
    getPurchaseStatusMock.mockResolvedValueOnce(APPROVED).mockRejectedValue(serverError());
    const { result, rerender } = renderStatus();
    await advance(0);

    rerender({ reference: "ref-2" });
    await advance(0);
    expect(result.current.state).toEqual({ phase: "error" });
  });
});
