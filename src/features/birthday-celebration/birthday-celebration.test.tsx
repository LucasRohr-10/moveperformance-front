import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BirthdayCelebration } from "./birthday-celebration";
import { runConfetti } from "./run-confetti";

vi.mock("./run-confetti", () => ({ runConfetti: vi.fn(() => () => {}) }));

const confetti = vi.mocked(runConfetti);

// 12:00 in Montevideo.
const NOV_4 = new Date("2026-11-04T15:00:00Z");

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: reduce && query.includes("reduce"), media: query })),
  );
}

function renderAna(birthDate = "1990-11-04") {
  return render(<BirthdayCelebration userId="u1" firstName="Ana" birthDate={birthDate} />);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOV_4);
  stubReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  confetti.mockClear();
  window.localStorage.clear();
});

describe("BirthdayCelebration", () => {
  it("celebrates on the client's birthday", () => {
    renderAna();

    expect(screen.getByText("¡Hoy es tu día!")).toBeDefined();
    expect(screen.getByText(/cumple,/)).toBeDefined();
    expect(screen.getByText("Ana!")).toBeDefined();
    expect(confetti).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({ durationMs: 5000, emitForMs: 2200 }),
    );
  });

  it("does nothing on another day", () => {
    renderAna("1990-11-05");

    expect(screen.queryByText("¡Hoy es tu día!")).toBeNull();
    expect(confetti).not.toHaveBeenCalled();
  });

  it("shows only once per year in this browser", () => {
    const first = renderAna();
    first.unmount();

    renderAna();

    expect(screen.queryByText("¡Hoy es tu día!")).toBeNull();
    expect(window.localStorage.getItem("move:birthday-shown:u1:2026")).not.toBeNull();
  });

  it("disappears after five seconds", () => {
    renderAna();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("¡Hoy es tu día!")).toBeNull();
  });

  it("closes on tap", () => {
    renderAna();

    fireEvent.click(screen.getByText("¡Hoy es tu día!"));

    expect(screen.queryByText("¡Hoy es tu día!")).toBeNull();
  });

  it("skips the confetti with reduced motion", () => {
    stubReducedMotion(true);

    renderAna();

    expect(screen.getByText("¡Hoy es tu día!")).toBeDefined();
    expect(confetti).not.toHaveBeenCalled();
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("still celebrates when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });

    renderAna();

    expect(screen.getByText("¡Hoy es tu día!")).toBeDefined();
  });

  it("celebrates a 29th of February birthday on the 28th in non-leap years", () => {
    vi.setSystemTime(new Date("2027-02-28T15:00:00Z"));

    renderAna("2000-02-29");

    expect(screen.getByText("¡Hoy es tu día!")).toBeDefined();
  });
});
