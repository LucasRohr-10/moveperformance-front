import { act, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SnackbarProvider } from "@/components/ui/snackbar";
import type { BookableSlot, ServiceType, SlotEligibilityDto } from "@/lib/api/types";

import type { CartPolicy } from "./cart-policy";
import { CLIENT_CART_POLICY } from "./client-cart-policy";
import { createBookings } from "./create-bookings";
import { getBatchEligibility } from "./get-batch-eligibility";
import type { RepeatLimit } from "./repeat-limit";
import { type BookingCart, type ConfirmOutcome, type UseBookingCartArgs, useBookingCart } from "./use-booking-cart";

vi.mock("./create-bookings", () => ({ createBookings: vi.fn() }));
const createBookingsMock = vi.mocked(createBookings);

vi.mock("./get-batch-eligibility", () => ({ getBatchEligibility: vi.fn() }));
const getBatchEligibilityMock = vi.mocked(getBatchEligibility);

function slotAt(id: string, startsAt: string, overrides: Partial<BookableSlot> = {}): BookableSlot {
  return {
    id,
    service: "performance",
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
    durationMinutes: 60,
    capacity: 10,
    available: 5,
    isFull: false,
    alreadyBooked: false,
    ...overrides,
  };
}

// Mondays 15:00 Montevideo
const MON_26 = slotAt("mon-26", "2026-10-26T18:00:00.000Z");
const MON_02 = slotAt("mon-02", "2026-11-02T18:00:00.000Z");
const MON_09 = slotAt("mon-09", "2026-11-09T18:00:00.000Z", { available: 0, isFull: true });
const MON_16 = slotAt("mon-16", "2026-11-16T18:00:00.000Z");
const WED_28 = slotAt("wed-28", "2026-10-28T18:00:00.000Z");
const CANDIDATES = [MON_26, MON_02, MON_09, MON_16, WED_28];
const RECOVERY_27 = slotAt("rec-27", "2026-10-27T13:00:00.000Z", { service: "recovery" });
const REHAB_28 = slotAt("rehab-28", "2026-10-28T13:00:00.000Z", { service: "rehab" });
const REHAB_29 = slotAt("rehab-29", "2026-10-29T13:00:00.000Z", { service: "rehab" });

const LIMIT: RepeatLimit = { untilDate: "2026-11-21", maxSlots: null };
const LABELS: Record<ServiceType, string> = { performance: "Performance", rehab: "Fisioterapia", recovery: "Recovery" };

function setup(
  limits: Partial<Record<ServiceType, RepeatLimit | null>> = { performance: LIMIT },
  extra: Pick<UseBookingCartArgs, "policy" | "fetchEligibility" | "fetchUnpaid"> = {},
) {
  const fetchRange = vi.fn().mockResolvedValue(CANDIDATES);
  const onBooked = vi.fn();
  const hook = renderHook(
    () =>
      useBookingCart({
        limitFor: (service) => limits[service] ?? null,
        labelOf: (service) => LABELS[service],
        fetchRange,
        onBooked,
        ...extra,
      }),
    { wrapper: SnackbarProvider },
  );
  return { ...hook, fetchRange, onBooked };
}

const ids = (slots: BookableSlot[]) => slots.map((s) => s.id);
const group = (cart: BookingCart, service: ServiceType) => cart.groups.find((g) => g.service === service);
const slotsOf = (cart: BookingCart, service: ServiceType) => ids(group(cart, service)?.slots ?? []);

const book = (batch: BookableSlot[]) => createBookings(batch.map((slot) => slot.id));

async function confirmCart(cart: { current: BookingCart }): Promise<ConfirmOutcome | undefined> {
  let outcome: ConfirmOutcome | undefined;
  await act(async () => {
    outcome = await cart.current.confirm(book);
  });
  return outcome;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-19T15:00:00.000Z"));
  createBookingsMock.mockReset();
  getBatchEligibilityMock.mockReset();
  getBatchEligibilityMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useBookingCart", () => {
  it("adds and removes slots by toggling them", () => {
    const { result } = setup();

    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(WED_28));
    expect(slotsOf(result.current, "performance")).toEqual(["mon-26", "wed-28"]);

    act(() => result.current.toggleSlot(MON_26));
    expect(slotsOf(result.current, "performance")).toEqual(["wed-28"]);
    expect(result.current.isSelected("wed-28")).toBe(true);
    expect(result.current.isSelected("mon-26")).toBe(false);
  });

  it("adds several slots at once with restoreSlots, unlike calling toggleSlot repeatedly in the same tick", () => {
    const { result } = setup();

    act(() => result.current.restoreSlots([MON_26, WED_28]));

    expect(slotsOf(result.current, "performance")).toEqual(["mon-26", "wed-28"]);
  });

  it("keeps several services, in the order they were added", () => {
    const { result } = setup();

    act(() => result.current.toggleSlot(RECOVERY_27));
    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(WED_28));

    expect(result.current.groups.map((g) => g.service)).toEqual(["recovery", "performance"]);
    expect(result.current.groups.map((g) => g.label)).toEqual(["Recovery", "Performance"]);
    expect(result.current.count).toBe(3);
    expect(result.current.hasSlots("recovery")).toBe(true);
    expect(result.current.hasSlots("rehab")).toBe(false);
  });

  it("keeps a single Rehab slot and never offers to repeat it", () => {
    const { result } = setup({ performance: LIMIT, rehab: LIMIT });

    act(() => result.current.toggleSlot(REHAB_28));
    act(() => result.current.toggleSlot(REHAB_29));

    expect(slotsOf(result.current, "rehab")).toEqual(["rehab-29"]);
    expect(group(result.current, "rehab")?.canRepeat).toBe(false);
  });

  it("repeats the picked pattern of its service up to the limit and warns about full slots", async () => {
    const { result, fetchRange } = setup();
    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(RECOVERY_27));

    await act(() => result.current.setRepeating("performance", true));

    expect(fetchRange).toHaveBeenCalledWith("performance", "2026-10-19", "2026-11-21");
    const performance = group(result.current, "performance");
    expect(performance?.isRepeating).toBe(true);
    expect(performance?.repeatUntil).toBe("2026-11-21");
    expect(slotsOf(result.current, "performance")).toEqual(["mon-26", "mon-02", "mon-16"]);
    expect(slotsOf(result.current, "recovery")).toEqual(["rec-27"]);
    expect(screen.getByRole("status").textContent).toContain("No hay lugar en algunas semanas");
    expect(screen.getByRole("listitem").textContent).toBe("No se pudo agendar el lun 9 nov a las 15:00");
  });

  it("goes back to the hand-picked slots when repeating is turned off", async () => {
    const { result } = setup();
    act(() => result.current.toggleSlot(MON_26));
    await act(() => result.current.setRepeating("performance", true));

    await act(() => result.current.setRepeating("performance", false));

    expect(slotsOf(result.current, "performance")).toEqual(["mon-26"]);
    expect(group(result.current, "performance")?.isRepeating).toBe(false);
  });

  it("removes a single date while repeating and keeps the phrase", async () => {
    const { result } = setup();
    act(() => result.current.toggleSlot(MON_26));
    await act(() => result.current.setRepeating("performance", true));
    const phrase = group(result.current, "performance")?.phrase;

    act(() => result.current.removeSlot(MON_02));

    expect(slotsOf(result.current, "performance")).toEqual(["mon-26", "mon-16"]);
    expect(group(result.current, "performance")?.phrase).toBe(phrase);
  });

  it("drops a repeating service once every one of its slots is removed", async () => {
    const { result } = setup();
    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(REHAB_28));
    await act(() => result.current.setRepeating("performance", true));

    for (const slot of [MON_26, MON_02, MON_16]) act(() => result.current.removeSlot(slot));

    expect(result.current.groups.map((g) => g.service)).toEqual(["rehab"]);
    expect(result.current.hasSlots("performance")).toBe(false);
    expect(result.current.count).toBe(1);
  });

  it("keeps only the nearest slots when the limit has a maximum", async () => {
    const { result } = setup({ recovery: { untilDate: "2026-11-21", maxSlots: 2 } });
    act(() => result.current.toggleSlot({ ...MON_26, service: "recovery" }));

    await act(() => result.current.setRepeating("recovery", true));

    expect(slotsOf(result.current, "recovery")).toEqual(["mon-26", "mon-02"]);
  });

  it("books everything but Rehab in one batch and offers the bookings list", async () => {
    createBookingsMock.mockResolvedValue({ booked: [], failed: [] });
    const { result, onBooked } = setup();
    act(() => result.current.toggleSlot(WED_28));
    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(RECOVERY_27));

    const outcome = await confirmCart(result);

    expect(outcome).toEqual({ kind: "stay" });
    expect(createBookingsMock).toHaveBeenCalledWith(["mon-26", "rec-27", "wed-28"]);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("3 turnos reservados");
    expect(status.textContent).not.toContain("Performance y Recovery");
    expect(screen.getByRole("link", { name: "Ver mis reservas" }).getAttribute("href")).toBe("/dashboard?bookings=open");
    expect(result.current.count).toBe(0);
    expect(onBooked).toHaveBeenCalledTimes(1);
  });

  it("books the others first and then sends Rehab to the checkout", async () => {
    createBookingsMock.mockResolvedValue({ booked: [], failed: [] });
    const { result } = setup();
    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(REHAB_28));

    const outcome = await confirmCart(result);

    expect(createBookingsMock).toHaveBeenCalledWith(["mon-26"]);
    expect(outcome).toEqual({ kind: "checkout", slot: REHAB_28 });
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Turno reservado");
    expect(status.textContent).toContain("Ahora pagá tu turno de Fisioterapia.");
    expect(screen.queryByRole("link", { name: "Ver mis reservas" })).toBeNull();
  });

  it("goes straight to the checkout with only Rehab", async () => {
    const { result } = setup();
    act(() => result.current.toggleSlot(REHAB_28));

    const outcome = await confirmCart(result);

    expect(outcome).toEqual({ kind: "checkout", slot: REHAB_28 });
    expect(createBookingsMock).not.toHaveBeenCalled();
  });

  it("shows what was booked and why a slot failed in two snackbars, and leaves only Rehab in the cart", async () => {
    createBookingsMock.mockResolvedValue({
      booked: [],
      failed: [{ timeSlotId: "rec-27", code: "SLOT_FULL", message: "Ya no hay lugar." }],
    });
    const { result } = setup();
    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(RECOVERY_27));
    act(() => result.current.toggleSlot(REHAB_28));

    const outcome = await confirmCart(result);

    expect(outcome).toEqual({ kind: "stay" });
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Turno reservado");
    expect(screen.getByRole("link", { name: "Ver mis reservas" }).getAttribute("href")).toBe("/dashboard?bookings=open");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("1 turno no se pudo reservar");
    expect(screen.getByRole("listitem").textContent).toBe("Recovery · Mar 27 · 10:00");
    expect(alert.textContent).toContain("Ya no hay lugar.");
    expect(screen.queryByRole("link", { name: "Ver planes" })).toBeNull();
    expect(result.current.groups.map((g) => g.service)).toEqual(["rehab"]);
  });

  it("offers to pay the session when every failure needs a package, linking to that slot's checkout", async () => {
    createBookingsMock.mockResolvedValue({
      booked: [],
      failed: [{ timeSlotId: "rec-27", code: "PACKAGE_REQUIRED", message: "Necesitás un paquete." }],
    });
    const { result } = setup();
    act(() => result.current.toggleSlot(RECOVERY_27));

    await confirmCart(result);

    const link = screen.getByRole("link", { name: "Pagar esta sesión" });
    expect(link.getAttribute("href")).toBe("/checkout/reserva?service=recovery&date=2026-10-27&slot=rec-27");
  });

  it("offers the plans when the failure is a missing plan", async () => {
    createBookingsMock.mockResolvedValue({
      booked: [],
      failed: [{ timeSlotId: "mon-26", code: "PLAN_REQUIRED", message: "Necesitás un plan activo." }],
    });
    const { result } = setup();
    act(() => result.current.toggleSlot(MON_26));

    await confirmCart(result);

    expect(screen.getByRole("link", { name: "Ver planes" }).getAttribute("href")).toBe("/plans");
  });

  it("puts every reason in one red snackbar, each with its turns, its note and its own action, above the green one", async () => {
    createBookingsMock.mockResolvedValue({
      booked: [],
      failed: [
        { timeSlotId: "mon-26", code: "PLAN_REQUIRED", message: "Necesitás un plan activo." },
        { timeSlotId: "rec-27", code: "PACKAGE_REQUIRED", message: "Necesitás un paquete." },
        { timeSlotId: "wed-28", code: "SLOT_FULL", message: "No quedan cupos para este turno." },
      ],
    });
    const { result } = setup();
    [MON_26, RECOVERY_27, WED_28, MON_02].forEach((slot) => act(() => result.current.toggleSlot(slot)));

    await confirmCart(result);

    const roles = Array.from(document.querySelectorAll('[role="alert"],[role="status"]')).map((node) =>
      node.getAttribute("role"),
    );
    expect(roles).toEqual(["alert", "status"]);
    const alert = screen.getByRole("alert");
    expect(alert.querySelector("[data-snackbar-title]")?.textContent).toBe("3 turnos no se pudieron reservar");
    const text = alert.textContent ?? "";
    const order = [
      "Performance · Lun 26 · 15:00",
      "Necesitás un plan activo.",
      "Recovery · Mar 27 · 10:00",
      "Necesitás un paquete.",
      "Performance · Mié 28 · 15:00",
      "No quedan cupos para este turno.",
    ].map((part) => text.indexOf(part));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(within(alert).getAllByRole("link").map((link) => link.textContent)).toEqual(["Ver planes", "Pagar esta sesión"]);
  });

  it("shows only the red snackbar when every slot fails", async () => {
    createBookingsMock.mockResolvedValue({
      booked: [],
      failed: [
        { timeSlotId: "mon-26", code: "SLOT_FULL", message: "Completo" },
        { timeSlotId: "wed-28", code: "SLOT_FULL", message: "Completo" },
      ],
    });
    const { result, onBooked } = setup();
    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(WED_28));

    await confirmCart(result);

    expect(screen.getByRole("alert").textContent).toContain("2 turnos no se pudieron reservar");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(result.current.count).toBe(0);
    expect(onBooked).toHaveBeenCalledTimes(1);
  });

  it("keeps the cart and says so when the whole request fails", async () => {
    createBookingsMock.mockRejectedValue(new Error("network"));
    const { result, onBooked } = setup();
    act(() => result.current.toggleSlot(MON_26));
    act(() => result.current.toggleSlot(REHAB_28));

    const outcome = await confirmCart(result);

    expect(outcome).toEqual({ kind: "stay" });
    expect(result.current.count).toBe(2);
    expect(screen.getByRole("alert").textContent).toContain("No pudimos reservar. Probá de nuevo.");
    expect(onBooked).not.toHaveBeenCalled();
  });

  it("sends a single request on a double confirm", async () => {
    createBookingsMock.mockResolvedValue({ booked: [], failed: [] });
    const { result } = setup();
    act(() => result.current.toggleSlot(MON_26));

    await act(async () => {
      await Promise.all([result.current.confirm(book), result.current.confirm(book)]);
    });

    expect(createBookingsMock).toHaveBeenCalledTimes(1);
  });

  describe("eligibility preview", () => {
    it("previews the cart's slots in the order they would be sent to confirm", async () => {
      getBatchEligibilityMock.mockResolvedValue([]);
      const { result } = setup();
      act(() => result.current.toggleSlot(WED_28));
      act(() => result.current.toggleSlot(MON_26));

      await waitFor(() => expect(getBatchEligibilityMock).toHaveBeenCalledWith(["mon-26", "wed-28"]));
    });

    it("does not preview a cart with only a checkout-first (Rehab) slot", async () => {
      const { result } = setup();
      act(() => result.current.toggleSlot(REHAB_28));

      await act(async () => {});
      expect(getBatchEligibilityMock).not.toHaveBeenCalled();
    });

    it("exposes each slot's verdict once the preview resolves", async () => {
      const verdicts: SlotEligibilityDto[] = [{ timeSlotId: "mon-26", covered: false, reason: "PLAN_REQUIRED" }];
      getBatchEligibilityMock.mockResolvedValue(verdicts);
      const { result } = setup();
      act(() => result.current.toggleSlot(MON_26));

      await waitFor(() => expect(result.current.eligibilityFor("mon-26")).toEqual(verdicts[0]));
      expect(result.current.eligibilityFor("wed-28")).toBeNull();
    });

    it("flags a blocking issue when any previewed slot is not covered", async () => {
      getBatchEligibilityMock.mockResolvedValue([
        { timeSlotId: "mon-26", covered: false, reason: "PLAN_REQUIRED" },
      ]);
      const { result } = setup();
      act(() => result.current.toggleSlot(MON_26));

      await waitFor(() => expect(result.current.hasBlockingIssue).toBe(true));
    });

    it("has no blocking issue once the uncovered slot is removed from the cart", async () => {
      getBatchEligibilityMock.mockResolvedValueOnce([
        { timeSlotId: "mon-26", covered: false, reason: "PLAN_REQUIRED" },
      ]);
      const { result } = setup();
      act(() => result.current.toggleSlot(MON_26));
      await waitFor(() => expect(result.current.hasBlockingIssue).toBe(true));

      getBatchEligibilityMock.mockResolvedValueOnce([]);
      act(() => result.current.removeSlot(MON_26));

      await waitFor(() => expect(result.current.hasBlockingIssue).toBe(false));
    });

    it("refuses to confirm while a blocking issue is present, without calling createBookings", async () => {
      getBatchEligibilityMock.mockResolvedValue([
        { timeSlotId: "mon-26", covered: false, reason: "PLAN_REQUIRED" },
      ]);
      const { result } = setup();
      act(() => result.current.toggleSlot(MON_26));
      await waitFor(() => expect(result.current.hasBlockingIssue).toBe(true));

      const outcome = await confirmCart(result);

      expect(outcome).toEqual({ kind: "stay" });
      expect(createBookingsMock).not.toHaveBeenCalled();
    });

    it("does not block on a null verdict (e.g. preview still loading, or not applicable)", async () => {
      getBatchEligibilityMock.mockResolvedValue([{ timeSlotId: "mon-26", covered: null, reason: "NOT_APPLICABLE" }]);
      const { result } = setup();
      act(() => result.current.toggleSlot(MON_26));

      await waitFor(() => expect(result.current.eligibilityFor("mon-26")).not.toBeNull());
      expect(result.current.hasBlockingIssue).toBe(false);
    });
  });
  describe("policy", () => {
    const STAFF_POLICY: CartPolicy = {
      ...CLIENT_CART_POLICY,
      title: "Reserva para Sofía Pérez",
      inBatch: () => true,
      allowsMulti: () => true,
      blockingNotice: (state) => (state.batch.length > 1 ? "Quitá un turno." : null),
      bookedAction: { label: "Ver ficha", href: "/staff/clients/c-1" },
      failureActions: () => [],
    };

    it("uses the client policy by default", () => {
      const { result } = setup();

      expect(result.current.policy).toBe(CLIENT_CART_POLICY);
    });

    it("asks the injected fetchEligibility in the cart order", async () => {
      const fetchEligibility = vi.fn().mockResolvedValue([{ timeSlotId: "mon-26", covered: true, reason: null }]);
      const { result } = setup({ performance: LIMIT }, { fetchEligibility });
      act(() => result.current.toggleSlot(WED_28));
      act(() => result.current.toggleSlot(MON_26));

      await waitFor(() => expect(fetchEligibility).toHaveBeenCalledWith(["mon-26", "wed-28"]));
      await waitFor(() => expect(result.current.eligibilityOf("mon-26")?.covered).toBe(true));
      expect(getBatchEligibilityMock).not.toHaveBeenCalled();
      expect(result.current.batch.map((slot) => slot.id)).toEqual(["mon-26", "wed-28"]);
    });

    it("tells the preview status while the verdicts load", async () => {
      let resolve: (value: SlotEligibilityDto[]) => void = () => {};
      const fetchEligibility = vi.fn().mockReturnValue(new Promise<SlotEligibilityDto[]>((r) => (resolve = r)));
      const { result } = setup({ performance: LIMIT }, { fetchEligibility });
      expect(result.current.previewStatus).toBe("idle");

      act(() => result.current.toggleSlot(MON_26));
      expect(result.current.previewStatus).toBe("loading");

      await act(async () => resolve([]));
      expect(result.current.previewStatus).toBe("ready");
    });

    it("reports a failed preview", async () => {
      const fetchEligibility = vi.fn().mockRejectedValue(new Error("network"));
      const { result } = setup({ performance: LIMIT }, { fetchEligibility });

      act(() => result.current.toggleSlot(MON_26));

      await waitFor(() => expect(result.current.previewStatus).toBe("error"));
    });

    it("takes the blocking notice and the booked action from the policy", async () => {
      createBookingsMock.mockResolvedValue({ booked: [], failed: [] });
      const { result } = setup({ performance: LIMIT }, { policy: STAFF_POLICY });
      act(() => result.current.toggleSlot(MON_26));
      act(() => result.current.toggleSlot(WED_28));
      await waitFor(() => expect(result.current.hasBlockingIssue).toBe(true));
      expect(await confirmCart(result)).toEqual({ kind: "stay" });
      expect(createBookingsMock).not.toHaveBeenCalled();

      act(() => result.current.removeSlot(WED_28));
      await waitFor(() => expect(result.current.hasBlockingIssue).toBe(false));
      await confirmCart(result);

      expect(screen.getByRole("link", { name: "Ver ficha" }).getAttribute("href")).toBe("/staff/clients/c-1");
      expect(screen.queryByRole("link", { name: "Ver mis reservas" })).toBeNull();
    });

    it("books Rehab with the rest when the policy puts it in the batch", async () => {
      createBookingsMock.mockResolvedValue({ booked: [], failed: [] });
      const { result } = setup({ performance: LIMIT }, { policy: { ...STAFF_POLICY, blockingNotice: () => null } });
      act(() => result.current.toggleSlot(MON_26));
      act(() => result.current.toggleSlot(REHAB_28));
      act(() => result.current.toggleSlot(REHAB_29));

      const outcome = await confirmCart(result);

      expect(outcome).toEqual({ kind: "stay" });
      expect(createBookingsMock).toHaveBeenCalledWith(["mon-26", "rehab-28", "rehab-29"]);
      expect(result.current.count).toBe(0);
    });

    it("shows the limit failure message per slot", async () => {
      createBookingsMock.mockResolvedValue({
        booked: [],
        failed: [
          {
            timeSlotId: "rec-27",
            code: "OFFLINE_CHARGE_LIMIT_REACHED",
            message: "Ya tiene 2 reservas por fuera sin cobrar.",
          },
        ],
      });
      const { result } = setup({ performance: LIMIT }, { policy: { ...STAFF_POLICY, blockingNotice: () => null } });
      act(() => result.current.toggleSlot(MON_26));
      act(() => result.current.toggleSlot(RECOVERY_27));

      await confirmCart(result);

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("1 turno no se pudo reservar");
      expect(alert.textContent).toContain("Recovery · Mar 27 · 10:00");
      expect(alert.textContent).toContain("Ya tiene 2 reservas por fuera sin cobrar.");
      expect(within(alert).queryAllByRole("link")).toHaveLength(0);
      expect(screen.getByRole("link", { name: "Ver ficha" })).toBeDefined();
    });
  });

  describe("the client reached the unpaid cap", () => {
    const UNPAID_FAILURE = { code: "UNPAID_LIMIT_REACHED", message: "Llegaste al máximo de cosas sin pagar en MOVE." };
    const UNPAID = {
      count: 2,
      limit: 2,
      items: [
        // The labels the API really sends: the plan's name, and a turn named by its service, with no date.
        { purchaseId: "p1", kind: "plan" as const, label: "Mensual", amount: 2700, startsAt: null },
        { purchaseId: "p1", kind: "plan_booking" as const, label: "Entrenamiento semi personalizado", amount: null, startsAt: "2026-11-10T22:00:00.000Z" },
      ],
    };

    async function confirmWithFailures(failed: { timeSlotId: string; code: string; message: string }[], fetchUnpaid: UseBookingCartArgs["fetchUnpaid"]) {
      createBookingsMock.mockResolvedValue({ booked: [], failed });
      const { result } = setup({ performance: LIMIT }, { fetchUnpaid });
      act(() => result.current.toggleSlot(MON_26));
      act(() => result.current.toggleSlot(WED_28));
      await confirmCart(result);
    }

    it("explains it in its own snackbar, with what the client owes", async () => {
      const fetchUnpaid = vi.fn().mockResolvedValue(UNPAID);

      await confirmWithFailures([{ timeSlotId: "wed-28", ...UNPAID_FAILURE }], fetchUnpaid);

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("No podés reservar hasta pagar");
      expect(alert.textContent).toContain("Tenés 2 cosas sin pagar en MOVE, que es el máximo:");
      expect(alert.textContent).toContain("Mensual · $ 2.700");
      expect(alert.textContent).toContain("Turno del martes 10/11, 19:00");
      expect(alert.textContent).toContain("Cuando Staff registre el pago vas a poder reservar de nuevo.");
      expect(alert.textContent).not.toContain("no se pudo reservar");
      expect(fetchUnpaid).toHaveBeenCalledTimes(1);
    });

    it("keeps the other failures in their own snackbar", async () => {
      const failed = [
        { timeSlotId: "mon-26", code: "SLOT_FULL", message: "Completo" },
        { timeSlotId: "wed-28", ...UNPAID_FAILURE },
      ];

      await confirmWithFailures(failed, vi.fn().mockResolvedValue(UNPAID));

      await screen.findByText("No podés reservar hasta pagar");
      const alerts = screen.getAllByRole("alert");
      expect(alerts).toHaveLength(2);
      expect(alerts.map((alert) => alert.textContent).join("|")).toContain("1 turno no se pudo reservar");
      const generic = alerts.find((alert) => alert.textContent?.includes("1 turno no se pudo reservar"));
      expect(generic?.textContent).toContain("Completo");
      expect(generic?.textContent).not.toContain("Wed");
      expect(generic?.textContent).not.toContain("Llegaste al máximo");
    });

    it("shows only the message of the API when the amounts cannot be read", async () => {
      await confirmWithFailures([{ timeSlotId: "wed-28", ...UNPAID_FAILURE }], vi.fn().mockRejectedValue(new Error("boom")));

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("No podés reservar hasta pagar");
      expect(alert.textContent).toContain("Llegaste al máximo de cosas sin pagar en MOVE.");
      expect(alert.textContent).not.toContain("Cuando Staff registre");
      expect(within(alert).queryAllByRole("listitem")).toHaveLength(0);
    });

    it("does not ask for the amounts when no slot failed for the cap", async () => {
      const fetchUnpaid = vi.fn();

      await confirmWithFailures([{ timeSlotId: "wed-28", code: "SLOT_FULL", message: "Completo" }], fetchUnpaid);

      expect(fetchUnpaid).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain("1 turno no se pudo reservar");
    });
  });
});
