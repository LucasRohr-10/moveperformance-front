import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bookingCheckoutHref } from "@/features/checkout/checkout-routes";
import type { BookableSlot, MySubscriptionsDto, ServiceType } from "@/lib/api/types";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { BookingGrid } from "./booking-grid";
import { createBookings } from "./create-bookings";
import { getBookableSlots } from "./get-bookable-slots";
import { CLIENT_CART_POLICY } from "./client-cart-policy";
import { staffCartPolicy } from "./staff/staff-cart-policy";
import { readPendingSlotIntentState, savePendingSlotIntent } from "./pending-slot-intent";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: vi.fn() }) }));
vi.mock("./get-booking-window", () => ({
  getBookingWindow: vi.fn().mockResolvedValue({ bookingWindowDays: 30, lastBookableDate: "2026-11-24" }),
}));
vi.mock("./get-bookable-slots", () => ({ getBookableSlots: vi.fn() }));
vi.mock("./create-bookings", () => ({ createBookings: vi.fn() }));
vi.mock("./get-batch-eligibility", () => ({ getBatchEligibility: vi.fn().mockResolvedValue([]) }));
vi.mock("./pending-slot-intent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pending-slot-intent")>();
  return { ...actual, readPendingSlotIntentState: vi.fn(actual.readPendingSlotIntentState) };
});
const getBookableSlotsMock = vi.mocked(getBookableSlots);
const createBookingsMock = vi.mocked(createBookings);

// Today is Monday 2026-10-26, 09:00 in Montevideo.
const TODAY = "2026-10-26";
const SLOT_DAYS = new Set(["2026-10-26", "2026-10-28", "2026-11-01", "2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11"]);

function slotOn(service: ServiceType, date: string): BookableSlot {
  return {
    id: `${service}-${date}`,
    service,
    startsAt: `${date}T18:00:00.000Z`, // 15:00 in Montevideo
    endsAt: `${date}T19:00:00.000Z`,
    durationMinutes: 60,
    capacity: 12,
    available: 6,
    isFull: false,
    alreadyBooked: false,
  };
}

const SUBSCRIPTIONS: MySubscriptionsDto = {
  performance: {
    id: "sub",
    planId: "plan",
    planName: "Mensual",
    startsOn: "2026-10-01",
    endsOn: "2026-11-10",
    status: "active",
    daysLeft: 15,
    expiringSoon: false,
    purchaseId: null,
    awaitingPayment: false,
  },
  upcomingPerformances: [],
  recoveryPacks: [],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
  vi.clearAllMocks();
  window.sessionStorage.clear();
  getBookableSlotsMock.mockImplementation((service, date) =>
    Promise.resolve(SLOT_DAYS.has(date) ? [slotOn(service, date)] : []),
  );
  createBookingsMock.mockResolvedValue({ booked: [], failed: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderDesktop(props: Parameters<typeof BookingGrid>[0] = {}) {
  renderWithSnackbar(<BookingGrid subscriptions={SUBSCRIPTIONS} {...props} />);
  return within(await screen.findByTestId("booking-grid-desktop"));
}

describe("BookingGrid", () => {
  it("fetches the Monday-to-Sunday week and refetches when the service changes", async () => {
    const user = userEvent.setup({ delay: null });
    const desktop = await renderDesktop();
    await waitFor(() => expect(getBookableSlotsMock).toHaveBeenCalledTimes(7));
    expect(getBookableSlotsMock).toHaveBeenCalledWith("performance", "2026-10-26");
    expect(getBookableSlotsMock).toHaveBeenCalledWith("performance", "2026-11-01");

    await user.click(desktop.getByRole("button", { name: "Fisioterapia" }));

    await waitFor(() => expect(getBookableSlotsMock).toHaveBeenCalledTimes(14));
    expect(getBookableSlotsMock).toHaveBeenLastCalledWith("rehab", "2026-11-01");
  });

  it("keeps the picks of every service while switching tabs", async () => {
    const user = userEvent.setup({ delay: null });
    const desktop = await renderDesktop();
    await user.click(desktop.getAllByTitle(/^15:00/)[0]);

    await user.click(desktop.getByRole("button", { name: /^Recovery/ }));
    await waitFor(() => expect(getBookableSlotsMock).toHaveBeenLastCalledWith("recovery", "2026-11-01"));
    await user.click((await desktop.findAllByTitle(/^15:00/))[1]);
    await user.click(desktop.getByRole("button", { name: /^Performance/ }));

    await waitFor(() => expect(desktop.getAllByTitle(/^15:00/)[0].getAttribute("aria-pressed")).toBe("true"));
    expect(desktop.getAllByTitle(/^15:00/)[1].getAttribute("aria-pressed")).toBe("false");
  });

  it("marks the tabs that have picked slots and groups the desktop cart by service", async () => {
    const user = userEvent.setup({ delay: null });
    const desktop = await renderDesktop();
    expect(desktop.getByRole("button", { name: /^Performance/ }).textContent).not.toContain("con turnos elegidos");

    await user.click(desktop.getAllByTitle(/^15:00/)[0]);

    expect(desktop.getByRole("button", { name: /^Performance/ }).textContent).toContain("con turnos elegidos");
    expect(desktop.getByRole("region", { name: "Performance" })).toBeDefined();
    expect(desktop.getByRole("button", { name: "Confirmar reservas" })).toBeDefined();
  });

  it("shows the plan summary under the grid, and leaves room for the floating card", async () => {
    const user = userEvent.setup({ delay: null });
    const desktop = await renderDesktop();
    const grid = screen.getByTestId("booking-grid-desktop");
    const summary = screen.getByText("Plan Mensual");
    const block = summary.closest("div.lg\\:pb-0") as HTMLElement;

    expect(grid.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(block.className.split(" ")).toContain("pb-0");

    await user.click(desktop.getAllByTitle(/^15:00/)[0]);

    expect(block.className.split(" ")).toContain("pb-32");
  });

  it("books Recovery first and then goes to pay the Fisioterapia slot", async () => {
    const user = userEvent.setup({ delay: null });
    const desktop = await renderDesktop({ initialService: "recovery" });
    await user.click(desktop.getAllByTitle(/^15:00/)[0]);
    await user.click(desktop.getByRole("button", { name: /^Fisioterapia/ }));
    await waitFor(() => expect(getBookableSlotsMock).toHaveBeenLastCalledWith("rehab", "2026-11-01"));
    await user.click((await desktop.findAllByTitle(/^15:00/))[1]);

    await user.click(desktop.getByRole("button", { name: /^Confirmar/ }));

    expect(createBookingsMock).toHaveBeenCalledWith(["recovery-2026-10-26"]);
    const rehab = slotOn("rehab", "2026-10-28");
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        bookingCheckoutHref({ service: "rehab", slotId: rehab.id, startsAt: rehab.startsAt }),
      ),
    );
  });

  it("shows an error state when the schedule can't be loaded", async () => {
    getBookableSlotsMock.mockRejectedValue(new Error("network"));
    renderWithSnackbar(<BookingGrid />);

    expect(await screen.findByRole("alert")).toBeDefined();
  });

  it("starts on the deep-linked service instead of the default", async () => {
    const desktop = await renderDesktop({ initialService: "rehab" });

    expect(getBookableSlotsMock).toHaveBeenCalledWith("rehab", "2026-10-26");
    expect(desktop.getByRole("button", { name: "Fisioterapia" }).className).toContain("bg-white");
  });

  it("follows a new deep-linked service while the grid stays mounted", async () => {
    const { rerender } = renderWithSnackbar(<BookingGrid subscriptions={SUBSCRIPTIONS} initialService="performance" />);
    const desktop = within(await screen.findByTestId("booking-grid-desktop"));
    expect(desktop.getByRole("button", { name: "Performance" }).className).toContain("bg-white");

    rerender(<BookingGrid subscriptions={SUBSCRIPTIONS} initialService="recovery" />);

    await waitFor(() => expect(getBookableSlotsMock).toHaveBeenCalledWith("recovery", "2026-10-26"));
    expect(desktop.getByRole("button", { name: /^Recovery/ }).className).toContain("bg-white");
  });

  it("keeps the chosen service when the deep link goes away", async () => {
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderWithSnackbar(<BookingGrid subscriptions={SUBSCRIPTIONS} initialService="performance" />);
    const desktop = within(await screen.findByTestId("booking-grid-desktop"));
    await user.click(desktop.getByRole("button", { name: "Fisioterapia" }));

    rerender(<BookingGrid subscriptions={SUBSCRIPTIONS} />);

    expect(desktop.getByRole("button", { name: "Fisioterapia" }).className).toContain("bg-white");
  });

  it("treats Sunday as one more day and only says CERRADO for days without slots", async () => {
    const desktop = await renderDesktop();

    expect(desktop.getByText("DOM")).toBeDefined();
    expect(desktop.getAllByText("CERRADO")).toHaveLength(4);
  });

  it("lists several picked slots with the weekly toggle between the list and the confirm button", async () => {
    const user = userEvent.setup({ delay: null });
    const desktop = await renderDesktop();

    const [monday, wednesday] = desktop.getAllByTitle(/^15:00/);
    await user.click(monday);
    await user.click(wednesday);

    const first = desktop.getByRole("button", { name: "Quitar Lun 26 · 15:00–16:00" });
    const toggle = desktop.getByRole("switch", { name: "Repetir cada semana" });
    const confirm = desktop.getByRole("button", { name: "Confirmar reservas" });
    expect(desktop.getByRole("button", { name: "Quitar Mié 28 · 15:00–16:00" })).toBeDefined();
    expect(desktop.getByText("2 turnos")).toBeDefined();
    expect(first.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("repeats weekly up to the plan end and marks the next weeks", async () => {
    const user = userEvent.setup({ delay: null });
    const desktop = await renderDesktop();
    const [monday, wednesday] = desktop.getAllByTitle(/^15:00/);
    await user.click(monday);
    await user.click(wednesday);

    await user.click(desktop.getByRole("switch", { name: "Repetir cada semana" }));

    expect(await desktop.findByText("Todos los lunes y miércoles a las 15 hrs")).toBeDefined();
    expect(desktop.getByText("Hasta el 10 nov")).toBeDefined();
    expect(desktop.getByRole("button", { name: "Quitar Lun 9 · 15:00–16:00" })).toBeDefined();
    expect(desktop.queryByRole("button", { name: "Quitar Mié 11 · 15:00–16:00" })).toBeNull();

    await user.click(desktop.getByRole("button", { name: "Semana siguiente" }));
    const nextWeek = await waitFor(() => {
      const cells = desktop.getAllByTitle(/^15:00/);
      expect(cells.length).toBeGreaterThan(0);
      return cells;
    });
    const pressed = nextWeek.filter((cell) => cell.getAttribute("aria-pressed") === "true");
    expect(pressed.length).toBeGreaterThan(0);
  });

  it("books the batch, tells which dates failed and reloads the week", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingsMock.mockResolvedValue({
      booked: [],
      failed: [{ timeSlotId: "performance-2026-10-28", code: "SLOT_FULL", message: "Completo" }],
    });
    const desktop = await renderDesktop();
    await waitFor(() => expect(getBookableSlotsMock).toHaveBeenCalledTimes(7));
    const [monday, wednesday] = desktop.getAllByTitle(/^15:00/);
    await user.click(monday);
    await user.click(wednesday);

    await user.click(desktop.getByRole("button", { name: "Confirmar reservas" }));

    expect(createBookingsMock).toHaveBeenCalledWith(["performance-2026-10-26", "performance-2026-10-28"]);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Performance · Mié 28 · 15:00");
    expect(alert.textContent).toContain("Completo");
    await waitFor(() => expect(getBookableSlotsMock).toHaveBeenCalledTimes(14));
    expect(desktop.getByText("Elegí uno o más horarios de la grilla.")).toBeDefined();
  });

  it("has no weekly toggle for Rehab, replaces the pick and goes to checkout", async () => {
    const user = userEvent.setup({ delay: null });
    const desktop = await renderDesktop({ initialService: "rehab" });

    const [monday, wednesday] = desktop.getAllByTitle(/^15:00/);
    await user.click(monday);
    await user.click(wednesday);

    expect(desktop.queryByRole("switch")).toBeNull();
    expect(desktop.getByText("1 turno")).toBeDefined();
    expect(desktop.queryByRole("button", { name: "Quitar Lun 26 · 15:00–16:00" })).toBeNull();

    await user.click(desktop.getByRole("button", { name: "Ir a pagar" }));

    const slot = slotOn("rehab", "2026-10-28");
    expect(pushMock).toHaveBeenCalledWith(
      bookingCheckoutHref({ service: "rehab", slotId: slot.id, startsAt: slot.startsAt }),
    );
    expect(createBookingsMock).not.toHaveBeenCalled();
  });

  it("restores a previously picked multi-slot selection after buying a plan", async () => {
    savePendingSlotIntent({
      surface: "bookings",
      slots: [
        { slotId: "performance-2026-10-26", service: "performance", startsAt: "2026-10-26T18:00:00.000Z" },
        { slotId: "performance-2026-10-28", service: "performance", startsAt: "2026-10-28T18:00:00.000Z" },
      ],
    });
    const desktop = await renderDesktop();

    expect(await screen.findByText("Recuperamos tu selección anterior — confirmala cuando quieras.")).toBeDefined();
    const region = desktop.getByRole("region", { name: "Performance" });
    expect(within(region).getByText("2 turnos")).toBeDefined();
  });

  it("restores only the slots that are still available and says how many were lost", async () => {
    savePendingSlotIntent({
      surface: "bookings",
      slots: [
        { slotId: "performance-2026-10-26", service: "performance", startsAt: "2026-10-26T18:00:00.000Z" },
        { slotId: "performance-2026-10-27", service: "performance", startsAt: "2026-10-27T18:00:00.000Z" }, // not a SLOT_DAYS date
      ],
    });
    const desktop = await renderDesktop();

    expect(
      await screen.findByText("Recuperamos 1 de 2 turnos — el resto ya no está disponible."),
    ).toBeDefined();
    const region = desktop.getByRole("region", { name: "Performance" });
    expect(within(region).getByText("1 turno")).toBeDefined();
  });

  it("warns and selects nothing when none of the restored slots are available anymore", async () => {
    savePendingSlotIntent({
      surface: "bookings",
      slots: [{ slotId: "performance-2026-10-27", service: "performance", startsAt: "2026-10-27T18:00:00.000Z" }],
    });
    await renderDesktop();

    expect(await screen.findByText("Esos horarios ya no están disponibles. Elegí de nuevo.")).toBeDefined();
  });

  it("works the same on mobile: sheet, weekly phrase and snackbar", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingsMock.mockResolvedValue({
      booked: [],
      failed: [{ timeSlotId: "performance-2026-10-26", code: "SLOT_FULL", message: "Completo" }],
    });
    renderWithSnackbar(<BookingGrid subscriptions={SUBSCRIPTIONS} />);
    const mobile = within(await screen.findByTestId("booking-grid-mobile"));

    await user.click(await mobile.findByText("15:00"));
    await user.click(mobile.getByRole("button", { name: "Ver tu reserva" }));
    expect(mobile.getByRole("button", { name: "Quitar Lun 26 · 15:00–16:00" })).toBeDefined();

    await user.click(mobile.getByRole("switch", { name: "Repetir cada semana" }));
    expect(await mobile.findByText("Todos los lunes a las 15 hrs")).toBeDefined();

    await user.click(mobile.getByRole("button", { name: "Confirmar reservas" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Performance · Lun 26 · 15:00");
    expect(alert.textContent).toContain("Completo");
  });
  describe("with injected pieces", () => {
    it("uses the injected fetchers, policy and confirm", async () => {
      const user = userEvent.setup({ delay: null });
      const fetchSlots = vi.fn((service: ServiceType, date: string) =>
        Promise.resolve(SLOT_DAYS.has(date) ? [slotOn(service, date)] : []),
      );
      const fetchEligibility = vi.fn().mockResolvedValue([]);
      const onConfirm = vi.fn();
      const desktop = await renderDesktop({
        fetchSlots,
        fetchEligibility,
        policy: { ...CLIENT_CART_POLICY, title: "Reserva para Ana" },
        onConfirm,
      });

      expect(fetchSlots).toHaveBeenCalledWith("performance", "2026-10-26");
      expect(getBookableSlotsMock).not.toHaveBeenCalled();

      await user.click(desktop.getAllByTitle(/^15:00/)[0]);

      expect(desktop.getByText("Reserva para Ana")).toBeDefined();
      await waitFor(() => expect(fetchEligibility).toHaveBeenCalledWith(["performance-2026-10-26"]));

      await user.click(desktop.getByRole("button", { name: "Confirmar reservas" }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm.mock.calls[0][0]).toMatchObject({ count: 1, policy: { title: "Reserva para Ana" } });
      expect(createBookingsMock).not.toHaveBeenCalled();
    });

    it("words the desktop cells' coverage with the injected policy", async () => {
      const uncovered = (service: ServiceType, date: string): BookableSlot => ({
        ...slotOn(service, date),
        eligibility: { covered: false, reason: "PACKAGE_REQUIRED" },
      });
      const fetchSlots = (service: ServiceType, date: string) =>
        Promise.resolve(SLOT_DAYS.has(date) ? [uncovered(service, date)] : []);
      const desktop = await renderDesktop({
        fetchSlots,
        policy: staffCartPolicy({ clientName: "Ana", clientHref: "/staff/clients/c1", offlineRoom: null }),
      });

      expect(desktop.getAllByTitle(/^15:00 · .*Se cobra por fuera$/).length).toBeGreaterThan(0);
      expect(desktop.queryAllByTitle(/Pagás esta sesión/)).toHaveLength(0);
    });

    it("lets the injected confirm book through the cart", async () => {
      const user = userEvent.setup({ delay: null });
      const book = vi.fn().mockResolvedValue({ booked: [], failed: [] });
      const desktop = await renderDesktop({ onConfirm: (cart) => void cart.confirm(book) });

      await user.click(desktop.getAllByTitle(/^15:00/)[0]);
      await user.click(desktop.getByRole("button", { name: "Confirmar reservas" }));

      await waitFor(() => expect(book).toHaveBeenCalledTimes(1));
      expect(book.mock.calls[0][0].map((slot: BookableSlot) => slot.id)).toEqual(["performance-2026-10-26"]);
      expect(createBookingsMock).not.toHaveBeenCalled();
    });

    it("does not restore a saved pick when the policy says so", async () => {
      savePendingSlotIntent({
        surface: "bookings",
        slots: [{ slotId: "performance-2026-10-26", service: "performance", startsAt: "2026-10-26T18:00:00.000Z" }],
      });
      const desktop = await renderDesktop({ policy: { ...CLIENT_CART_POLICY, restoresSavedPick: false } });
      await waitFor(() => expect(getBookableSlotsMock).toHaveBeenCalled());

      expect(readPendingSlotIntentState).not.toHaveBeenCalled();
      expect(desktop.getByText("Elegí uno o más horarios de la grilla.")).toBeDefined();
    });

    it("hides the plan banner when asked", async () => {
      await renderDesktop({ showPlanBanner: false });

      expect(screen.queryByText("Plan Mensual")).toBeNull();
    });

    it("renders the slot extra under each slot of the cart", async () => {
      const user = userEvent.setup({ delay: null });
      const desktop = await renderDesktop({
        renderSlotExtra: (slot) => <span>Extra de {slot.id}</span>,
      });

      await user.click(desktop.getAllByTitle(/^15:00/)[0]);

      expect(desktop.getByText("Extra de performance-2026-10-26")).toBeDefined();
    });
  });
});
