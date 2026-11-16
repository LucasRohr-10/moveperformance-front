import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { listOpenOfflineCharges } from "@/features/payments/staff/offline-charges-api";
import type { OfflineChargeDto } from "@/lib/api/types";

import { ClientDetailPanel } from "./client-detail-panel";
import {
  deactivateClient,
  getClient,
  getDeactivationPreview,
  reactivateClient,
  updateClientPhone,
  updateClientProfile,
} from "./clients-api";

vi.mock("./clients-api", () => ({
  getClient: vi.fn(),
  updateClientPhone: vi.fn(),
  updateClientProfile: vi.fn(),
  setClientPassword: vi.fn(),
  getDeactivationPreview: vi.fn(),
  deactivateClient: vi.fn(),
  reactivateClient: vi.fn(),
}));
vi.mock("@/features/payments/staff/offline-charges-api", () => ({ listOpenOfflineCharges: vi.fn() }));
vi.mock("@/features/followup", () => ({
  ClientFollowupSection: ({ clientId, clientName }: { clientId: string; clientName: string }) => (
    <div data-testid="client-followup">
      {clientId} · {clientName}
    </div>
  ),
}));

const listOpenChargesMock = vi.mocked(listOpenOfflineCharges);
const getClientMock = vi.mocked(getClient);
const updateClientPhoneMock = vi.mocked(updateClientPhone);
const updateClientProfileMock = vi.mocked(updateClientProfile);
const previewMock = vi.mocked(getDeactivationPreview);
const deactivateMock = vi.mocked(deactivateClient);
const reactivateMock = vi.mocked(reactivateClient);

beforeEach(() => {
  vi.clearAllMocks();
  listOpenChargesMock.mockResolvedValue({ items: [], total: 0, limitPerClient: 2 });
});
afterEach(() => vi.useRealTimers());

function openCharge(id: string): OfflineChargeDto {
  return {
    id,
    kind: "booking",
    planStartsOn: null,
    paysWith: null,
    client: { id: "c1", name: "Ana Gomez", email: "ana@move.uy" },
    bookingId: `b-${id}`,
    service: "recovery",
    itemName: "Sesión de Recovery",
    booking: { startsAt: "2026-11-06T13:00:00.000Z", status: "confirmed" },
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
  };
}

const CLIENT_C1 = {
  id: "c1",
  name: "Ana",
  lastName: "Gomez",
  email: "ana@move.uy",
  phone: "+59899123456",
  birthDate: null,
  age: null,
  clientSince: "2026-01-01T00:00:00.000Z",
  deactivation: null,
  plan: null,
  paymentStatus: null,
  bookings: [],
};

describe("ClientDetailPanel, what the client owes", () => {
  it.each([
    [1, "Falta pagar 1 turno"],
    [2, "Falta pagar 2 turnos"],
  ])("shows Falta pagar N turnos with a link to Pagos when the client owes (%i)", async (count, text) => {
    getClientMock.mockResolvedValue(CLIENT_C1);
    listOpenChargesMock.mockResolvedValue({
      items: Array.from({ length: count }, (_, index) => openCharge(`ch${index}`)),
      total: count,
      limitPerClient: 2,
    });

    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

    expect(await screen.findByText(text)).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver en Pagos →" }).getAttribute("href")).toBe(
      "/staff/payments?view=to-collect&clientId=c1",
    );
    expect(listOpenChargesMock).toHaveBeenCalledWith({ clientId: "c1" });
    expect(screen.queryByRole("button", { name: /Marcar como pagado/ })).toBeNull();
  });

  it("counts the plan once, and says it is a plan, when the client owes a plan with two turns", async () => {
    getClientMock.mockResolvedValue(CLIENT_C1);
    const plan = { ...openCharge("ch-plan"), kind: "plan" as const, service: "performance" as const, planStartsOn: "2026-11-04", bookingId: null, booking: null };
    const turn = (bookingId: string) => ({ ...plan, bookingId, paysWith: { itemName: "Mensual" } });
    listOpenChargesMock.mockResolvedValue({ items: [plan, turn("b1"), turn("b2")], total: 3, limitPerClient: 2 });

    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

    expect(await screen.findByText("Falta pagar el plan")).toBeDefined();
  });

  it("adds the sessions the client owes apart from the plan", async () => {
    getClientMock.mockResolvedValue(CLIENT_C1);
    const plan = { ...openCharge("ch-plan"), kind: "plan" as const, service: "performance" as const, planStartsOn: "2026-11-04", bookingId: null, booking: null };
    listOpenChargesMock.mockResolvedValue({
      items: [plan, { ...plan, bookingId: "b1", paysWith: { itemName: "Mensual" } }, openCharge("ch-s1"), openCharge("ch-s2")],
      total: 4,
      limitPerClient: 2,
    });

    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

    expect(await screen.findByText("Falta pagar el plan y 2 turnos")).toBeDefined();
  });

  it("shows nothing when the client owes nothing or the charges fail", async () => {
    getClientMock.mockResolvedValue(CLIENT_C1);
    const { unmount } = renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
    await screen.findByRole("heading", { level: 1, name: "Ana Gomez" });
    await waitFor(() => expect(listOpenChargesMock).toHaveBeenCalled());
    expect(screen.queryByText(/Falta pagar/)).toBeNull();
    unmount();

    listOpenChargesMock.mockRejectedValue(new Error("boom"));
    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
    await screen.findByRole("heading", { level: 1, name: "Ana Gomez" });
    await waitFor(() => expect(listOpenChargesMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Falta pagar/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("ClientDetailPanel", () => {
  it("shows the client's name as the page's only heading, with a breadcrumb back to Clientes", async () => {
    getClientMock.mockResolvedValue({
      id: "c1",
      name: "Ana",
      lastName: "Gomez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: null,
      age: null,
      clientSince: "2026-01-01T00:00:00.000Z",
      deactivation: null,
      plan: null,
      paymentStatus: null,
      bookings: [],
    });

    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Gomez" })).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Clientes" })).toHaveProperty(
      "href",
      expect.stringContaining("/staff/clients"),
    );
  });

  it("shows contact info, facts and booking/attendance history", async () => {
    getClientMock.mockResolvedValue({
      id: "c1",
      name: "Ana",
      lastName: "Gomez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: null,
      age: null,
      clientSince: "2026-01-15T12:00:00.000Z",
      deactivation: null,
      plan: { name: "Performance Mensual", endsOn: "2026-11-18" },
      paymentStatus: "up_to_date",
      bookings: [
        {
          id: "b1",
          slotId: "slot-1",
          service: "performance",
          startsAt: "2026-10-01T10:00:00.000Z",
          status: "confirmed",
          attendance: "present",
        },
      ],
    });

    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
    await screen.findByRole("heading", { level: 1, name: "Ana Gomez" });

    expect(screen.getByText("15/01/2026")).toBeDefined();
    expect(screen.getByText("Performance Mensual")).toBeDefined();
    expect(screen.getByText("Al día")).toBeDefined();
    expect(screen.getByRole("link", { name: "ana@move.uy" })).toHaveProperty(
      "href",
      "mailto:ana@move.uy",
    );
    expect(screen.getByRole("link", { name: "+59899123456" })).toHaveProperty(
      "href",
      "tel:+59899123456",
    );
    expect(screen.getByRole("link", { name: "01/10/2026" })).toHaveProperty(
      "href",
      expect.stringContaining("/staff/schedule/slot-1"),
    );
    expect(screen.getByRole("link", { name: "Ver pagos →" })).toHaveProperty(
      "href",
      expect.stringContaining("/staff/payments?clientId=c1"),
    );
    expect(screen.getByText("Performance")).toBeDefined();
    expect(screen.getByText("Confirmada")).toBeDefined();
    expect(screen.getAllByText("Presente").length).toBeGreaterThan(0);
    expect((await screen.findByTestId("client-followup")).textContent).toBe("c1 · Ana Gomez");
  });

  it("derives the next upcoming booking and the last attendance taken, newest first", async () => {
    // Only `Date` is faked: `findBy*`'s own polling still relies on real timers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T12:00:00.000Z"));
    getClientMock.mockResolvedValue({
      id: "c1",
      name: "Ana",
      lastName: null,
      email: "ana@move.uy",
      phone: null,
      birthDate: null,
      age: null,
      clientSince: "2025-06-01T00:00:00.000Z",
      deactivation: null,
      plan: { name: "Performance Mensual", endsOn: "2026-09-01" },
      paymentStatus: "overdue",
      bookings: [
        // Sorted newest-first, as the API returns them.
        {
          id: "future",
          slotId: "slot-future",
          service: "rehab",
          startsAt: "2099-01-10T10:00:00.000Z",
          status: "confirmed",
          attendance: null,
        },
        {
          id: "past-no-mark",
          slotId: "slot-past-no-mark",
          service: "performance",
          startsAt: "2026-09-01T10:00:00.000Z",
          status: "confirmed",
          attendance: null,
        },
        {
          id: "past-marked",
          slotId: "slot-past-marked",
          service: "recovery",
          startsAt: "2026-08-01T10:00:00.000Z",
          status: "confirmed",
          attendance: "absent",
        },
      ],
    });

    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
    await screen.findByRole("heading", { level: 1, name: "Ana" });

    expect(screen.getByText(/10\/01\/2099 · Rehab/)).toBeDefined();
    expect(screen.getAllByText("Ausente").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sin aviso")).toBeNull();
  });

  it("shows an explicit empty state instead of a bare table when there are no bookings", async () => {
    getClientMock.mockResolvedValue({
      id: "c1",
      name: "Ana",
      lastName: "Gomez",
      email: "ana@move.uy",
      phone: null,
      birthDate: null,
      age: null,
      clientSince: "2026-01-01T00:00:00.000Z",
      deactivation: null,
      plan: null,
      paymentStatus: null,
      bookings: [],
    });

    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

    // "Sin reservas" appears twice: the "Próxima reserva" fact and the table's empty state.
    expect(await screen.findAllByText("Sin reservas")).toHaveLength(2);
    expect(
      screen.getByText("Este cliente todavía no reservó ningún turno."),
    ).toBeDefined();
  });

  it("switches between the bookings and follow-up sections for narrow screens", async () => {
    getClientMock.mockResolvedValue({
      id: "c1",
      name: "Ana",
      lastName: "Gomez",
      email: "ana@move.uy",
      phone: null,
      birthDate: null,
      age: null,
      clientSince: "2026-01-01T00:00:00.000Z",
      deactivation: null,
      plan: null,
      paymentStatus: null,
      bookings: [],
    });

    renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
    await screen.findByRole("heading", { level: 1, name: "Ana Gomez" });

    const follow = screen.getByRole("tab", { name: "Seguimiento" });
    const bookings = screen.getByRole("tab", { name: "Reservas" });
    expect(follow.getAttribute("aria-selected")).toBe("true");
    expect(bookings.getAttribute("aria-selected")).toBe("false");

    await userEvent.click(bookings);

    expect(bookings.getAttribute("aria-selected")).toBe("true");
    expect(follow.getAttribute("aria-selected")).toBe("false");
  });

  it("surfaces an error instead of silently failing", async () => {
    getClientMock.mockRejectedValue(new Error("No se pudo cargar"));

    renderWithSnackbar(<ClientDetailPanel clientId="missing" />);

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1, name: "Ficha de cliente" })).toBeDefined();
  });

  describe("editing the phone", () => {
    function baseClient(phone: string | null) {
      return {
        id: "c1",
        name: "Ana",
        lastName: "Gomez",
        email: "ana@move.uy",
        phone,
        birthDate: null,
        age: null,
        clientSince: "2026-01-01T00:00:00.000Z",
        deactivation: null,
        plan: null,
        paymentStatus: null,
        bookings: [],
      };
    }

    it("shows a placeholder and an edit action when there is no phone yet", async () => {
      getClientMock.mockResolvedValue(baseClient(null));

      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

      expect(await screen.findByText("Sin teléfono")).toBeDefined();
      expect(screen.getByRole("button", { name: "Editar" })).toBeDefined();
    });

    it("opens the form prefilled with the current phone, and cancel closes it without saving", async () => {
      getClientMock.mockResolvedValue(baseClient("+59899123456"));
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByRole("link", { name: "+59899123456" });

      await userEvent.click(screen.getByRole("button", { name: "Editar" }));

      expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("099 123 456");
      expect(screen.getByRole("button", { name: "Elegir país" }).textContent).toContain("+598");

      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByLabelText("Teléfono")).toBeNull();
      expect(updateClientPhoneMock).not.toHaveBeenCalled();
    });

    it("rejects an invalid phone without calling the API", async () => {
      getClientMock.mockResolvedValue(baseClient(null));
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByText("Sin teléfono");

      await userEvent.click(screen.getByRole("button", { name: "Editar" }));
      await userEvent.type(screen.getByLabelText("Teléfono"), "no es un telefono");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect((await screen.findByRole("alert")).textContent).toBe("Ingresá un teléfono válido.");
      expect(updateClientPhoneMock).not.toHaveBeenCalled();
    });

    it("saves the phone in E.164 and shows the updated client", async () => {
      getClientMock.mockResolvedValue(baseClient(null));
      updateClientPhoneMock.mockResolvedValue(baseClient("+59899123456"));
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByText("Sin teléfono");

      await userEvent.click(screen.getByRole("button", { name: "Editar" }));
      await userEvent.type(screen.getByLabelText("Teléfono"), "099 123 456");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect(updateClientPhoneMock).toHaveBeenCalledWith("c1", "+59899123456");
      expect(await screen.findByRole("link", { name: "+59899123456" })).toBeDefined();
      expect(screen.queryByLabelText("Teléfono")).toBeNull();
    });

    it("shows an error and keeps the form open when saving fails", async () => {
      getClientMock.mockResolvedValue(baseClient(null));
      updateClientPhoneMock.mockRejectedValue(new Error("boom"));
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByText("Sin teléfono");

      await userEvent.click(screen.getByRole("button", { name: "Editar" }));
      await userEvent.type(screen.getByLabelText("Teléfono"), "099 123 456");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect((await screen.findByRole("alert")).textContent).toContain(
        "No pudimos guardar el teléfono. Probá de nuevo.",
      );
      expect(screen.getByLabelText("Teléfono")).toBeDefined();
    });
  });

  describe("age", () => {
    const withBirthDate = (birthDate: string | null, age: number | null) => ({
      id: "c1",
      name: "Ana",
      lastName: "Gomez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate,
      age,
      clientSince: "2026-01-01T00:00:00.000Z",
      deactivation: null,
      plan: null,
      paymentStatus: null,
      bookings: [],
    });

    it("shows the age and the birthday", async () => {
      getClientMock.mockResolvedValue(withBirthDate("1990-03-12", 34));

      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

      const cell = (await screen.findByText("Edad")).parentElement;
      expect(cell?.querySelector("dd")?.textContent).toBe("34 años · 12 de marzo");
    });

    it("shows a dash without a birth date", async () => {
      getClientMock.mockResolvedValue(withBirthDate(null, null));

      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

      const cell = (await screen.findByText("Edad")).parentElement;
      expect(cell?.querySelector("dd")?.textContent).toBe("—");
    });
  });

  describe("account actions", () => {
    const client = {
      id: "c1",
      name: "Ana",
      lastName: "Gomez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: "1990-03-12",
      age: 36,
      clientSince: "2026-01-01T00:00:00.000Z",
      deactivation: null,
      plan: null,
      paymentStatus: null,
      bookings: [],
    };

    it("shows Editar datos and Cambiar clave next to the name", async () => {
      getClientMock.mockResolvedValue(client);

      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

      const heading = await screen.findByRole("heading", { level: 1, name: "Ana Gomez" });
      const header = heading.closest("header");
      expect(header?.contains(screen.getByRole("button", { name: "Editar datos" }))).toBe(true);
      expect(header?.contains(screen.getByRole("button", { name: "Cambiar clave" }))).toBe(true);
    });

    it("shows the saved name in the heading after editing", async () => {
      getClientMock.mockResolvedValue(client);
      updateClientProfileMock.mockResolvedValue({ ...client, name: "Anita" });
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByRole("heading", { level: 1, name: "Ana Gomez" });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Editar datos" }));
      const name = screen.getByLabelText("Nombre");
      await user.clear(name);
      await user.type(name, "Anita");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByRole("heading", { level: 1, name: "Anita Gomez" })).toBeDefined();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("keeps the inline phone edit", async () => {
      getClientMock.mockResolvedValue(client);
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByRole("link", { name: "+59899123456" });

      await userEvent.click(screen.getByRole("button", { name: "Editar" }));

      expect(screen.getByLabelText("Teléfono")).toBeDefined();
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("deactivation", () => {
    const active = {
      id: "c1",
      name: "Ana",
      lastName: "Gomez",
      email: "ana@move.uy",
      phone: "+59899123456",
      birthDate: null,
      age: null,
      clientSince: "2026-01-01T00:00:00.000Z",
      deactivation: null,
      plan: { name: "Performance Mensual", endsOn: "2026-11-18" },
      paymentStatus: "up_to_date" as const,
      bookings: [],
    };
    const deactivated = {
      ...active,
      deactivation: {
        deactivatedAt: "2026-11-02T13:00:00.000Z",
        deactivatedByName: "Valentina Velásquez",
        reason: "Se mudó",
      },
    };

    it("shows the deactivation banner and the inactive plan", async () => {
      getClientMock.mockResolvedValue(deactivated);

      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

      expect(await screen.findByText("Dado de baja el 02/11/2026 por Valentina Velásquez · Se mudó")).toBeDefined();
      const planCell = screen.getByText("Plan").parentElement;
      expect(planCell?.textContent).toContain("Performance Mensual");
      expect(planCell?.textContent).toContain("Inactivo · cliente dado de baja");
      expect(screen.queryByText("Al día")).toBeNull();
      expect(screen.getByRole("button", { name: "Reactivar" })).toBeDefined();
    });

    it("offers Reservar para este cliente next to the account actions", async () => {
      getClientMock.mockResolvedValue(active);

      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

      const link = await screen.findByRole("link", { name: "Reservar para este cliente" });
      expect(link.getAttribute("href")).toBe("/staff/book?clientId=c1");
      expect(screen.getByRole("button", { name: "Editar datos" })).toBeDefined();
    });

    it("hides it for a deactivated client", async () => {
      getClientMock.mockResolvedValue(deactivated);

      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

      await screen.findByText(/Dado de baja el/);
      expect(screen.queryByRole("link", { name: "Reservar para este cliente" })).toBeNull();
    });

    it("keeps the payment status and no banner for an active client", async () => {
      getClientMock.mockResolvedValue(active);

      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);

      expect(await screen.findByText("Al día")).toBeDefined();
      expect(screen.queryByText(/Dado de baja el/)).toBeNull();
      expect(screen.queryByText("Inactivo · cliente dado de baja")).toBeNull();
    });

    it("shows the banner after deactivating", async () => {
      getClientMock.mockResolvedValue(active);
      previewMock.mockResolvedValue({ upcomingBookings: 0, hasCurrentPlan: true, autoDebits: 0, recoverySessionsLeft: 0 });
      deactivateMock.mockResolvedValue(deactivated);
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByText("Al día");
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Dar de baja" }));
      await screen.findByText("No tiene reservas futuras.");
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }));

      expect(await screen.findByText("Dado de baja el 02/11/2026 por Valentina Velásquez · Se mudó")).toBeDefined();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByText("Al día")).toBeNull();
    });

    it("shows the banner gone and the payment status back after reactivating", async () => {
      getClientMock.mockResolvedValue(deactivated);
      reactivateMock.mockResolvedValue(active);
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByText(/Dado de baja el/);
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Reactivar" }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reactivar" }));

      expect(await screen.findByText("Al día")).toBeDefined();
      expect(screen.queryByText(/Dado de baja el/)).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByRole("button", { name: "Dar de baja" })).toBeDefined();
    });

    it("reloads the client when a dialog reports it stale", async () => {
      getClientMock.mockResolvedValueOnce(active).mockResolvedValueOnce(deactivated);
      previewMock.mockRejectedValue(
        new ApiError({ statusCode: 409, code: "CLIENT_ALREADY_DEACTIVATED", message: "Ya está dado de baja." }),
      );
      renderWithSnackbar(<ClientDetailPanel clientId="c1" />);
      await screen.findByText("Al día");
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Dar de baja" }));

      expect(await screen.findByText(/Dado de baja el/)).toBeDefined();
      expect(getClientMock).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
