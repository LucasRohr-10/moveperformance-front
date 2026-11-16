import { act, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SnackbarProvider } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import type { DayImpactDto } from "@/lib/api/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./day-editor-api", () => ({ getDayEditor: vi.fn(), previewDay: vi.fn(), applyDay: vi.fn() }));

import { DAY, dayEditor } from "./day-editor.fixtures";
import { applyDay, getDayEditor, previewDay } from "./day-editor-api";
import { useDayDraft } from "./use-day-draft";

const getEditorMock = vi.mocked(getDayEditor);
const previewMock = vi.mocked(previewDay);
const applyMock = vi.mocked(applyDay);

function impact(total: number, overrides: Partial<DayImpactDto> = {}): DayImpactDto {
  return {
    cancelledSlots: 3,
    createdSlots: 0,
    modifiedSlots: 0,
    affectedBookings: { total, package: total, planOrFollowup: 0, payment: 0 },
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <SnackbarProvider>{children}</SnackbarProvider>;
}

async function readyHook() {
  const hook = renderHook(() => useDayDraft(DAY), { wrapper });
  await waitFor(() => expect(hook.result.current.status).toBe("ready"));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  getEditorMock.mockResolvedValue(dayEditor());
});

describe("useDayDraft", () => {
  it("requestSave without reason when something is cancelled shows the reason error and calls nothing", async () => {
    const { result } = await readyHook();
    act(() => result.current.dispatch({ type: "toggleSlotCancel", slotId: "s09" }));
    expect(result.current.reasonError).toBeNull();

    await act(() => result.current.requestSave());

    expect(result.current.reasonError).toMatch(/motivo/i);
    expect(previewMock).not.toHaveBeenCalled();
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("requestSave with zero affected bookings applies directly", async () => {
    previewMock.mockResolvedValue(impact(0));
    applyMock.mockResolvedValue(impact(0));
    const { result } = await readyHook();
    act(() => {
      result.current.dispatch({ type: "toggleSlotCancel", slotId: "s09" });
      result.current.dispatch({ type: "setReason", reason: "Mantenimiento" });
    });

    await act(() => result.current.requestSave());

    expect(applyMock).toHaveBeenCalledWith(expect.objectContaining({ from: DAY, cancelSlotIds: ["s09"] }), 0);
    expect(result.current.pendingConfirmation).toBeNull();
    expect(push).toHaveBeenCalledWith(`/staff/schedule?date=${DAY}`);
    expect(await screen.findByText("Cambios guardados")).toBeDefined();
  });

  it("asks for confirmation when bookings are affected and applies with the number it showed", async () => {
    previewMock.mockResolvedValue(impact(5));
    applyMock.mockResolvedValue(impact(5, { cancelledSlots: 3 }));
    const { result } = await readyHook();
    act(() => {
      result.current.dispatch({ type: "toggleSlotCancel", slotId: "s08" });
      result.current.dispatch({ type: "setReason", reason: "Mantenimiento" });
    });

    await act(() => result.current.requestSave());
    expect(result.current.pendingConfirmation?.affectedBookings.total).toBe(5);
    expect(applyMock).not.toHaveBeenCalled();

    await act(() => result.current.confirmSave());

    expect(applyMock).toHaveBeenCalledWith(expect.anything(), 5);
    expect(await screen.findByText("3 turnos cancelados · 5 reservas canceladas")).toBeDefined();
  });

  it("DAY_EDIT_STALE re-runs the preview and reopens the confirmation with the new numbers", async () => {
    previewMock.mockResolvedValueOnce(impact(2)).mockResolvedValueOnce(impact(3));
    applyMock.mockRejectedValueOnce(
      new ApiError({ statusCode: 409, code: "DAY_EDIT_STALE", message: "Cambió la cantidad de reservas" }),
    );
    const { result } = await readyHook();
    act(() => {
      result.current.dispatch({ type: "toggleSlotCancel", slotId: "s08" });
      result.current.dispatch({ type: "setReason", reason: "Mantenimiento" });
    });
    await act(() => result.current.requestSave());

    await act(() => result.current.confirmSave());

    expect(previewMock).toHaveBeenCalledTimes(2);
    expect(result.current.pendingConfirmation?.affectedBookings.total).toBe(3);
    // The draft is untouched.
    expect(result.current.state?.cancelSlotIds).toEqual(["s08"]);
    expect(result.current.state?.reason).toBe("Mantenimiento");
    expect(push).not.toHaveBeenCalled();

    applyMock.mockResolvedValueOnce(impact(3));
    await act(() => result.current.confirmSave());
    expect(applyMock).toHaveBeenLastCalledWith(expect.anything(), 3);
  });

  it("shows the backend message in a snackbar and keeps the draft when the preview fails", async () => {
    previewMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "DAY_EDIT_ATTENDANCE_MARKED", message: "Hay asistencia marcada en un turno" }),
    );
    const { result } = await readyHook();
    act(() => {
      result.current.dispatch({ type: "toggleSlotCancel", slotId: "s08" });
      result.current.dispatch({ type: "setReason", reason: "Mantenimiento" });
    });

    await act(() => result.current.requestSave());

    expect(await screen.findByText("Hay asistencia marcada en un turno")).toBeDefined();
    expect(result.current.state?.cancelSlotIds).toEqual(["s08"]);
    expect(result.current.isSaving).toBe(false);
  });

  it("warns before unload when the draft is dirty", async () => {
    const { result } = await readyHook();
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    act(() => result.current.dispatch({ type: "toggleSlotCancel", slotId: "s09" }));
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);

    act(() => result.current.dispatch({ type: "reset" }));
    const reset = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(reset);
    expect(reset.defaultPrevented).toBe(false);
  });

  it("reports an error status and loads again on retry", async () => {
    getEditorMock.mockRejectedValueOnce(new Error("boom"));
    const hook = renderHook(() => useDayDraft(DAY), { wrapper });
    await waitFor(() => expect(hook.result.current.status).toBe("error"));

    act(() => hook.result.current.retry());

    await waitFor(() => expect(hook.result.current.status).toBe("ready"));
    expect(getEditorMock).toHaveBeenCalledTimes(2);
  });

  it("opens a range already closing the days, since a range only exists to close them", async () => {
    getEditorMock.mockResolvedValue(dayEditor({ to: "2026-11-15", isRange: true }));

    const { result } = await readyHook();

    expect(result.current.state?.closeWholeDay).toBe(true);
  });

  it("keeps closing the day when another range is picked, and drops the rest of the draft", async () => {
    const hook = renderHook(({ to }: { to?: string }) => useDayDraft(DAY, to), { wrapper, initialProps: { to: undefined as string | undefined } });
    await waitFor(() => expect(hook.result.current.status).toBe("ready"));
    act(() => {
      hook.result.current.dispatch({ type: "toggleCloseDay" });
      hook.result.current.dispatch({ type: "setBandCapacity", templateId: "t-morning", capacity: 6 });
    });

    getEditorMock.mockResolvedValue(dayEditor({ to: "2026-11-15", isRange: true }));
    hook.rerender({ to: "2026-11-15" });

    await waitFor(() => expect(hook.result.current.editor?.isRange).toBe(true));
    expect(hook.result.current.state?.closeWholeDay).toBe(true);
    expect(hook.result.current.state?.bands["t-morning"].capacity).toBe(4);
  });
});
