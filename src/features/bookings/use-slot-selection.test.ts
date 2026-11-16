import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookableSlot } from "@/lib/api/types";

import { useSlotSelection } from "./use-slot-selection";

const SLOT: BookableSlot = {
  id: "slot-1",
  service: "performance",
  startsAt: "2026-10-16T12:00:00.000Z",
  endsAt: "2026-10-16T13:00:00.000Z",
  durationMinutes: 60,
  capacity: 5,
  available: 3,
  isFull: false,
  alreadyBooked: false,
};

const WINDOW = { bookingWindowDays: 30, lastBookableDate: "2026-11-06" };
const fetchWindow = () => Promise.resolve(WINDOW);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T11:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSlotSelection", () => {
  it("fetches all 7 days of the visible week on mount", async () => {
    const fetchSlots = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchSlots).toHaveBeenCalledTimes(7);
    expect(fetchSlots).toHaveBeenCalledWith("performance", "2026-10-12");
    expect(fetchSlots).toHaveBeenCalledWith("performance", "2026-10-18");
  });

  it("resets day and slot and calls onChange when the service changes", async () => {
    const fetchSlots = vi.fn().mockImplementation((_s, date) => Promise.resolve(date === "2026-10-16" ? [SLOT] : []));
    const onChange = vi.fn();
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow, onChange }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectSlot(4, "slot-1"));
    expect(result.current.selectedSlotId).toBe("slot-1");

    act(() => result.current.setService("rehab"));
    expect(result.current.selectedSlotId).toBeNull();
    expect(result.current.dayIndex).toBe(4);
    expect(onChange).toHaveBeenCalledTimes(2); // once for selectSlot, once for setService

    await waitFor(() => expect(fetchSlots).toHaveBeenCalledWith("rehab", "2026-10-12"));
  });

  it("bounds week navigation between 0 and 3", async () => {
    const fetchSlots = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.lastBookableDate).toBe("2026-11-06"));

    act(() => result.current.prevWeek());
    expect(result.current.week).toBe(0);
    expect(result.current.atFirstWeek).toBe(true);

    act(() => result.current.nextWeek());
    act(() => result.current.nextWeek());
    act(() => result.current.nextWeek());
    act(() => result.current.nextWeek());
    expect(result.current.week).toBe(3);
    expect(result.current.atLastWeek).toBe(true);
  });

  it("goToday resets week, day and selection", async () => {
    const fetchSlots = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.nextWeek());
    act(() => result.current.selectDay(3));
    expect(result.current.isToday).toBe(false);

    act(() => result.current.goToday());
    expect(result.current.week).toBe(0);
    expect(result.current.dayIndex).toBe(4);
    expect(result.current.isToday).toBe(true);
  });

  it("exposes refreshing while a week fetch is in flight, separate from the initial loading flag", async () => {
    let blocked = false;
    const resolvers: Array<(slots: BookableSlot[]) => void> = [];
    const fetchSlots = vi.fn().mockImplementation(() => {
      if (!blocked) return Promise.resolve([]);
      return new Promise<BookableSlot[]>((resolve) => resolvers.push(resolve));
    });
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.refreshing).toBe(false);

    blocked = true;
    act(() => result.current.nextWeek());
    expect(result.current.refreshing).toBe(true);
    // Stale data from the previous week stays visible — no full-page loading flash on navigation.
    expect(result.current.loading).toBe(false);

    await act(async () => {
      resolvers.forEach((resolve) => resolve([]));
      await Promise.resolve();
    });
    expect(result.current.refreshing).toBe(false);
  });

  it("goToDate jumps straight to the week and day of an arbitrary date", async () => {
    const fetchSlots = vi.fn().mockResolvedValue([]);
    const onChange = vi.fn();
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow, onChange }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Monday of the visible week is 2026-10-12; Tuesday the week after is 2026-10-20.
    act(() => result.current.goToDate("2026-10-20"));

    expect(result.current.week).toBe(1);
    expect(result.current.dayIndex).toBe(1);
    expect(result.current.selectedSlotId).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("goToDate clamps to the last bookable week instead of going past it", async () => {
    const fetchSlots = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.lastBookableDate).toBe("2026-11-06"));

    act(() => result.current.goToDate("2027-01-01"));

    expect(result.current.atLastWeek).toBe(true);
  });

  it("clearSlot only clears the selection, not the day or week", async () => {
    const fetchSlots = vi.fn().mockImplementation((_s, date) => Promise.resolve(date === "2026-10-16" ? [SLOT] : []));
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectSlot(4, "slot-1"));
    act(() => result.current.clearSlot());
    expect(result.current.selectedSlotId).toBeNull();
    expect(result.current.dayIndex).toBe(4);
  });

  it("refresh re-fetches the current week without changing the selection", async () => {
    const fetchSlots = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchSlots).toHaveBeenCalledTimes(7);

    act(() => result.current.refresh());
    await waitFor(() => expect(fetchSlots).toHaveBeenCalledTimes(14));
  });

  it("applies a custom labelFor when building desktop rows", async () => {
    const fetchSlots = vi.fn().mockImplementation((_s, date) => Promise.resolve(date === "2026-10-16" ? [SLOT] : []));
    const { result } = renderHook(() =>
      useSlotSelection("performance", { fetchSlots, fetchWindow, labelFor: () => "Disponible" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const row = result.current.rows.find((r) => r.cells.some((c) => c?.slot.id === "slot-1"));
    expect(row?.cells.find((c) => c?.slot.id === "slot-1")?.label).toBe("Disponible");
  });

  it("surfaces a fetch failure as an error", async () => {
    const fetchSlots = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));

    await waitFor(() => expect(result.current.error).toBe(true));
  });

  describe("on a Thursday", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date("2026-10-22T15:00:00.000Z"));
    });

    it("shows the week from Monday to Sunday with today selected", async () => {
      const fetchSlots = vi.fn().mockResolvedValue([]);
      const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.days[0].date).toBe("2026-10-19");
      expect(result.current.days[6].date).toBe("2026-10-25");
      expect(result.current.weekLabel).toBe("19 – 25 OCT");
      expect(result.current.dayIndex).toBe(3);
    });

    it("selects the first day when moving to another week", async () => {
      const fetchSlots = vi.fn().mockResolvedValue([]);
      const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.nextWeek());
      expect(result.current.dayIndex).toBe(0);
    });

    it("marks the week that contains the last bookable date as the last one", async () => {
      const fetchSlots = vi.fn().mockResolvedValue([]);
      const { result } = renderHook(() =>
        useSlotSelection("performance", {
          fetchSlots,
          fetchWindow: () => Promise.resolve({ bookingWindowDays: 30, lastBookableDate: "2026-11-21" }),
        }),
      );
      await waitFor(() => expect(result.current.lastBookableDate).toBe("2026-11-21"));

      for (let i = 0; i < 3; i++) act(() => result.current.nextWeek());
      expect(result.current.week).toBe(3);
      expect(result.current.atLastWeek).toBe(false);

      act(() => result.current.nextWeek());
      expect(result.current.week).toBe(4);
      expect(result.current.atLastWeek).toBe(true);

      act(() => result.current.nextWeek());
      expect(result.current.week).toBe(4);
    });

    it("falls back to the default last week until the window arrives", async () => {
      const fetchSlots = vi.fn().mockResolvedValue([]);
      const { result } = renderHook(() =>
        useSlotSelection("performance", { fetchSlots, fetchWindow: () => new Promise(() => {}) }),
      );
      await waitFor(() => expect(result.current.loading).toBe(false));

      for (let i = 0; i < 3; i++) act(() => result.current.nextWeek());
      expect(result.current.atLastWeek).toBe(true);
    });

    it("fetchRange loads every day between two dates for the given service", async () => {
      const fetchSlots = vi
        .fn()
        .mockImplementation((_s, date) => Promise.resolve(date === "2026-10-27" ? [{ ...SLOT, id: "later" }] : []));
      const { result } = renderHook(() => useSlotSelection("performance", { fetchSlots, fetchWindow }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      fetchSlots.mockClear();

      const slots = await result.current.fetchRange("recovery", "2026-10-26", "2026-10-28");

      expect(fetchSlots).toHaveBeenCalledTimes(3);
      expect(fetchSlots).toHaveBeenCalledWith("recovery", "2026-10-26");
      expect(slots.map((s) => s.id)).toEqual(["later"]);
    });
  });
});
