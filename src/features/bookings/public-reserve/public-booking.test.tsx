import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

vi.mock("../get-booking-window", () => ({ getBookingWindow: vi.fn().mockResolvedValue({ bookingWindowDays: 30, lastBookableDate: "2026-11-06" }) }));
vi.mock("../get-public-slots", () => ({ getPublicSlots: vi.fn() }));
vi.mock("../create-booking", () => ({ createBooking: vi.fn() }));
vi.mock("@/features/auth/sign-out", () => ({ signOut: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("@/features/subscriptions/get-my-subscriptions-client", () => ({
  getMySubscriptionsClient: vi.fn().mockResolvedValue({ performance: null, upcomingPerformances: [], recoveryPacks: [] }),
}));

const refreshMock = vi.fn();
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: pushMock }) }));

vi.mock("./auth-panel", () => ({
  AuthPanel: ({ onAuthenticated }: { onAuthenticated: (u: unknown) => void }) => (
    <button type="button" onClick={() => onAuthenticated(CLIENT)}>
      fake-login
    </button>
  ),
}));

import { signOut } from "@/features/auth/sign-out";
import { ApiError } from "@/lib/api/errors";
import type { BookableSlot, BookingResponse } from "@/lib/api/types";

import { createBooking } from "../create-booking";
import { getPublicSlots } from "../get-public-slots";
import { savePendingSlotIntent } from "../pending-slot-intent";
import { PublicBooking } from "./public-booking";

const getPublicSlotsMock = vi.mocked(getPublicSlots);
const createBookingMock = vi.mocked(createBooking);
const signOutMock = vi.mocked(signOut);

const CLIENT = {
  id: "1",
  name: "Ana",
  lastName: "Perez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: "1990-03-12",
  role: "client" as const,
};

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

const BOOKING: BookingResponse = {
  id: "booking-1",
  timeSlotId: "slot-1",
  service: "performance",
  startsAt: SLOT.startsAt,
  endsAt: SLOT.endsAt,
  durationMinutes: 60,
  label: "Entrenamiento semi personalizado",
  status: "confirmed",
  source: "plan",
  canCancel: true,
  cancelledAt: null,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T11:00:00.000Z"));
  vi.clearAllMocks();
  window.sessionStorage.clear();
  getPublicSlotsMock.mockImplementation((_service, date) => Promise.resolve(date === "2026-10-16" ? [SLOT] : []));
});

afterEach(() => {
  vi.useRealTimers();
});

async function pickSlot(user: ReturnType<typeof userEvent.setup>) {
  const desktop = within(await screen.findByTestId("public-booking-desktop"));
  await user.click(desktop.getByTitle("09:00 · Disponible"));
  return desktop;
}

describe("PublicBooking", () => {
  it("sends an anonymous visitor through auth before creating a real booking", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingMock.mockResolvedValue(BOOKING);
    renderWithSnackbar(<PublicBooking service="performance" initialUser={null} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Confirmar reserva" }));
    await user.click(desktop.getByRole("button", { name: "fake-login" }));

    await waitFor(() => expect(createBookingMock).toHaveBeenCalledWith("slot-1"));
    expect(await desktop.findByText("Reserva confirmada.")).toBeDefined();
  });

  it("books directly for an already signed-in visitor, no auth step shown", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingMock.mockResolvedValue(BOOKING);
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    expect(desktop.queryByRole("button", { name: "fake-login" })).toBeNull();
    await user.click(desktop.getByRole("button", { name: "Confirmar reserva" }));

    await waitFor(() => expect(createBookingMock).toHaveBeenCalledWith("slot-1"));
    expect(await desktop.findByText("Reserva confirmada.")).toBeDefined();
  });

  it("warns before confirming when the preview already says the slot is not covered", async () => {
    const user = userEvent.setup({ delay: null });
    getPublicSlotsMock.mockImplementation((_service, date) =>
      Promise.resolve(
        date === "2026-10-16"
          ? [{ ...SLOT, eligibility: { covered: false, reason: "PLAN_REQUIRED" as const } }]
          : [],
      ),
    );
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = within(await screen.findByTestId("public-booking-desktop"));
    await user.click(desktop.getByTitle(/^09:00/));

    expect(desktop.getByText("Requiere un plan")).toBeDefined();
    expect(desktop.getByRole("link", { name: "Ver planes" }).getAttribute("href")).toBe("/plans");
    expect(createBookingMock).not.toHaveBeenCalled();
  });

  it("shows no advisory when the preview says the slot is covered", async () => {
    const user = userEvent.setup({ delay: null });
    getPublicSlotsMock.mockImplementation((_service, date) =>
      Promise.resolve(date === "2026-10-16" ? [{ ...SLOT, eligibility: { covered: true, reason: null } }] : []),
    );
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = within(await screen.findByTestId("public-booking-desktop"));
    await user.click(desktop.getByTitle(/^09:00/));

    expect(desktop.queryByText("Requiere un plan")).toBeNull();
    expect(desktop.queryByRole("link")).toBeNull();
  });

  it("shows the backend's own error message and refreshes availability when booking fails", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "SLOT_FULL", message: "No quedan cupos para este turno." }),
    );
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Confirmar reserva" }));

    expect((await screen.findByRole("alert")).textContent).toContain("No quedan cupos para este turno.");
    await waitFor(() => expect(getPublicSlotsMock).toHaveBeenCalledTimes(14));
  });

  it("lets the signed-in visitor disown the session via No soy yo", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "No soy yo" }));

    expect(signOutMock).toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
    expect(desktop.queryByText(/Reservás como/)).toBeNull();
  });

  it("lets the visitor start over after a confirmed booking", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingMock.mockResolvedValue(BOOKING);
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Confirmar reserva" }));
    await desktop.findByText("Reserva confirmada.");

    await user.click(desktop.getByRole("button", { name: "Reservar otro horario" }));
    expect(desktop.queryByText("Reserva confirmada.")).toBeNull();
    expect(desktop.getByRole("button", { name: "Confirmar reserva" })).toBeDefined();
  });

  it("sends a signed-in rehab visitor to the checkout without creating a booking", async () => {
    const user = userEvent.setup({ delay: null });
    getPublicSlotsMock.mockImplementation((_service, date) =>
      Promise.resolve(date === "2026-10-16" ? [{ ...SLOT, service: "rehab" }] : []),
    );
    renderWithSnackbar(<PublicBooking service="rehab" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Continuar al pago" }));

    expect(pushMock).toHaveBeenCalledWith("/checkout/reserva?service=rehab&date=2026-10-16&slot=slot-1");
    expect(createBookingMock).not.toHaveBeenCalled();
    // Next keeps this route alive (hidden) while the checkout is open, so a busy
    // state set here would still be there when the visitor comes back.
    expect(desktop.queryByRole("button", { name: "Reservando…" })).toBeNull();
    expect(desktop.getByRole("button", { name: "Continuar al pago" })).toHaveProperty("disabled", false);
  });

  it("sends an anonymous rehab visitor to the checkout after authenticating", async () => {
    const user = userEvent.setup({ delay: null });
    getPublicSlotsMock.mockImplementation((_service, date) =>
      Promise.resolve(date === "2026-10-16" ? [{ ...SLOT, service: "rehab" }] : []),
    );
    renderWithSnackbar(<PublicBooking service="rehab" initialUser={null} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Continuar al pago" }));
    await user.click(desktop.getByRole("button", { name: "fake-login" }));

    expect(pushMock).toHaveBeenCalledWith("/checkout/reserva?service=rehab&date=2026-10-16&slot=slot-1");
    expect(createBookingMock).not.toHaveBeenCalled();
  });

  it("offers to pay a recovery session when the booking needs a package", async () => {
    const user = userEvent.setup({ delay: null });
    getPublicSlotsMock.mockImplementation((_service, date) =>
      Promise.resolve(date === "2026-10-16" ? [{ ...SLOT, service: "recovery" }] : []),
    );
    createBookingMock.mockRejectedValue(
      new ApiError({
        statusCode: 409,
        code: "PACKAGE_REQUIRED",
        message: "Necesitás un paquete con sesiones disponibles para reservar este turno.",
      }),
    );
    renderWithSnackbar(<PublicBooking service="recovery" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Confirmar reserva" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Necesitás un paquete con sesiones disponibles para reservar este turno.");
    const link = within(alert).getByRole("link", { name: "Pagar esta sesión" });
    expect(link.getAttribute("href")).toBe("/checkout/reserva?service=recovery&date=2026-10-16&slot=slot-1");
  });

  it("offers the plans page when a performance booking needs a plan", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingMock.mockRejectedValue(
      new ApiError({
        statusCode: 409,
        code: "PLAN_REQUIRED",
        message: "Necesitás un plan activo para reservar este turno.",
      }),
    );
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Confirmar reserva" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Necesitás un plan activo para reservar este turno.");
    expect(within(alert).getByRole("link", { name: "Ver planes" }).getAttribute("href")).toBe("/plans");
    expect(desktop.queryByText("Necesitás un plan activo para reservar este turno.")).toBeNull();
  });

  it("offers to pay the refused slot's own service when the booking needs a package", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingMock.mockRejectedValue(
      new ApiError({
        statusCode: 409,
        code: "PACKAGE_REQUIRED",
        message: "Necesitás un paquete con sesiones disponibles para reservar este turno.",
      }),
    );
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Confirmar reserva" }));

    const link = within(await screen.findByRole("alert")).getByRole("link", { name: "Pagar esta sesión" });
    expect(link.getAttribute("href")).toBe("/checkout/reserva?service=performance&date=2026-10-16&slot=slot-1");
  });

  it("shows no link for other booking errors", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "SLOT_FULL", message: "No quedan cupos para este turno." }),
    );
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const desktop = await pickSlot(user);
    await user.click(desktop.getByRole("button", { name: "Confirmar reserva" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No quedan cupos para este turno.");
    expect(within(alert).queryByRole("link")).toBeNull();
  });

  it("no longer shows the notice that plan and payment are not verified", async () => {
    renderWithSnackbar(<PublicBooking service="performance" initialUser={null} />);

    await screen.findByTestId("public-booking-desktop");
    expect(screen.queryByText(/todavía no verificamos plan ni pago/i)).toBeNull();
  });
});

describe("PublicBooking resuming a pending slot intent", () => {
  it("restores the previously picked slot once it comes back after buying a plan", async () => {
    savePendingSlotIntent({
      surface: "reservar",
      slots: [{ slotId: SLOT.id, service: SLOT.service, startsAt: SLOT.startsAt }],
    });
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    expect(await screen.findByText("09:00 – 10:00")).toBeDefined();
    expect(await screen.findByText("Recuperamos el turno que habías elegido.")).toBeDefined();
  });

  it("warns and leaves nothing selected when the restored slot is no longer available", async () => {
    savePendingSlotIntent({
      surface: "reservar",
      slots: [{ slotId: "slot-gone", service: "performance", startsAt: SLOT.startsAt }],
    });
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    expect(await screen.findByText("Ese horario ya no está disponible. Elegí otro.")).toBeDefined();
    expect(screen.getByText("Elegí un horario disponible en la grilla.")).toBeDefined();
  });

  it("consumes the intent — a second mount does not restore it again", async () => {
    savePendingSlotIntent({
      surface: "reservar",
      slots: [{ slotId: SLOT.id, service: SLOT.service, startsAt: SLOT.startsAt }],
    });
    const { unmount } = renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);
    await screen.findByText("09:00 – 10:00");
    unmount();

    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    await screen.findByTestId("public-booking-desktop");
    expect(screen.queryByText("Recuperamos el turno que habías elegido.")).toBeNull();
  });
});

describe("PublicBooking on mobile", () => {
  const LATER_SLOT: BookableSlot = {
    ...SLOT,
    id: "slot-2",
    startsAt: "2026-10-16T13:00:00.000Z",
    endsAt: "2026-10-16T14:00:00.000Z",
  };

  async function pickMobileSlot(user: ReturnType<typeof userEvent.setup>, time = "09:00") {
    const mobile = within(await screen.findByTestId("public-booking-mobile"));
    await user.click(mobile.getByRole("button", { name: new RegExp(`^${time}`) }));
    return mobile;
  }

  function rejectBookingWith(code: string, message: string) {
    createBookingMock.mockRejectedValue(new ApiError({ statusCode: 409, code, message }));
  }

  it("shows the refusal and the pay link on the grid view when a recovery booking needs a package", async () => {
    const user = userEvent.setup({ delay: null });
    getPublicSlotsMock.mockImplementation((_service, date) =>
      Promise.resolve(date === "2026-10-16" ? [{ ...SLOT, service: "recovery" }] : []),
    );
    rejectBookingWith(
      "PACKAGE_REQUIRED",
      "Necesitás un paquete con sesiones disponibles para reservar este turno.",
    );
    renderWithSnackbar(<PublicBooking service="recovery" initialUser={CLIENT} />);

    const mobile = await pickMobileSlot(user);
    await user.click(mobile.getByRole("button", { name: "Confirmar reserva" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Necesitás un paquete con sesiones disponibles para reservar este turno.");
    expect(mobile.queryByLabelText("Volver a la grilla")).toBeNull();
    const link = within(alert).getByRole("link", { name: "Pagar esta sesión" });
    expect(link.getAttribute("href")).toBe("/checkout/reserva?service=recovery&date=2026-10-16&slot=slot-1");
  });

  it("shows the refusal and the plans link on the grid view when a performance booking needs a plan", async () => {
    const user = userEvent.setup({ delay: null });
    rejectBookingWith("PLAN_REQUIRED", "Necesitás un plan activo para reservar este turno.");
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const mobile = await pickMobileSlot(user);
    await user.click(mobile.getByRole("button", { name: "Confirmar reserva" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Necesitás un plan activo para reservar este turno.");
    expect(within(alert).getByRole("link", { name: "Ver planes" }).getAttribute("href")).toBe("/plans");
    expect(mobile.queryByText("Necesitás un plan activo para reservar este turno.")).toBeNull();
  });

  it("shows other booking errors on the grid view without a link", async () => {
    const user = userEvent.setup({ delay: null });
    rejectBookingWith("SLOT_FULL", "No quedan cupos para este turno.");
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const mobile = await pickMobileSlot(user);
    await user.click(mobile.getByRole("button", { name: "Confirmar reserva" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No quedan cupos para este turno.");
    expect(within(alert).queryByRole("link")).toBeNull();
  });

  it("sends a signed-in rehab visitor to the checkout without opening the busy overlay", async () => {
    const user = userEvent.setup({ delay: null });
    getPublicSlotsMock.mockImplementation((_service, date) =>
      Promise.resolve(date === "2026-10-16" ? [{ ...SLOT, service: "rehab" }] : []),
    );
    renderWithSnackbar(<PublicBooking service="rehab" initialUser={CLIENT} />);

    const mobile = await pickMobileSlot(user);
    await user.click(mobile.getByRole("button", { name: "Continuar al pago" }));

    expect(pushMock).toHaveBeenCalledWith("/checkout/reserva?service=rehab&date=2026-10-16&slot=slot-1");
    expect(mobile.queryByLabelText("Volver a la grilla")).toBeNull();
    expect(mobile.queryByRole("button", { name: "Reservando…" })).toBeNull();
    expect(mobile.getByRole("button", { name: "Continuar al pago" })).toHaveProperty("disabled", false);
  });

  it("closes the busy overlay with the ✕ and lets the visitor confirm again", async () => {
    const user = userEvent.setup({ delay: null });
    createBookingMock.mockReturnValue(new Promise<BookingResponse>(() => {}));
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const mobile = await pickMobileSlot(user);
    await user.click(mobile.getByRole("button", { name: "Confirmar reserva" }));
    expect(mobile.getByRole("button", { name: "Reservando…" })).toHaveProperty("disabled", true);

    await user.click(mobile.getByLabelText("Volver a la grilla"));

    expect(mobile.queryByLabelText("Volver a la grilla")).toBeNull();
    expect(mobile.getByRole("button", { name: "Confirmar reserva" })).toHaveProperty("disabled", false);
  });

  it("keeps the grid free of inline refusals when the visitor picks another slot", async () => {
    const user = userEvent.setup({ delay: null });
    getPublicSlotsMock.mockImplementation((_service, date) =>
      Promise.resolve(date === "2026-10-16" ? [SLOT, LATER_SLOT] : []),
    );
    rejectBookingWith("PLAN_REQUIRED", "Necesitás un plan activo para reservar este turno.");
    renderWithSnackbar(<PublicBooking service="performance" initialUser={CLIENT} />);

    const mobile = await pickMobileSlot(user);
    await user.click(mobile.getByRole("button", { name: "Confirmar reserva" }));
    await screen.findByRole("alert");

    await user.click(mobile.getByRole("button", { name: /^10:00/ }));

    expect(mobile.queryByRole("alert")).toBeNull();
    expect(mobile.queryByRole("link", { name: "Ver planes" })).toBeNull();
  });
});
