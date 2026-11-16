import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookableSlot } from "@/lib/api/types";

import { BookingGridMobile } from "./booking-grid-mobile";
import { CLIENT_CART_POLICY } from "./client-cart-policy";
import { summarizeDay } from "./slots";
import { staffCartPolicy } from "./staff/staff-cart-policy";
import type { BookingGridViewProps } from "./types";
import type { BookingCart, ServiceCartGroup } from "./use-booking-cart";

const SLOT: BookableSlot = {
  id: "slot-1",
  service: "rehab",
  startsAt: "2026-10-16T12:00:00.000Z",
  endsAt: "2026-10-16T12:45:00.000Z",
  durationMinutes: 45,
  capacity: 1,
  available: 1,
  isFull: false,
  alreadyBooked: false,
};

function rehabGroup(overrides: Partial<ServiceCartGroup> = {}): ServiceCartGroup {
  return {
    service: "rehab",
    label: "Fisioterapia",
    slots: [SLOT],
    isRepeating: false,
    canRepeat: false,
    repeatUntil: null,
    phrase: null,
    ...overrides,
  };
}

function baseCart(overrides: Partial<BookingCart> = {}): BookingCart {
  const groups = overrides.groups ?? [];
  return {
    groups,
    count: groups.reduce((total, group) => total + group.slots.length, 0),
    userId: null,
    isSelected: (id) => groups.some((group) => group.slots.some((slot) => slot.id === id)),
    hasSlots: (service) => groups.some((group) => group.service === service),
    toggleSlot: vi.fn(),
    restoreSlots: vi.fn(),
    removeSlot: vi.fn(),
    setRepeating: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn().mockResolvedValue({ kind: "stay" }),
    submitting: false,
    eligibilityFor: () => null,
    hasBlockingIssue: false,
    policy: CLIENT_CART_POLICY,
    batch: groups.filter((group) => group.service !== "rehab").flatMap((group) => group.slots),
    eligibilityOf: () => null,
    previewStatus: "idle",
    ...overrides,
  };
}

function baseProps(overrides: Partial<BookingGridViewProps> = {}): BookingGridViewProps {
  const days = Array.from({ length: 7 }, (_, i) =>
    summarizeDay(`2026-10-${16 + i}`, "2026-10-16", i === 0 ? [SLOT] : []),
  );
  return {
    service: "rehab",
    services: [{ value: "rehab", label: "Fisioterapia", title: "Evaluación y Diagnóstico" }],
    onChangeService: vi.fn(),
    weekLabel: "16 – 22 OCT",
    atFirstWeek: true,
    atLastWeek: false,
    onPrevWeek: vi.fn(),
    onNextWeek: vi.fn(),
    days,
    dayIndex: 0,
    onSelectDay: vi.fn(),
    groups: [{ label: "Mañana", slots: [SLOT] }],
    rows: [],
    cart: baseCart(),
    onToggleSlot: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
}

describe("BookingGridMobile", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hands the tapped slot to the cart", async () => {
    const user = userEvent.setup({ delay: null });
    const onToggleSlot = vi.fn();
    render(<BookingGridMobile {...baseProps({ onToggleSlot })} />);

    await user.click(screen.getByText("09:00"));

    expect(onToggleSlot).toHaveBeenCalledWith(SLOT);
  });

  it("words the row's hint with the cart policy: client by default, Staff's under the staff policy", () => {
    const uncovered = { ...SLOT, service: "recovery" as const, eligibility: { covered: false, reason: "PACKAGE_REQUIRED" as const } };
    const props = baseProps({ groups: [{ label: "Mañana", slots: [uncovered] }] });
    const { unmount } = render(<BookingGridMobile {...props} />);

    expect(screen.getByText("Pagás esta sesión")).toBeDefined();
    unmount();

    const staff = staffCartPolicy({ clientName: "Ana", clientHref: "/staff/clients/c1", offlineRoom: null });
    render(<BookingGridMobile {...props} cart={baseCart({ policy: staff })} />);

    expect(screen.getByText("Se cobra por fuera")).toBeDefined();
    expect(screen.queryByText("Pagás esta sesión")).toBeNull();
  });

  it("shows no cart until a slot is picked", () => {
    render(<BookingGridMobile {...baseProps()} />);

    expect(screen.queryByRole("button", { name: "Ver tu reserva" })).toBeNull();
    expect(screen.queryByText("Tu reserva")).toBeNull();
  });

  it("floats the cart at the bottom and opens the detail with a trash button per slot", async () => {
    const user = userEvent.setup({ delay: null });
    const removeSlot = vi.fn();
    render(<BookingGridMobile {...baseProps({ cart: baseCart({ groups: [rehabGroup()], removeSlot }) })} />);

    await user.click(screen.getByRole("button", { name: "Ver tu reserva" }));
    await user.click(screen.getByRole("button", { name: "Quitar Vie 16 · 09:00–09:45" }));

    expect(removeSlot).toHaveBeenCalledWith(SLOT);
  });

  it("marks the tab of a service with picked slots", () => {
    render(<BookingGridMobile {...baseProps({ cart: baseCart({ groups: [rehabGroup()] }) })} />);

    expect(screen.getByRole("button", { name: /^Fisioterapia/ }).textContent).toContain("con turnos elegidos");
  });

  it("does not let the client select an already-full or already-booked slot", () => {
    const fullSlot: BookableSlot = { ...SLOT, id: "slot-2", isFull: true, available: 0 };
    render(<BookingGridMobile {...baseProps({ groups: [{ label: "Mañana", slots: [fullSlot] }] })} />);

    expect(screen.getByText("Completo")).toBeDefined();
    const button = screen.getByText("09:00").closest("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
