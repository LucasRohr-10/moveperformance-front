import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookableSlot, ServiceType } from "@/lib/api/types";

import { CLIENT_CART_POLICY } from "./client-cart-policy";
import { BookingCartTray } from "./booking-cart-tray";
import type { CartPolicy } from "./cart-policy";
import { staffCartPolicy } from "./staff/staff-cart-policy";
import type { BookingCart, ServiceCartGroup } from "./use-booking-cart";

function slotAt(id: string, service: ServiceType, startsAt: string): BookableSlot {
  return {
    id,
    service,
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
    durationMinutes: 60,
    capacity: 10,
    available: 5,
    isFull: false,
    alreadyBooked: false,
  };
}

const PERF_A = slotAt("perf-a", "performance", "2026-10-26T12:05:00.000Z");
const PERF_B = slotAt("perf-b", "performance", "2026-10-26T13:10:00.000Z");
const REC = slotAt("rec", "recovery", "2026-10-27T13:00:00.000Z");
const REHAB = slotAt("rehab", "rehab", "2026-10-28T13:00:00.000Z");
const LABELS: Record<ServiceType, string> = { performance: "Performance", rehab: "Fisioterapia", recovery: "Recovery" };

function group(service: ServiceType, slots: BookableSlot[]): ServiceCartGroup {
  return { service, label: LABELS[service], slots, isRepeating: false, canRepeat: false, repeatUntil: null, phrase: null };
}

function cartWith(groups: ServiceCartGroup[], overrides: Partial<BookingCart> = {}): BookingCart {
  return {
    groups,
    count: groups.reduce((total, g) => total + g.slots.length, 0),
    userId: null,
    isSelected: () => false,
    hasSlots: (service) => groups.some((g) => g.service === service),
    toggleSlot: vi.fn(),
    restoreSlots: vi.fn(),
    removeSlot: vi.fn(),
    setRepeating: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn().mockResolvedValue({ kind: "stay" }),
    submitting: false,
    eligibilityFor: () => null,
    hasBlockingIssue: false,
    policy: CLIENT_CART_POLICY,
    batch: groups.filter((g) => g.service !== "rehab").flatMap((g) => g.slots),
    eligibilityOf: overrides.eligibilityFor ?? (() => null),
    previewStatus: "idle",
    ...overrides,
  };
}

const FULL = cartWith([group("performance", [PERF_A, PERF_B]), group("recovery", [REC]), group("rehab", [REHAB])]);

async function openSheet() {
  await userEvent.click(screen.getByRole("button", { name: "Ver tu reserva" }));
  return screen.getByRole("dialog");
}

describe("BookingCartTray", () => {
  it("renders nothing without picked slots", () => {
    const { container } = render(<BookingCartTray cart={cartWith([])} onConfirm={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });

  it("stacks one line per service and marks the one that is paid at the end", () => {
    render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);

    const summary = screen.getByRole("button", { name: "Ver tu reserva" });
    expect(Array.from(summary.querySelectorAll("li")).map((li) => li.textContent)).toEqual([
      "2 turnosPerformance",
      "1 turnoRecovery",
      "1 turnoFisioterapia!",
    ]);
    expect(screen.getByLabelText("Se paga al confirmar")).toBeDefined();
    expect(screen.queryByText("a pagar")).toBeNull();
  });

  it("keeps the browser from scrolling the page under a swipe on the card and the sheet handle", async () => {
    render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);
    const card = screen.getByRole("button", { name: "Ver tu reserva" }).closest(".fixed") as HTMLElement;
    expect(card.className).toContain("touch-none");

    const sheet = await openSheet();
    const handle = within(sheet).getByRole("heading").closest("[data-swipe-handle]") as HTMLElement;
    expect(handle.className).toContain("touch-none");
  });

  describe("pointer capture", () => {
    // jsdom has no pointer capture, so the spy stands in for the browser's.
    const setPointerCapture = vi.fn();

    beforeEach(() => {
      setPointerCapture.mockClear();
      Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
        configurable: true,
        value: setPointerCapture,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, "setPointerCapture");
    });

    it("captures a finger on the card, so the swipe keeps going when it leaves the card", () => {
      render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);
      const card = screen.getByRole("button", { name: "Ver tu reserva" }).closest(".fixed") as HTMLElement;

      fireEvent.pointerDown(card, { pointerType: "touch", pointerId: 7, clientY: 600 });

      expect(setPointerCapture).toHaveBeenCalledWith(7);
    });

    it("captures a finger on the sheet handle", async () => {
      render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);
      const sheet = await openSheet();
      const handle = within(sheet).getByRole("heading").closest("[data-swipe-handle]") as HTMLElement;

      fireEvent.pointerDown(handle, { pointerType: "touch", pointerId: 7, clientY: 100 });

      expect(setPointerCapture).toHaveBeenCalledWith(7);
    });

    it("leaves the mouse alone on the card, so its click reaches the buttons", async () => {
      const onConfirm = vi.fn();
      render(<BookingCartTray cart={FULL} onConfirm={onConfirm} />);
      const card = screen.getByRole("button", { name: "Ver tu reserva" }).closest(".fixed") as HTMLElement;

      fireEvent.pointerDown(card, { pointerType: "mouse", pointerId: 1, clientY: 600 });
      expect(setPointerCapture).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Ver tu reserva" }));
      expect(screen.getByRole("dialog")).toBeDefined();
    });

    it("leaves the mouse alone on the sheet handle, so the cross still closes it", async () => {
      render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);
      const sheet = await openSheet();
      const handle = within(sheet).getByRole("heading").closest("[data-swipe-handle]") as HTMLElement;
      setPointerCapture.mockClear();

      fireEvent.pointerDown(handle, { pointerType: "mouse", pointerId: 1, clientY: 100 });

      expect(setPointerCapture).not.toHaveBeenCalled();
    });
  });

  it("confirms from the closed card without opening the sheet", async () => {
    const onConfirm = vi.fn();
    render(<BookingCartTray cart={FULL} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("disables both confirm buttons while the cart has a known blocking issue", async () => {
    render(<BookingCartTray cart={cartWith(FULL.groups, { hasBlockingIssue: true })} onConfirm={vi.fn()} />);

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Confirmar" }).disabled).toBe(true);
    const sheet = await openSheet();
    expect(
      within(sheet).getByRole<HTMLButtonElement>("button", { name: "Confirmar reservas" }).disabled,
    ).toBe(true);
  });

  it("titles the sheet from the policy", async () => {
    const staff = staffCartPolicy({ clientName: "Sofía Pérez", clientHref: "/staff/clients/c-1", offlineRoom: null });
    render(<BookingCartTray cart={cartWith(FULL.groups, { policy: staff })} onConfirm={vi.fn()} />);

    const sheet = await openSheet();

    expect(within(sheet).getByRole("heading", { name: "Reserva para Sofía Pérez · 4 turnos" })).toBeDefined();
  });

  it("does not mark Rehab as paid later when the policy books it in the batch", () => {
    const staff = staffCartPolicy({ clientName: "Sofía Pérez", clientHref: "/staff/clients/c-1", offlineRoom: null });
    render(<BookingCartTray cart={cartWith(FULL.groups, { policy: staff })} onConfirm={vi.fn()} />);

    expect(screen.queryByLabelText("Se paga al confirmar")).toBeNull();
  });

  it("shows the blocking notice above the confirm button in the sheet", async () => {
    const text = "Viendo qué cubre su plan…";
    const policy: CartPolicy = { ...FULL.policy, blockingNotice: () => text };
    render(<BookingCartTray cart={cartWith(FULL.groups, { policy, hasBlockingIssue: true })} onConfirm={vi.fn()} />);

    const sheet = await openSheet();

    const notice = within(sheet).getByText(text);
    const button = within(sheet).getByRole("button", { name: "Confirmar reservas" });
    expect(notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens a modal sheet with the detail and the confirm button", async () => {
    render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);

    const sheet = await openSheet();

    expect(sheet.getAttribute("aria-modal")).toBe("true");
    expect(within(sheet).getByRole("heading", { name: "Tu reserva · 4 turnos" })).toBeDefined();
    expect(within(sheet).getByRole("region", { name: "Recovery" })).toBeDefined();
    expect(within(sheet).getByRole("button", { name: "Confirmar reservas" })).toBeDefined();
  });

  it("closes with the cross, Escape and the backdrop, and gives the focus back", async () => {
    render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);

    await openSheet();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ver tu reserva" }));

    await openSheet();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    await openSheet();
    fireEvent.pointerDown(screen.getByTestId("booking-sheet-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps Tab inside the sheet", async () => {
    render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);
    const sheet = await openSheet();
    const confirm = within(sheet).getByRole("button", { name: "Confirmar reservas" });

    confirm.focus();
    await userEvent.tab();

    expect(sheet.contains(document.activeElement)).toBe(true);
  });

  it("can't be closed while booking", async () => {
    const { rerender } = render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);
    await openSheet();

    rerender(<BookingCartTray cart={{ ...FULL, submitting: true }} onConfirm={vi.fn()} />);
    const busy = within(screen.getByRole("dialog")).getByRole("button", { name: "Reservando…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    await userEvent.keyboard("{Escape}");
    fireEvent.pointerDown(screen.getByTestId("booking-sheet-backdrop"));

    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("goes away when the last slot is removed with the sheet open", async () => {
    const { rerender } = render(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);
    await openSheet();

    rerender(<BookingCartTray cart={cartWith([])} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Ver tu reserva" })).toBeNull();

    rerender(<BookingCartTray cart={FULL} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
