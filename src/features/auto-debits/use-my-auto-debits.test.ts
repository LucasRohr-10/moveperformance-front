import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { AutoDebitDto } from "@/lib/api/types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("./auto-debits-api", () => ({ listMyAutoDebits: vi.fn(), cancelAutoDebit: vi.fn() }));

import { cancelAutoDebit, listMyAutoDebits } from "./auto-debits-api";
import { useMyAutoDebits } from "./use-my-auto-debits";

const listMock = vi.mocked(listMyAutoDebits);
const cancelMock = vi.mocked(cancelAutoDebit);

const debit: AutoDebitDto = {
  id: "debit-1",
  externalReference: "ref-1",
  planId: "plan-1",
  planName: "Mensual",
  service: "performance",
  status: "authorized",
  amount: 3900,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: "2026-11-12",
  createdAt: "2026-10-12T10:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
};
const cancelled: AutoDebitDto = { ...debit, status: "cancelled", cancelledAt: "2026-10-13T10:00:00.000Z" };

const providerDown = () =>
  new ApiError({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR", message: "Mercado Pago no responde." });

describe("useMyAutoDebits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then has the debits", async () => {
    listMock.mockResolvedValue([debit]);
    const { result } = renderHook(() => useMyAutoDebits());
    expect(result.current.state).toBe("loading");

    await waitFor(() => expect(result.current.state).toEqual({ debits: [debit] }));
  });

  it("reports error when the first load fails, and reload recovers it", async () => {
    listMock.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue([debit]);
    const { result } = renderHook(() => useMyAutoDebits());
    await waitFor(() => expect(result.current.state).toBe("error"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.state).toEqual({ debits: [debit] }));
  });

  it("keeps the known debits when a later reload fails", async () => {
    listMock.mockResolvedValueOnce([debit]).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useMyAutoDebits());
    await waitFor(() => expect(result.current.state).toEqual({ debits: [debit] }));

    await act(async () => result.current.reload());

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ debits: [debit] });
  });

  it("cancels, refreshes the debits and the server sections, and answers ok", async () => {
    listMock.mockResolvedValueOnce([debit]).mockResolvedValue([cancelled]);
    cancelMock.mockResolvedValue(cancelled);
    const { result } = renderHook(() => useMyAutoDebits());
    await waitFor(() => expect(result.current.state).toEqual({ debits: [debit] }));

    let answer: Awaited<ReturnType<typeof result.current.cancel>> | undefined;
    await act(async () => {
      answer = await result.current.cancel("debit-1");
    });

    expect(cancelMock).toHaveBeenCalledWith("debit-1");
    expect(answer).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ debits: [cancelled] });
  });

  it("still shows the debit as cancelled when the refresh after cancelling fails", async () => {
    listMock.mockResolvedValueOnce([debit]).mockRejectedValue(new TypeError("Failed to fetch"));
    cancelMock.mockResolvedValue(cancelled);
    const { result } = renderHook(() => useMyAutoDebits());
    await waitFor(() => expect(result.current.state).toEqual({ debits: [debit] }));

    await act(async () => {
      await result.current.cancel("debit-1");
    });

    expect(result.current.state).toEqual({ debits: [cancelled] });
  });

  it("says Mercado Pago could not cancel and that the debit stays active", async () => {
    listMock.mockResolvedValue([debit]);
    cancelMock.mockRejectedValue(providerDown());
    const { result } = renderHook(() => useMyAutoDebits());
    await waitFor(() => expect(result.current.state).toEqual({ debits: [debit] }));

    let answer: Awaited<ReturnType<typeof result.current.cancel>> | undefined;
    await act(async () => {
      answer = await result.current.cancel("debit-1");
    });

    expect(answer).toEqual({
      ok: false,
      message: "No pudimos cancelar el débito en Mercado Pago. Sigue activo: probá de nuevo en unos minutos.",
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ debits: [debit] });
  });

  it("passes other API messages through and uses a fixed one for network errors", async () => {
    listMock.mockResolvedValue([debit]);
    cancelMock
      .mockRejectedValueOnce(new ApiError({ statusCode: 404, code: "AUTO_DEBIT_NOT_FOUND", message: "El débito automático no existe." }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useMyAutoDebits());
    await waitFor(() => expect(result.current.state).toEqual({ debits: [debit] }));

    const first = await act(async () => result.current.cancel("debit-1"));
    const second = await act(async () => result.current.cancel("debit-1"));

    expect(first).toEqual({ ok: false, message: "El débito automático no existe." });
    expect(second).toEqual({ ok: false, message: "No pudimos cancelar el débito. Probá de nuevo." });
  });

  it("does not show proxy text, such as an HTML gateway error, as the reason", async () => {
    listMock.mockResolvedValue([debit]);
    cancelMock.mockRejectedValue(new ApiError({ statusCode: 504, code: "UNKNOWN", message: "Gateway Timeout" }));
    const { result } = renderHook(() => useMyAutoDebits());
    await waitFor(() => expect(result.current.state).toEqual({ debits: [debit] }));

    const answer = await act(async () => result.current.cancel("debit-1"));

    expect(answer).toEqual({ ok: false, message: "No pudimos cancelar el débito. Probá de nuevo." });
  });
});
