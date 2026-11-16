import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { AutoDebitDto } from "@/lib/api/types";

vi.mock("./auto-debits-api", () => ({ getAutoDebitStatus: vi.fn() }));

import { getAutoDebitStatus } from "./auto-debits-api";
import { MAX_POLL_ATTEMPTS, POLL_INTERVAL_MS, useAutoDebitStatus } from "./use-auto-debit-status";

const getAutoDebitStatusMock = vi.mocked(getAutoDebitStatus);

const PENDING: AutoDebitDto = {
  id: "debit-1",
  externalReference: "ref-1",
  planId: "plan-1",
  planName: "Mensual",
  service: "performance",
  status: "pending",
  amount: 3900,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: null,
  createdAt: "2026-10-12T10:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
};
const AUTHORIZED: AutoDebitDto = { ...PENDING, status: "authorized", nextChargeOn: "2026-11-12" };
const CANCELLED: AutoDebitDto = { ...PENDING, status: "cancelled", cancelReason: "provider" };

const serverError = () => new ApiError({ statusCode: 500, code: "INTERNAL_ERROR", message: "Error interno." });

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function renderStatus() {
  return renderHook(({ reference }) => useAutoDebitStatus(reference), { initialProps: { reference: "ref-1" } });
}

describe("useAutoDebitStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("polls every 3 s for at most 20 attempts", () => {
    expect(POLL_INTERVAL_MS).toBe(3000);
    expect(MAX_POLL_ATTEMPTS).toBe(20);
  });

  it("queries the debit by its reference and starts loading", async () => {
    getAutoDebitStatusMock.mockResolvedValue(AUTHORIZED);
    const { result } = renderStatus();
    expect(result.current.state).toEqual({ kind: "loading" });

    await advance(0);

    expect(getAutoDebitStatusMock).toHaveBeenCalledWith("ref-1");
    expect(result.current.state).toEqual({ kind: "loaded", debit: AUTHORIZED, timedOut: false });
  });

  it("keeps polling while pending and stops once the debit is authorized", async () => {
    getAutoDebitStatusMock.mockResolvedValueOnce(PENDING).mockResolvedValueOnce(PENDING).mockResolvedValue(AUTHORIZED);
    const { result } = renderStatus();
    await advance(0);
    expect(result.current.state).toMatchObject({ debit: PENDING });

    await advance(POLL_INTERVAL_MS - 1);
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(1);
    await advance(1);
    await advance(POLL_INTERVAL_MS);
    expect(result.current.state).toEqual({ kind: "loaded", debit: AUTHORIZED, timedOut: false });

    await advance(60_000);
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(3);
  });

  it("stops polling once the debit is cancelled", async () => {
    getAutoDebitStatusMock.mockResolvedValue(CANCELLED);
    const { result } = renderStatus();
    await advance(0);

    await advance(60_000);

    expect(result.current.state).toEqual({ kind: "loaded", debit: CANCELLED, timedOut: false });
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(1);
  });

  it("stops polling after 20 attempts and marks the state as timed out", async () => {
    getAutoDebitStatusMock.mockResolvedValue(PENDING);
    const { result } = renderStatus();

    await advance(POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS);
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);
    expect(result.current.state).toEqual({ kind: "loaded", debit: PENDING, timedOut: true });

    await advance(60_000);
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);
  });

  it("does not hide the last status when a poll fails transiently", async () => {
    getAutoDebitStatusMock
      .mockResolvedValueOnce(PENDING)
      .mockRejectedValueOnce(serverError())
      .mockResolvedValue(AUTHORIZED);
    const { result } = renderStatus();
    await advance(0);

    await advance(POLL_INTERVAL_MS);
    expect(result.current.state).toEqual({ kind: "loaded", debit: PENDING, timedOut: false });

    await advance(POLL_INTERVAL_MS);
    expect(result.current.state).toEqual({ kind: "loaded", debit: AUTHORIZED, timedOut: false });
  });

  it("counts failed polls too", async () => {
    getAutoDebitStatusMock.mockResolvedValueOnce(PENDING).mockRejectedValue(serverError());
    const { result } = renderStatus();

    await advance(POLL_INTERVAL_MS * 40);

    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);
    expect(result.current.state).toEqual({ kind: "loaded", debit: PENDING, timedOut: true });
  });

  it("reports not-found on AUTO_DEBIT_NOT_FOUND and asks no more", async () => {
    getAutoDebitStatusMock.mockRejectedValue(
      new ApiError({ statusCode: 404, code: "AUTO_DEBIT_NOT_FOUND", message: "El débito automático no existe." }),
    );
    const { result } = renderStatus();
    await advance(0);
    expect(result.current.state).toEqual({ kind: "not-found" });

    await advance(60_000);
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(1);
  });

  it("reports error when the first request fails, and recheck recovers it", async () => {
    getAutoDebitStatusMock.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(AUTHORIZED);
    const { result } = renderStatus();
    await advance(0);
    expect(result.current.state).toEqual({ kind: "error" });

    act(() => result.current.recheck());
    expect(result.current.state).toEqual({ kind: "loading" });
    await advance(0);

    expect(result.current.state).toEqual({ kind: "loaded", debit: AUTHORIZED, timedOut: false });
  });

  it("recheck after the time-out waits again and resets the count", async () => {
    getAutoDebitStatusMock.mockResolvedValue(PENDING);
    const { result } = renderStatus();
    await advance(POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS);
    expect(result.current.state).toMatchObject({ timedOut: true });

    act(() => result.current.recheck());
    expect(result.current.state).toEqual({ kind: "loaded", debit: PENDING, timedOut: false });

    await advance(POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS);
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS * 2);
    expect(result.current.state).toMatchObject({ timedOut: true });
  });

  it("does not overlap a slow request: the next one waits 3000 ms after it finishes", async () => {
    const SLOW_MS = 5000;
    getAutoDebitStatusMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(PENDING), SLOW_MS)),
    );
    renderStatus();

    await advance(SLOW_MS + POLL_INTERVAL_MS - 1);
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(2);
  });

  it("sends no request and ignores a late response after unmount", async () => {
    let resolve: (debit: AutoDebitDto) => void = () => undefined;
    getAutoDebitStatusMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result, unmount } = renderStatus();
    unmount();

    await act(async () => resolve(PENDING));
    await advance(10_000);

    expect(result.current.state).toEqual({ kind: "loading" });
    expect(getAutoDebitStatusMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("drops the last debit when the reference changes", async () => {
    getAutoDebitStatusMock.mockResolvedValueOnce(AUTHORIZED).mockRejectedValue(serverError());
    const { result, rerender } = renderStatus();
    await advance(0);

    rerender({ reference: "ref-2" });
    expect(result.current.state).toEqual({ kind: "loading" });
    await advance(0);

    expect(result.current.state).toEqual({ kind: "error" });
  });
});
