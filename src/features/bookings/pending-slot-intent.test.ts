import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPendingSlotIntent,
  readPendingSlotIntent,
  savePendingSlotIntent,
} from "./pending-slot-intent";

const SLOTS = [{ slotId: "slot-1", service: "performance" as const, startsAt: "2026-11-05T13:00:00.000Z" }];

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pending slot intent", () => {
  it("round-trips what was saved", () => {
    savePendingSlotIntent({ surface: "reservar", slots: SLOTS });

    const intent = readPendingSlotIntent();

    expect(intent?.surface).toBe("reservar");
    expect(intent?.slots).toEqual(SLOTS);
  });

  it("returns null when nothing was saved", () => {
    expect(readPendingSlotIntent()).toBeNull();
  });

  it("returns null, and clears storage, once the intent has expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T12:00:00.000Z"));
    savePendingSlotIntent({ surface: "bookings", slots: SLOTS });

    vi.setSystemTime(new Date("2026-11-05T13:01:00.000Z")); // 61 minutes later

    expect(readPendingSlotIntent()).toBeNull();
    vi.setSystemTime(new Date("2026-11-05T12:00:00.000Z"));
    expect(window.sessionStorage.getItem("move:pending-slot-intent")).toBeNull();
  });

  it("is still readable just before the 1-hour window closes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T12:00:00.000Z"));
    savePendingSlotIntent({ surface: "reservar", slots: SLOTS });

    vi.setSystemTime(new Date("2026-11-05T12:59:00.000Z"));

    expect(readPendingSlotIntent()).not.toBeNull();
  });

  it("returns null for a corrupted value instead of throwing", () => {
    window.sessionStorage.setItem("move:pending-slot-intent", "{not json");

    expect(readPendingSlotIntent()).toBeNull();
  });

  it("clearPendingSlotIntent removes it", () => {
    savePendingSlotIntent({ surface: "reservar", slots: SLOTS });

    clearPendingSlotIntent();

    expect(readPendingSlotIntent()).toBeNull();
  });
});
