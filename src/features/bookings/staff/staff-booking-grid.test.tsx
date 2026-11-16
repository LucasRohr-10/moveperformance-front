import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  BookableSlot,
  MySubscriptionsDto,
  ServiceType,
  StaffBookingsBatchDto,
  StaffSlotEligibilityDto,
} from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { getBookableSlots } from "../get-bookable-slots";
import type { OfflinePrices } from "./offline-price";
import { createClientBookings, getClientBatchEligibility, getClientSlots } from "./staff-booking-api";
import { StaffBookingGrid, type StaffBookingConfig } from "./staff-booking-grid";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../get-booking-window", () => ({
  getBookingWindow: vi.fn().mockResolvedValue({ bookingWindowDays: 30, lastBookableDate: "2026-11-24" }),
}));
vi.mock("../get-bookable-slots", () => ({ getBookableSlots: vi.fn() }));
vi.mock("./staff-booking-api", () => ({
  getClientSlots: vi.fn(),
  getClientBatchEligibility: vi.fn(),
  createClientBookings: vi.fn(),
}));
const getBookableSlotsMock = vi.mocked(getBookableSlots);
const getClientSlotsMock = vi.mocked(getClientSlots);
const eligibilityMock = vi.mocked(getClientBatchEligibility);
const createMock = vi.mocked(createClientBookings);

// Today is Monday 2026-10-26, 09:00 in Montevideo.
const TODAY = "2026-10-26";
const SLOT_DAYS = new Set(["2026-10-26", "2026-10-28", "2026-11-01"]);

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

const SUBSCRIPTIONS: MySubscriptionsDto = { performance: null, upcomingPerformances: [], recoveryPacks: [] };
const PRICES: OfflinePrices = {
  rehabEvaluation: 1800,
  rehabFollowup: 1200,
  recoverySession: 900,
  performanceClass: 700,
};

function charged(id: string): StaffSlotEligibilityDto {
  return { timeSlotId: id, covered: false, reason: "PLAN_REQUIRED", chargedOffline: true };
}

function covered(id: string): StaffSlotEligibilityDto {
  return { timeSlotId: id, covered: true, reason: null, chargedOffline: false };
}

const BOOKED: StaffBookingsBatchDto = { booked: [], failed: [] };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
  vi.clearAllMocks();
  window.sessionStorage.clear();
  getClientSlotsMock.mockImplementation((_clientId, service, date) =>
    Promise.resolve(SLOT_DAYS.has(date) ? [slotOn(service, date)] : []),
  );
  eligibilityMock.mockImplementation((_clientId, ids) => Promise.resolve(ids.map(charged)));
  createMock.mockResolvedValue(BOOKED);
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderGrid(overrides: Partial<StaffBookingConfig> = {}) {
  const onBooked = vi.fn();
  const staff: StaffBookingConfig = {
    client: { id: "c1", name: "Sofía Pérez" },
    offlineRoom: 2,
    prices: PRICES,
    onBooked,
    ...overrides,
  };
  renderWithSnackbar(<StaffBookingGrid subscriptions={SUBSCRIPTIONS} staff={staff} />);
  const desktop = within(await screen.findByTestId("booking-grid-desktop"));
  return { desktop, onBooked: staff.onBooked };
}

async function pickFirstSlot(desktop: ReturnType<typeof within>, user: ReturnType<typeof userEvent.setup>) {
  await user.click(desktop.getAllByTitle(/^15:00/)[0]);
}

async function confirmEnabled(desktop: ReturnType<typeof within>) {
  const button = desktop.getByRole("button", { name: "Confirmar reservas" });
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  return button;
}

describe("StaffBookingGrid", () => {
  it("asks the staff endpoints for the client", async () => {
    const user = userEvent.setup({ delay: null });
    const { desktop } = await renderGrid();

    expect(getClientSlotsMock).toHaveBeenCalledWith("c1", "performance", "2026-10-26");
    expect(getBookableSlotsMock).not.toHaveBeenCalled();

    await pickFirstSlot(desktop, user);

    await waitFor(() => expect(eligibilityMock).toHaveBeenCalledWith("c1", ["performance-2026-10-26"]));
    expect(desktop.getByText("Reserva para Sofía Pérez")).toBeDefined();
  });

  it("does not show the plan banner", async () => {
    await renderGrid();

    expect(screen.queryByText(/^Plan /)).toBeNull();
  });

  it("books straight away when nothing is charged offline", async () => {
    const user = userEvent.setup({ delay: null });
    eligibilityMock.mockImplementation((_clientId, ids) => Promise.resolve(ids.map(covered)));
    const { desktop, onBooked } = await renderGrid();
    await pickFirstSlot(desktop, user);

    await user.click(await confirmEnabled(desktop));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith("c1", {
        paymentMethod: "undecided",
        items: [{ timeSlotId: "performance-2026-10-26" }],
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("link", { name: "Ver ficha" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver ficha" }).getAttribute("href")).toBe("/staff/clients/c1");
  });

  it("opens the offline dialog and books with its method", async () => {
    const user = userEvent.setup({ delay: null });
    const { desktop, onBooked } = await renderGrid();
    await pickFirstSlot(desktop, user);

    await user.click(await confirmEnabled(desktop));

    const dialog = within(await screen.findByRole("dialog", { name: "1 reserva se cobra por fuera" }));
    expect(createMock).not.toHaveBeenCalled();
    expect(dialog.getByText("$ 700")).toBeDefined();

    await user.click(dialog.getByRole("radio", { name: "Efectivo" }));
    await user.click(dialog.getByRole("button", { name: "Reservar" }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith("c1", {
        paymentMethod: "cash",
        items: [{ timeSlotId: "performance-2026-10-26" }],
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onBooked).toHaveBeenCalledTimes(1);
    expect(desktop.getByText("Elegí uno o más horarios de la grilla.")).toBeDefined();
  });

  it("lists only the slots the plan does not cover in the dialog", async () => {
    const user = userEvent.setup({ delay: null });
    eligibilityMock.mockImplementation((_clientId, ids) =>
      Promise.resolve(ids.map((id) => (id === "performance-2026-10-26" ? covered(id) : charged(id)))),
    );
    const { desktop } = await renderGrid();
    const [monday, wednesday] = desktop.getAllByTitle(/^15:00/);
    await user.click(monday);
    await user.click(wednesday);

    await user.click(await confirmEnabled(desktop));

    const dialog = within(await screen.findByRole("dialog", { name: "1 reserva se cobra por fuera" }));
    expect(dialog.getAllByRole("listitem")).toHaveLength(1);
    expect(dialog.getByText("Performance · mié 28/10 15:00")).toBeDefined();
  });

  it("books once on a double click", async () => {
    const user = userEvent.setup({ delay: null });
    let finish: (batch: StaffBookingsBatchDto) => void = () => undefined;
    createMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { desktop, onBooked } = await renderGrid();
    await pickFirstSlot(desktop, user);
    await user.click(await confirmEnabled(desktop));
    const reserve = within(await screen.findByRole("dialog")).getByRole("button", { name: "Reservar" });

    act(() => {
      reserve.click();
      reserve.click();
    });
    await act(async () => finish(BOOKED));

    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the cart and closes the dialog when booking fails", async () => {
    const user = userEvent.setup({ delay: null });
    createMock.mockRejectedValue(new Error("network"));
    const { desktop, onBooked } = await renderGrid();
    await pickFirstSlot(desktop, user);
    await user.click(await confirmEnabled(desktop));

    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Reservar" }));

    expect(await screen.findByText("No pudimos reservar. Probá de nuevo.")).toBeDefined();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onBooked).not.toHaveBeenCalled();
    expect(desktop.getByText("1 turno")).toBeDefined();
  });

  it("shows the Rehab kind picker only under Rehab slots", async () => {
    const user = userEvent.setup({ delay: null });
    const { desktop } = await renderGrid();
    await pickFirstSlot(desktop, user);

    expect(desktop.queryByRole("radiogroup", { name: "Tipo de sesión" })).toBeNull();

    await user.click(desktop.getByRole("button", { name: "Fisioterapia" }));
    await waitFor(() => expect(getClientSlotsMock).toHaveBeenCalledWith("c1", "rehab", "2026-11-01"));
    await user.click((await desktop.findAllByTitle(/^15:00/))[0]);

    const picker = within(desktop.getByRole("radiogroup", { name: "Tipo de sesión" }));
    expect(picker.getByRole("radio", { name: "Evaluación" }).getAttribute("aria-checked")).toBe("true");
    expect(desktop.getAllByRole("radiogroup", { name: "Tipo de sesión" })).toHaveLength(1);
  });

  it("books the chosen Rehab kind and shows its price in the dialog", async () => {
    const user = userEvent.setup({ delay: null });
    const { desktop } = await renderGrid();
    await user.click(desktop.getByRole("button", { name: "Fisioterapia" }));
    await waitFor(() => expect(getClientSlotsMock).toHaveBeenCalledWith("c1", "rehab", "2026-11-01"));
    await user.click((await desktop.findAllByTitle(/^15:00/))[0]);
    await user.click(desktop.getByRole("radio", { name: "Seguimiento" }));

    await user.click(await confirmEnabled(desktop));

    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText(/· Seguimiento$/)).toBeDefined();
    expect(dialog.getByText("$ 1.200")).toBeDefined();
    await user.click(dialog.getByRole("button", { name: "Reservar" }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith("c1", {
        paymentMethod: "undecided",
        items: [{ timeSlotId: "rehab-2026-10-26", rehabKind: "followup" }],
      }),
    );
  });

  it("holds the confirm button when more slots are charged offline than the client has room for", async () => {
    const user = userEvent.setup({ delay: null });
    const { desktop } = await renderGrid({ offlineRoom: 0 });
    await pickFirstSlot(desktop, user);

    expect(
      await desktop.findByText(
        "Este cliente llegó al máximo de cosas sin pagar de Configuración. Registrá un pago o quitá los turnos que se cobran por fuera.",
      ),
    ).toBeDefined();
    expect(desktop.getByRole("button", { name: "Confirmar reservas" }).hasAttribute("disabled")).toBe(true);
  });
});
