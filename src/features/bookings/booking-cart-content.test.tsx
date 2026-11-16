import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BookableSlot, ServiceType } from "@/lib/api/types";

import { CLIENT_CART_POLICY } from "./client-cart-policy";
import { BookingCartCard } from "./booking-cart-card";
import { BookingCartContent, confirmLabel } from "./booking-cart-content";
import { staffCartPolicy } from "./staff/staff-cart-policy";
import type { CartPolicy } from "./cart-policy";
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

// 09:05 and 10:10 Montevideo on Monday 26, 10:00 on Tuesday 27 and Wednesday 28.
const MON_A = slotAt("mon-a", "performance", "2026-10-26T12:05:00.000Z");
const MON_B = slotAt("mon-b", "performance", "2026-10-26T13:10:00.000Z");
const REC = slotAt("rec", "recovery", "2026-10-27T13:00:00.000Z");
const REHAB = slotAt("rehab", "rehab", "2026-10-28T13:00:00.000Z");

const LABELS: Record<ServiceType, string> = { performance: "Performance", rehab: "Fisioterapia", recovery: "Recovery" };

function group(service: ServiceType, slots: BookableSlot[], overrides: Partial<ServiceCartGroup> = {}): ServiceCartGroup {
  return {
    service,
    label: LABELS[service],
    slots,
    isRepeating: false,
    canRepeat: false,
    repeatUntil: null,
    phrase: null,
    ...overrides,
  };
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

describe("BookingCartContent", () => {
  it("shows one section per service, in the cart's order, with its count", () => {
    render(<BookingCartContent cart={cartWith([group("recovery", [REC]), group("performance", [MON_A, MON_B])])} />);

    const sections = screen.getAllByRole("region");
    expect(sections.map((section) => section.getAttribute("aria-label"))).toEqual(["Recovery", "Performance"]);
    expect(within(sections[0]).getByText("1 turno")).toBeDefined();
    expect(within(sections[1]).getByText("2 turnos")).toBeDefined();
  });

  it("shows a day once for its slots and removes a slot with the trash button", async () => {
    const removeSlot = vi.fn();
    render(<BookingCartContent cart={cartWith([group("performance", [MON_A, MON_B])], { removeSlot })} />);

    expect(screen.getAllByText("LUN")).toHaveLength(1);
    expect(screen.getAllByText("26")).toHaveLength(1);
    expect(screen.getByText("09:05–10:05")).toBeDefined();
    expect(screen.getByText("10:10–11:10")).toBeDefined();

    const trash = screen.getByRole("button", { name: "Quitar Lun 26 · 09:05–10:05" });
    expect(trash.querySelector("svg")).not.toBeNull();
    expect(trash.textContent).not.toContain("×");
    await userEvent.click(trash);
    expect(removeSlot).toHaveBeenCalledWith(MON_A);
  });

  it("offers the weekly toggle only where the service allows it", async () => {
    const setRepeating = vi.fn().mockResolvedValue(undefined);
    render(
      <BookingCartContent
        cart={cartWith(
          [group("performance", [MON_A], { canRepeat: true, repeatUntil: "2026-11-22" }), group("recovery", [REC])],
          { setRepeating },
        )}
      />,
    );

    const toggles = screen.getAllByRole("switch", { name: "Repetir cada semana" });
    expect(toggles).toHaveLength(1);
    expect(screen.getByText("Hasta el 22 nov")).toBeDefined();
    await userEvent.click(toggles[0]);
    expect(setRepeating).toHaveBeenCalledWith("performance", true);
  });

  it("tells that Fisioterapia is paid after the other services", () => {
    render(
      <BookingCartContent
        cart={cartWith([group("performance", [MON_A]), group("recovery", [REC]), group("rehab", [REHAB])])}
      />,
    );

    expect(screen.getByText("Después de confirmar Performance y Recovery, te llevamos a pagar este turno.")).toBeDefined();
  });

  it("has no pay note when Fisioterapia is alone", () => {
    render(<BookingCartContent cart={cartWith([group("rehab", [REHAB])])} />);

    expect(screen.queryByText(/te llevamos a pagar/)).toBeNull();
  });

  it("offers the action alone when it already says what the reason says", () => {
    render(
      <BookingCartContent
        cart={cartWith([group("recovery", [REC])], {
          eligibilityFor: (id) =>
            id === "rec" ? { timeSlotId: "rec", covered: false, reason: "PACKAGE_REQUIRED" } : null,
        })}
      />,
    );

    const link = screen.getByRole("link", { name: "Pagar esta sesión" });
    expect(link.getAttribute("href")).toBe("/checkout/reserva?service=recovery&date=2026-10-27&slot=rec");
    expect(screen.queryByText("Pagás esta sesión")).toBeNull();
  });

  it("keeps the reason next to its action when the two say different things", () => {
    render(
      <BookingCartContent
        cart={cartWith([group("performance", [MON_A])], {
          eligibilityFor: (id) =>
            id === "mon-a" ? { timeSlotId: "mon-a", covered: false, reason: "PLAN_REQUIRED" } : null,
        })}
      />,
    );

    expect(screen.getByText("Requiere un plan")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver planes" })).toBeDefined();
  });

  it("shows no warning for a covered or not-yet-known slot", () => {
    render(
      <BookingCartContent
        cart={cartWith([group("performance", [MON_A])], {
          eligibilityFor: () => ({ timeSlotId: "mon-a", covered: true, reason: null }),
        })}
      />,
    );

    expect(screen.queryByText("Incluido en tu plan")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

const RED_DOT = ".bg-\\[\\#e3262f\\]";

describe("BookingCartContent with a policy", () => {
  const STAFF = staffCartPolicy({ clientName: "Sofía Pérez", clientHref: "/staff/clients/c-1", offlineRoom: null });

  it("shows the policy's coverage line per slot and no pay links for staff", () => {
    render(
      <BookingCartContent
        cart={cartWith([group("recovery", [REC]), group("performance", [MON_A])], {
          policy: STAFF,
          eligibilityFor: (id) =>
            id === "rec"
              ? { timeSlotId: "rec", covered: false, reason: "PACKAGE_REQUIRED" }
              : { timeSlotId: id, covered: true, reason: null },
        })}
      />,
    );

    expect(screen.getByText("Se cobra por fuera")).toBeDefined();
    expect(screen.getByText("Incluido en su plan")).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
    expect(document.querySelector(RED_DOT)).toBeNull();
  });

  it("colours the coverage line: green when the plan covers it, amber when it is charged outside, grey for the client", () => {
    const { unmount } = render(
      <BookingCartContent
        cart={cartWith([group("recovery", [REC]), group("performance", [MON_A])], {
          policy: STAFF,
          eligibilityFor: (id) =>
            id === "rec"
              ? { timeSlotId: "rec", covered: false, reason: "PACKAGE_REQUIRED" }
              : { timeSlotId: id, covered: true, reason: null },
        })}
      />,
    );

    expect(screen.getByText("Se cobra por fuera").className).toContain("text-warning");
    expect(screen.getByText("Incluido en su plan").className).toContain("text-success");
    unmount();

    render(
      <BookingCartContent
        cart={cartWith([group("performance", [MON_A])], {
          eligibilityFor: () => ({ timeSlotId: "mon-a", covered: false, reason: "PLAN_REQUIRED" }),
        })}
      />,
    );

    const clientLine = screen.getByText("Requiere un plan");
    expect(clientLine.className).toContain("text-[#8a8a8a]");
    expect(clientLine.className).not.toMatch(/text-(success|warning)/);
  });

  it("marks the slot holding the confirm button back with a red dot for the client only", () => {
    const uncovered = (id: string) => ({ timeSlotId: id, covered: false as const, reason: "PLAN_REQUIRED" as const });

    const { unmount } = render(
      <BookingCartContent cart={cartWith([group("performance", [MON_A])], { eligibilityFor: uncovered })} />,
    );
    expect(document.querySelector(RED_DOT)).not.toBeNull();
    unmount();

    render(<BookingCartContent cart={cartWith([group("performance", [MON_A])], { policy: STAFF, eligibilityFor: uncovered })} />);
    expect(document.querySelector(RED_DOT)).toBeNull();
  });

  it("renders the slot extra under each slot when given", () => {
    render(
      <BookingCartContent
        cart={cartWith([group("performance", [MON_A, MON_B])])}
        renderSlotExtra={(slot) => <span>extra de {slot.id}</span>}
      />,
    );

    expect(screen.getByText("extra de mon-a")).toBeDefined();
    expect(screen.getByText("extra de mon-b")).toBeDefined();
  });

  it("does not render an extra by default", () => {
    render(<BookingCartContent cart={cartWith([group("performance", [MON_A])])} />);

    expect(screen.queryByText(/extra de/)).toBeNull();
  });

  it("does not send Rehab to a later checkout when the policy books it in the batch", () => {
    const cart = cartWith([group("performance", [MON_A]), group("rehab", [REHAB])], { policy: STAFF });

    render(<BookingCartContent cart={cart} />);

    expect(screen.queryByText(/te llevamos a pagar/)).toBeNull();
    expect(confirmLabel(cart)).toBe("Confirmar reservas");
    expect(confirmLabel(cartWith([group("rehab", [REHAB])], { policy: STAFF }))).toBe("Confirmar reservas");
  });
});

describe("BookingCartCard", () => {
  const blocking = (text: string | null): CartPolicy => ({ ...CLIENT_CART_POLICY, blockingNotice: () => text });

  it("titles the cart from the policy", () => {
    const staff = staffCartPolicy({ clientName: "Sofía Pérez", clientHref: "/staff/clients/c-1", offlineRoom: null });
    const { rerender } = render(<BookingCartCard cart={cartWith([group("performance", [MON_A])], { policy: staff })} onConfirm={vi.fn()} />);

    expect(screen.getByText("Reserva para Sofía Pérez")).toBeDefined();

    rerender(<BookingCartCard cart={cartWith([group("performance", [MON_A])])} onConfirm={vi.fn()} />);
    expect(screen.getByText("Tu reserva")).toBeDefined();
  });

  it("shows the blocking notice above the button", () => {
    const text = "Le queda 1 lugar para reservas por fuera. Quitá 2 turnos que se cobran por fuera.";
    render(
      <BookingCartCard
        cart={cartWith([group("performance", [MON_A])], { policy: blocking(text), hasBlockingIssue: true })}
        onConfirm={vi.fn()}
      />,
    );

    const notice = screen.getByText(text);
    const button = screen.getByRole("button", { name: "Confirmar reservas" });
    expect(notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows no notice when the policy does not block, or blocks without a text", () => {
    const { rerender } = render(
      <BookingCartCard cart={cartWith([group("performance", [MON_A])], { policy: blocking(null) })} onConfirm={vi.fn()} />,
    );
    expect(screen.queryByRole("status")).toBeNull();

    rerender(
      <BookingCartCard cart={cartWith([group("performance", [MON_A])], { policy: blocking("") })} onConfirm={vi.fn()} />,
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("confirmLabel", () => {
  it("goes to pay when only Fisioterapia is in the cart", () => {
    expect(confirmLabel(cartWith([group("rehab", [REHAB])]))).toBe("Ir a pagar");
    expect(confirmLabel(cartWith([group("performance", [MON_A]), group("rehab", [REHAB])]))).toBe("Confirmar reservas");
  });
});
