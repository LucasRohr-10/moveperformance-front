import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { cancelBooking } from "./cancel-booking";
import { rowOf } from "./test-rows";
import { useCancelBooking } from "./use-cancel-booking";

const showSnackbar = vi.fn();
const refresh = vi.fn();

vi.mock("@/components/ui/snackbar", () => ({ useSnackbar: () => ({ showSnackbar }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("./cancel-booking");

const cancelBookingMock = vi.mocked(cancelBooking);

const windowClosed = () =>
  new ApiError({ statusCode: 409, code: "CANCEL_WINDOW_CLOSED", message: "detalle interno" });

describe("useCancelBooking", () => {
  beforeEach(() => {
    showSnackbar.mockReset();
    refresh.mockReset();
    cancelBookingMock.mockReset();
  });

  it("hides the booking, tells the client and refreshes the page when it is cancelled", async () => {
    cancelBookingMock.mockResolvedValue(rowResponse());
    const { result } = renderHook(() => useCancelBooking());

    let cancelled = false;
    await act(async () => {
      cancelled = await result.current.cancel(rowOf());
    });

    expect(cancelled).toBe(true);
    expect(cancelBookingMock).toHaveBeenCalledWith("b1");
    expect(result.current.hiddenIds.has("b1")).toBe(true);
    expect(showSnackbar).toHaveBeenCalledWith({
      tone: "success",
      title: "Reserva cancelada",
      message: "Recovery · Sáb 24 Oct · 10:30",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the success notice persistent and asks to contact MOVE when the client had already paid", async () => {
    cancelBookingMock.mockResolvedValue({ ...rowResponse(), contactForRefund: true });
    const { result } = renderHook(() => useCancelBooking());

    await act(async () => {
      await result.current.cancel(rowOf());
    });

    expect(showSnackbar).toHaveBeenCalledTimes(1);
    expect(showSnackbar).toHaveBeenCalledWith({
      tone: "success",
      title: "Reserva cancelada",
      message: "Ya la pagaste: comunicate con MOVE para ver el reembolso.",
      persistent: true,
    });
    expect(result.current.hiddenIds.has("b1")).toBe(true);
  });

  it("keeps the booking, shows a fixed error and refreshes when the cancellation window already closed", async () => {
    cancelBookingMock.mockRejectedValue(windowClosed());
    const { result } = renderHook(() => useCancelBooking());

    let cancelled = true;
    await act(async () => {
      cancelled = await result.current.cancel(rowOf());
    });

    expect(cancelled).toBe(false);
    expect(result.current.hiddenIds.has("b1")).toBe(false);
    expect(showSnackbar).toHaveBeenCalledWith({
      tone: "danger",
      title: "No pudimos cancelar la reserva",
      message: "Probá de nuevo en unos minutos.",
    });
    expect(JSON.stringify(showSnackbar.mock.calls)).not.toContain("detalle interno");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sends one request when the same booking is cancelled twice in a row", async () => {
    let finish: () => void = () => {};
    cancelBookingMock.mockReturnValue(new Promise((resolve) => (finish = () => resolve(rowResponse()))));
    const { result } = renderHook(() => useCancelBooking());

    let second = true;
    await act(async () => {
      void result.current.cancel(rowOf());
      second = await result.current.cancel(rowOf());
    });
    expect(second).toBe(false);
    expect(result.current.busyId).toBe("b1");

    await act(async () => finish());
    expect(cancelBookingMock).toHaveBeenCalledTimes(1);
    expect(result.current.busyId).toBeNull();
  });
});

function rowResponse() {
  return {
    id: "b1",
    timeSlotId: "s1",
    service: "recovery" as const,
    startsAt: "2026-10-24T13:30:00Z",
    endsAt: "2026-10-24T14:15:00Z",
    durationMinutes: 45,
    label: "Sesión Recovery · 45 min",
    status: "cancelled" as const,
    source: "plan" as const,
    canCancel: false,
    cancelledAt: "2026-10-23T20:00:00Z",
    contactForRefund: false,
  };
}
