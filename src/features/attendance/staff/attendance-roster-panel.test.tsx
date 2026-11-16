import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DailySlot, RosterItem } from "@/lib/api/types";
import { ApiError } from "@/lib/api/errors";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { AttendanceRosterPanel } from "./attendance-roster-panel";
import { offlineChargeHref } from "@/features/payments/staff/offline-charge-labels";
import { listOpenOfflineCharges } from "@/features/payments/staff/offline-charges-api";
import type { OfflineChargeDto } from "@/lib/api/types";

import { cancelBooking, getRoster, markAttendance } from "./attendance-api";

vi.mock("./attendance-api", () => ({ getRoster: vi.fn(), markAttendance: vi.fn(), cancelBooking: vi.fn() }));
vi.mock("@/features/payments/staff/offline-charges-api", () => ({ listOpenOfflineCharges: vi.fn() }));

const getRosterMock = vi.mocked(getRoster);
const markAttendanceMock = vi.mocked(markAttendance);
const cancelBookingMock = vi.mocked(cancelBooking);
const listOpenChargesMock = vi.mocked(listOpenOfflineCharges);

beforeEach(() => {
  vi.clearAllMocks();
  listOpenChargesMock.mockResolvedValue({ items: [], total: 0, limitPerClient: 2 });
});

describe("AttendanceRosterPanel", () => {
  it("lists the roster for the given shift", async () => {
    getRosterMock.mockResolvedValue([
      {
        bookingId: "b1",
        client: { id: "u1", name: "Ana", lastName: "Gomez" },
        status: "confirmed",
        attendance: null,
        source: "plan",
      },
    ]);

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);

    expect(await screen.findByText("Ana Gomez")).toBeDefined();
    expect(await screen.findByText("Confirmada")).toBeDefined();
    expect(getRosterMock).toHaveBeenCalledWith("s1");
  });

  it("offers only Presente and Ausente on a confirmed booking", async () => {
    getRosterMock.mockResolvedValue([
      {
        bookingId: "b1",
        client: { id: "u1", name: "Ana", lastName: "Gomez" },
        status: "confirmed",
        attendance: null,
        source: "plan",
      },
    ]);

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);

    expect(await screen.findByRole("button", { name: "Presente" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ausente" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Sin aviso" })).toBeNull();
  });

  it("only lists confirmed bookings, since the server rejects attendance on the rest", async () => {
    getRosterMock.mockResolvedValue([
      {
        bookingId: "b1",
        client: { id: "u1", name: "Ana", lastName: "Gomez" },
        status: "confirmed",
        attendance: null,
        source: "plan",
      },
      {
        bookingId: "b2",
        client: { id: "u2", name: "Beto", lastName: "Paz" },
        status: "cancelled",
        attendance: null,
        source: "plan",
      },
    ]);

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);

    expect(await screen.findByText("Ana Gomez")).toBeDefined();
    expect(screen.queryByText("Beto Paz")).toBeNull();
  });

  it("shows the empty state when every booking in the shift was cancelled", async () => {
    getRosterMock.mockResolvedValue([
      {
        bookingId: "b2",
        client: { id: "u2", name: "Beto", lastName: "Paz" },
        status: "cancelled",
        attendance: null,
        source: "plan",
      },
    ]);

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);

    expect(await screen.findByText("Nadie reservó este turno")).toBeDefined();
  });

  it("marks a booking present and patches the row without refetching", async () => {
    getRosterMock.mockResolvedValueOnce([
      {
        bookingId: "b1",
        client: { id: "u1", name: "Ana", lastName: "Gomez" },
        status: "confirmed",
        attendance: null,
        source: "plan",
      },
    ]);
    markAttendanceMock.mockResolvedValue({
      bookingId: "b1",
      client: { id: "u1", name: "Ana", lastName: "Gomez" },
      status: "confirmed",
      attendance: "present",
      source: "plan",
    });
    const user = userEvent.setup();

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);
    await screen.findByText("Ana Gomez");
    await user.click(screen.getByRole("button", { name: "Presente" }));

    expect(markAttendanceMock).toHaveBeenCalledWith("b1", "present");
    // Scoped to the status cell: the row's action button is also labeled "Presente".
    expect(
      await screen.findByText(
        (_, element) => element?.tagName === "TD" && element.textContent === "Presente",
      ),
    ).toBeDefined();
    // Only called once for initial load, not again after marking.
    expect(getRosterMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error when the initial roster fetch fails", async () => {
    getRosterMock.mockRejectedValue(new Error("No se pudo cargar"));

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);

    expect(await screen.findByRole("alert")).toBeDefined();
  });

  it("surfaces an error instead of silently failing", async () => {
    getRosterMock.mockResolvedValue([
      {
        bookingId: "b1",
        client: { id: "u1", name: "Ana", lastName: "Gomez" },
        status: "confirmed",
        attendance: null,
        source: "plan",
      },
    ]);
    markAttendanceMock.mockRejectedValue(new Error("No se pudo marcar"));
    const user = userEvent.setup();

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);
    await screen.findByText("Ana Gomez");
    await user.click(screen.getByRole("button", { name: "Presente" }));

    expect(await screen.findByRole("alert")).toBeDefined();
  });

  it("retries a failed mark from the same row and clears the error on success", async () => {
    getRosterMock.mockResolvedValueOnce([
      {
        bookingId: "b1",
        client: { id: "u1", name: "Ana", lastName: "Gomez" },
        status: "confirmed",
        attendance: null,
        source: "plan",
      },
    ]);
    markAttendanceMock.mockRejectedValueOnce(new Error("No se pudo marcar"));
    markAttendanceMock.mockResolvedValueOnce({
      bookingId: "b1",
      client: { id: "u1", name: "Ana", lastName: "Gomez" },
      status: "confirmed",
      attendance: "present",
      source: "plan",
    });
    const user = userEvent.setup();

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);
    await screen.findByText("Ana Gomez");
    await user.click(screen.getByRole("button", { name: "Presente" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(markAttendanceMock).toHaveBeenCalledTimes(2);
    expect(markAttendanceMock).toHaveBeenNthCalledWith(2, "b1", "present");
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

function rosterItem(overrides: Partial<RosterItem> = {}): RosterItem {
  return {
    bookingId: "b1",
    client: { id: "u1", name: "Ana", lastName: "Gomez" },
    status: "confirmed",
    attendance: null,
    source: "plan",
    ...overrides,
  };
}

function daySlot(startsAt: string): DailySlot {
  return {
    id: "s1",
    service: "recovery",
    startsAt,
    endsAt: startsAt,
    capacity: 4,
    booked: 1,
    professionalName: null,
    calendarBlockedAt: null,
    cancelledAt: null,
    cancelReason: null,
    staffEditedAt: null,
    isIndividual: false,
    templateProfessionalName: null,
    unmarkedAttendance: 0,
  };
}

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();

describe("AttendanceRosterPanel, cancelling a booking", () => {
  it("cancel booking requires a reason", async () => {
    getRosterMock.mockResolvedValue([rosterItem()]);
    cancelBookingMock.mockResolvedValue({ bookingId: "b1", paymentOutcome: "nothing_consumed" });
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    const dialog = screen.getByRole("dialog", { name: "¿Cancelar la reserva de Ana Gomez?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancelar reserva" }));

    expect(within(dialog).getByRole("alert").textContent).toBe("Escribí el motivo: le llega al cliente.");
    expect(cancelBookingMock).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Motivo *"), "Mantenimiento");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar reserva" }));

    expect(cancelBookingMock).toHaveBeenCalledWith("b1", "Mantenimiento");
  });

  it("after cancelling, the row shows Cancelada and the button disappears", async () => {
    getRosterMock.mockResolvedValue([rosterItem()]);
    cancelBookingMock.mockResolvedValue({ bookingId: "b1", paymentOutcome: "nothing_consumed" });
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    await user.type(screen.getByLabelText("Motivo *"), "Feriado");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar reserva" }));

    expect(await screen.findByText("Cancelada")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar reserva" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Presente" })).toBeNull();
    expect(await screen.findByText("Reserva cancelada")).toBeDefined();
  });

  it("no cancel button on a slot that already started", async () => {
    getRosterMock.mockResolvedValue([rosterItem()]);
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(PAST)]} />);
    await screen.findByText("Ana Gomez");

    expect(screen.queryByRole("button", { name: "Cancelar reserva" })).toBeNull();
  });

  it("has no cancel button on a booking whose attendance is already marked", async () => {
    getRosterMock.mockResolvedValue([rosterItem({ attendance: "present" })]);
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    expect(screen.queryByRole("button", { name: "Cancelar reserva" })).toBeNull();
  });

  it.each([
    ["package", "La sesión vuelve a su paquete."],
    ["plan", "No consume nada de su plan."],
    ["followup", "No consume nada de su plan."],
    ["payment", "Lo pagó aparte: va a quedar en Pagos → Para revisar."],
  ] as const)("tells what happens with a booking paid by %s", async (source, text) => {
    getRosterMock.mockResolvedValue([rosterItem({ source })]);
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));

    expect(screen.getByText(text)).toBeDefined();
  });

  it("explains what cancelling a staff_offline booking does", async () => {
    getRosterMock.mockResolvedValue([rosterItem({ source: "staff_offline" })]);
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));

    expect(
      screen.getByText(
        "Se cobra por fuera: si no pagó, el cobro se cierra solo; si ya pagó, va a quedar en Pagos para revisar.",
      ),
    ).toBeDefined();
  });

  it("tells staff the payment is waiting in Pagos when a paid staff_offline booking is cancelled", async () => {
    getRosterMock.mockResolvedValue([rosterItem({ source: "staff_offline" })]);
    cancelBookingMock.mockResolvedValue({ bookingId: "b1", paymentOutcome: "offline_charge_paid" });
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    await user.type(screen.getByLabelText("Motivo *"), "Feriado");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar reserva" }));

    expect(await screen.findByText("Ya había pagado: quedó en Pagos para revisar.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ir a Pagos" }).getAttribute("href")).toBe("/staff/payments?needsAttention=true");
    expect(screen.queryByText("Reserva cancelada")).toBeNull();
  });

  it("keeps the usual snackbar when the cancelled staff_offline charge was still pending", async () => {
    getRosterMock.mockResolvedValue([rosterItem({ source: "staff_offline" })]);
    cancelBookingMock.mockResolvedValue({ bookingId: "b1", paymentOutcome: "offline_charge" });
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    await user.type(screen.getByLabelText("Motivo *"), "Feriado");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar reserva" }));

    expect(await screen.findByText("Reserva cancelada")).toBeDefined();
    expect(screen.queryByText("Ya había pagado: quedó en Pagos para revisar.")).toBeNull();
    expect(screen.queryByRole("link", { name: "Ir a Pagos" })).toBeNull();
  });

  it("keeps the dialog and the typed reason when the backend refuses", async () => {
    getRosterMock.mockResolvedValue([rosterItem()]);
    cancelBookingMock.mockRejectedValue(
      new ApiError({ statusCode: 409, code: "DAY_EDIT_ATTENDANCE_MARKED", message: "Ya tiene asistencia marcada" }),
    );
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    await user.type(screen.getByLabelText("Motivo *"), "Feriado");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar reserva" }));

    expect(await screen.findByText("Ya tiene asistencia marcada")).toBeDefined();
    expect((screen.getByLabelText("Motivo *") as HTMLTextAreaElement).value).toBe("Feriado");
  });

  it("Volver closes the dialog without cancelling", async () => {
    getRosterMock.mockResolvedValue([rosterItem()]);
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findByText("Ana Gomez");

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cancelBookingMock).not.toHaveBeenCalled();
  });
});

function charge(overrides: Partial<OfflineChargeDto> = {}): OfflineChargeDto {
  return {
    id: "ch1",
    kind: "booking",
    planStartsOn: null,
    paysWith: null,
    client: { id: "u2", name: "Beto", email: "beto@move.test" },
    bookingId: "b2",
    service: "recovery",
    itemName: "Sesión de Recovery",
    booking: { startsAt: FUTURE, status: "confirmed" },
    slotStarted: false,
    status: "pending",
    paymentMethod: "cash",
    amount: 900,
    currency: "UYU",
    createdAt: "2026-11-02T12:00:00.000Z",
    bookedBy: null,
    closedAt: null,
    closedBy: null,
    closeReason: null,
    needsAttention: false,
    attentionReason: null,
    attentionNote: null,
    payment: null,
    ...overrides,
  };
}

describe("AttendanceRosterPanel, what is still owed", () => {
  const roster = [
    rosterItem(),
    rosterItem({ bookingId: "b2", client: { id: "u2", name: "Beto", lastName: "Paz" }, source: "staff_offline" }),
    rosterItem({ bookingId: "b3", client: { id: "u3", name: "Cami", lastName: "Rey" }, source: "staff_offline" }),
  ];

  it("asks the open charges of every confirmed booking", async () => {
    getRosterMock.mockResolvedValue(roster);

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);
    await screen.findByText("Beto Paz");

    await waitFor(() => expect(listOpenChargesMock).toHaveBeenCalledWith({ bookingIds: ["b1", "b2", "b3"] }));
    expect(listOpenChargesMock).toHaveBeenCalledTimes(1);
  });

  it("asks for the charges of every confirmed booking, so a turn of an unpaid plan is found too", async () => {
    getRosterMock.mockResolvedValue([rosterItem()]);

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);
    await screen.findByText("Ana Gomez");

    await waitFor(() => expect(listOpenChargesMock).toHaveBeenCalledWith({ bookingIds: ["b1"] }));
  });

  it("shows Falta pagar on a turn booked with an unpaid plan, linking to the plan's charge", async () => {
    getRosterMock.mockResolvedValue([rosterItem()]);
    listOpenChargesMock.mockResolvedValue({
      items: [{ ...charge(), id: "ch-plan", kind: "plan", bookingId: "b1", paysWith: { itemName: "Mensual" } }],
      total: 1,
      limitPerClient: 2,
    });

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);
    await screen.findByText("Ana Gomez");

    const links = await screen.findAllByRole("link", { name: "Falta pagar" });
    for (const link of links) expect(link.getAttribute("href")).toBe(offlineChargeHref("ch-plan"));
  });

  it("shows Falta pagar for a client who owes, linking to that charge in Pagos", async () => {
    getRosterMock.mockResolvedValue(roster);
    listOpenChargesMock.mockResolvedValue({ items: [charge()], total: 1, limitPerClient: 2 });

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);
    await screen.findByText("Beto Paz");

    const links = await screen.findAllByRole("link", { name: "Falta pagar" });
    // One per layout (see the next test): only Beto owes, so nobody else gets one.
    expect(links).toHaveLength(2);
    for (const link of links) expect(link.getAttribute("href")).toBe(offlineChargeHref("ch1"));
    expect(screen.queryByRole("button", { name: /Marcar como pagado/ })).toBeNull();
  });

  it("puts Falta pagar in its own centered column on desktop and under the name on mobile", async () => {
    getRosterMock.mockResolvedValue(roster);
    listOpenChargesMock.mockResolvedValue({ items: [charge()], total: 1, limitPerClient: 2 });

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);
    await screen.findByText("Beto Paz");

    const [mobile, desktop] = await screen.findAllByRole("link", { name: "Falta pagar" });
    const desktopCell = desktop.closest("td");
    expect(desktopCell?.className).toContain("hidden");
    expect(desktopCell?.className).toContain("md:table-cell");
    expect(desktopCell?.className).toContain("text-center");
    const mobileWrapper = mobile.parentElement;
    expect(mobileWrapper?.className).toContain("md:hidden");
    expect(mobile.closest("td")?.textContent).toContain("Beto Paz");

    const header = screen.getByRole("columnheader", { name: "Pago", hidden: true });
    expect(header.className).toContain("md:table-cell");
    expect(within(header).getByText("Pago").className).toContain("sr-only");
  });

  it("keeps the roster when the charges fail", async () => {
    getRosterMock.mockResolvedValue(roster);
    listOpenChargesMock.mockRejectedValue(new Error("boom"));

    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" />);

    expect(await screen.findByText("Beto Paz")).toBeDefined();
    await waitFor(() => expect(listOpenChargesMock).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Falta pagar" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("drops the notice once the booking is cancelled", async () => {
    getRosterMock.mockResolvedValue([roster[1]]);
    listOpenChargesMock.mockResolvedValue({ items: [charge()], total: 1, limitPerClient: 2 });
    cancelBookingMock.mockResolvedValue({ bookingId: "b2", paymentOutcome: "offline_charge" });
    const user = userEvent.setup();
    renderWithSnackbar(<AttendanceRosterPanel timeSlotId="s1" daySlots={[daySlot(FUTURE)]} />);
    await screen.findAllByRole("link", { name: "Falta pagar" });

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    await user.type(screen.getByLabelText("Motivo *"), "Feriado");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar reserva" }));

    await screen.findByText("Cancelada");
    expect(screen.queryByRole("link", { name: "Falta pagar" })).toBeNull();
  });
});
