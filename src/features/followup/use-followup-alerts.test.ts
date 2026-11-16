import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

vi.mock("./followup-api", () => ({ listAlerts: vi.fn(), getAlertCounts: vi.fn(), handleAlert: vi.fn() }));

import { alertFixture, countsFixture } from "./alert-fixtures";
import { getAlertCounts, handleAlert, listAlerts } from "./followup-api";
import { useFollowupAlerts } from "./use-followup-alerts";

const listMock = vi.mocked(listAlerts);
const countsMock = vi.mocked(getAlertCounts);
const handleMock = vi.mocked(handleAlert);

const alert = alertFixture();
const counts = countsFixture();

describe("useFollowupAlerts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listMock.mockResolvedValue([alert]);
    countsMock.mockResolvedValue(counts);
  });

  it("starts loading and then has the alerts and the counters", async () => {
    const { result } = renderHook(() => useFollowupAlerts(null));
    expect(result.current.alerts).toBe("loading");
    expect(result.current.counts).toBe("loading");

    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));
    expect(result.current.counts).toEqual({ data: counts });
    expect(listMock).toHaveBeenCalledWith(undefined);
  });

  it("asks for the alerts of the type and goes back to loading when the type changes", async () => {
    const { result, rerender } = renderHook(({ type }) => useFollowupAlerts(type), {
      initialProps: { type: null as "expiring" | null },
    });
    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));

    listMock.mockReturnValue(new Promise(() => undefined));
    rerender({ type: "expiring" });

    expect(result.current.alerts).toBe("loading");
    expect(listMock).toHaveBeenLastCalledWith("expiring");
    expect(countsMock).toHaveBeenCalledTimes(1);
  });

  it("loads risk alerts with group=risk when riskOnly is set", async () => {
    const { result } = renderHook(() => useFollowupAlerts(null, true));

    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));
    expect(listMock).toHaveBeenCalledWith(undefined, "risk");
  });

  it("keeps the list when only the counters fail", async () => {
    countsMock.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFollowupAlerts(null));

    await waitFor(() => expect(result.current.counts).toBe("error"));
    expect(result.current.alerts).toEqual({ data: [alert] });
  });

  it("shows an error when the list fails and loads again on reload", async () => {
    listMock.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useFollowupAlerts(null));
    await waitFor(() => expect(result.current.alerts).toBe("error"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));
  });

  it("marks an alert as handled and reloads the list and the counters", async () => {
    handleMock.mockResolvedValue({ ...alert, status: "handled" });
    const { result } = renderHook(() => useFollowupAlerts(null));
    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));
    listMock.mockResolvedValue([]);
    countsMock.mockResolvedValue(countsFixture({ total: 1, expiring: 0 }));

    let outcome: Awaited<ReturnType<typeof result.current.handle>> | undefined;
    await act(async () => {
      outcome = await result.current.handle("alert-1");
    });

    expect(outcome).toEqual({ ok: true });
    expect(handleMock).toHaveBeenCalledWith("alert-1");
    await waitFor(() => expect(result.current.alerts).toEqual({ data: [] }));
    expect(result.current.counts).toEqual({ data: countsFixture({ total: 1, expiring: 0 }) });
  });

  it("explains and reloads when another staff already handled the alert", async () => {
    handleMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "ALERT_ALREADY_HANDLED", message: "Otra persona ya la gestionó." }),
    );
    const { result } = renderHook(() => useFollowupAlerts(null));
    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));
    listMock.mockClear();
    countsMock.mockClear();

    let outcome: Awaited<ReturnType<typeof result.current.handle>> | undefined;
    await act(async () => {
      outcome = await result.current.handle("alert-1");
    });

    expect(outcome).toEqual({ ok: false, message: "Otra persona ya la gestionó.", isStale: true });
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    expect(countsMock).toHaveBeenCalledTimes(1);
  });

  it("does not reload when handling fails for another reason", async () => {
    handleMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useFollowupAlerts(null));
    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));
    listMock.mockClear();

    let outcome: Awaited<ReturnType<typeof result.current.handle>> | undefined;
    await act(async () => {
      outcome = await result.current.handle("alert-1");
    });

    expect(outcome).toEqual({
      ok: false,
      message: "No pudimos marcar la alerta como gestionada. Probá de nuevo.",
      isStale: false,
    });
    expect(listMock).not.toHaveBeenCalled();
  });

  it("loads the current type when an action started before a filter change finishes after it", async () => {
    let finishHandle: (value: typeof alert) => void = () => undefined;
    handleMock.mockReturnValue(new Promise((resolve) => (finishHandle = resolve)));
    const { result, rerender } = renderHook(({ type }) => useFollowupAlerts(type), {
      initialProps: { type: null as "expiring" | null },
    });
    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.handle("alert-1");
    });
    rerender({ type: "expiring" });
    await waitFor(() => expect(result.current.alerts).toEqual({ data: [alert] }));
    listMock.mockClear();
    listMock.mockResolvedValue([]);
    await act(async () => {
      finishHandle({ ...alert, status: "handled" });
      await pending;
    });

    await waitFor(() => expect(result.current.alerts).toEqual({ data: [] }));
    expect(listMock).toHaveBeenLastCalledWith("expiring");
  });
});
