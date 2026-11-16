import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ClientFollowupDto } from "@/lib/api/types";

vi.mock("./followup-api", () => ({ getClientFollowup: vi.fn(), endPause: vi.fn() }));

import { pauseFixture } from "./alert-fixtures";
import { endPause, getClientFollowup } from "./followup-api";
import { useClientFollowup } from "./use-client-followup";

const getMock = vi.mocked(getClientFollowup);
const endMock = vi.mocked(endPause);

const paused: ClientFollowupDto = { pause: pauseFixture(), pauses: [], contacts: [] };
const free: ClientFollowupDto = { pause: null, pauses: [pauseFixture({ endedAt: "2026-10-12T10:00:00.000Z" })], contacts: [] };

describe("useClientFollowup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMock.mockResolvedValue(paused);
  });

  it("starts loading and then has the follow-up of the client", async () => {
    const { result } = renderHook(() => useClientFollowup("client-1"));
    expect(result.current.state).toBe("loading");

    await waitFor(() => expect(result.current.state).toEqual({ data: paused }));
    expect(getMock).toHaveBeenCalledWith("client-1");
  });

  it("shows an error when it cannot load and loads again on reload", async () => {
    getMock.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useClientFollowup("client-1"));
    await waitFor(() => expect(result.current.state).toBe("error"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.state).toEqual({ data: paused }));
  });

  it("ends the pause and reloads", async () => {
    endMock.mockResolvedValue(pauseFixture());
    const { result } = renderHook(() => useClientFollowup("client-1"));
    await waitFor(() => expect(result.current.state).toEqual({ data: paused }));
    getMock.mockResolvedValue(free);

    let outcome: Awaited<ReturnType<typeof result.current.endActivePause>> | undefined;
    await act(async () => {
      outcome = await result.current.endActivePause();
    });

    expect(outcome).toEqual({ ok: true });
    expect(endMock).toHaveBeenCalledWith("client-1");
    await waitFor(() => expect(result.current.state).toEqual({ data: free }));
  });

  it("explains and reloads when the client had no active pause", async () => {
    endMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "NO_ACTIVE_PAUSE", message: "El cliente no tiene una pausa activa." }),
    );
    const { result } = renderHook(() => useClientFollowup("client-1"));
    await waitFor(() => expect(result.current.state).toEqual({ data: paused }));
    getMock.mockClear();

    let outcome: Awaited<ReturnType<typeof result.current.endActivePause>> | undefined;
    await act(async () => {
      outcome = await result.current.endActivePause();
    });

    expect(outcome).toEqual({ ok: false, message: "El cliente no tiene una pausa activa.", isStale: true });
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));
  });

  it("does not reload when ending fails for another reason", async () => {
    endMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useClientFollowup("client-1"));
    await waitFor(() => expect(result.current.state).toEqual({ data: paused }));
    getMock.mockClear();

    let outcome: Awaited<ReturnType<typeof result.current.endActivePause>> | undefined;
    await act(async () => {
      outcome = await result.current.endActivePause();
    });

    expect(outcome).toEqual({
      ok: false,
      message: "No pudimos finalizar la pausa. Probá de nuevo.",
      isStale: false,
    });
    expect(getMock).not.toHaveBeenCalled();
  });
});
