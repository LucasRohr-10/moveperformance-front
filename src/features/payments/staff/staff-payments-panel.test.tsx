import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { OfflineChargeDto, OfflineChargeListDto, StaffPaymentDto, StaffPaymentPageDto } from "@/lib/api/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/staff/payments",
}));
vi.mock("./staff-payments-api", () => ({
  listStaffPayments: vi.fn(),
  resolvePayment: vi.fn(),
}));
vi.mock("./offline-charges-api", () => ({
  listOpenOfflineCharges: vi.fn(),
  getReceiptUpload: vi.fn(),
  recordOfflinePayment: vi.fn(),
}));

import { StaffPaymentsPanel } from "./staff-payments-panel";
import { getReceiptUpload, listOpenOfflineCharges, recordOfflinePayment } from "./offline-charges-api";
import { listStaffPayments, resolvePayment } from "./staff-payments-api";

const listMock = vi.mocked(listStaffPayments);
const resolveMock = vi.mocked(resolvePayment);
const openChargesMock = vi.mocked(listOpenOfflineCharges);
const recordMock = vi.mocked(recordOfflinePayment);

function paymentFixture(overrides: Partial<StaffPaymentDto> = {}): StaffPaymentDto {
  return {
    purchaseId: "purchase-1",
    externalReference: "ref-1",
    client: { id: "client-1", name: "Juan Pérez", email: "juan.perez@example.com" },
    kind: "booking",
    itemName: "Rehab — Evaluación inicial",
    service: "rehab",
    amount: 1200,
    currency: "UYU",
    status: "pending",
    needsAttention: true,
    origin: "one_time",
    createdAt: "2026-10-20T12:00:00.000Z",
    approvedAt: null,
    paymentMethod: "mercado_pago",
    planId: "plan-1",
    bookingId: null,
    attentionReason: null,
    attentionNote: null,
    ...overrides,
  };
}

function pageFixture(items: StaffPaymentDto[], overrides: Partial<StaffPaymentPageDto> = {}): StaffPaymentPageDto {
  return { items, total: items.length, page: 1, pageSize: 20, ...overrides };
}

function openCharge(id = "ch1"): OfflineChargeDto {
  return {
    id,
    kind: "booking",
    planStartsOn: null,
    paysWith: null,
    client: { id: "c1", name: "Sofía Pérez", email: "sofia@move.test" },
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

describe("StaffPaymentsPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    openChargesMock.mockResolvedValue({ items: [], total: 0, limitPerClient: 2 });
  });

  it("lists payments and flags the ones that need attention", async () => {
    const maria = paymentFixture({
      purchaseId: "purchase-2",
      client: { id: "client-2", name: "María Fernández", email: "maria.fernandez@example.com" },
      kind: "plan",
      itemName: "Performance Mensual",
      service: "performance",
      status: "approved",
      needsAttention: false,
      approvedAt: "2026-10-18T12:00:00.000Z",
    });
    listMock.mockResolvedValue(pageFixture([paymentFixture(), maria]));

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(await screen.findByText("Juan Pérez")).toBeDefined();
    expect(screen.getByText("María Fernández")).toBeDefined();
    expect(screen.getByText("Requiere revisión")).toBeDefined();
    expect(screen.getByText("2 pagos · 1 de esta página requiere atención")).toBeDefined();
  });

  it("payment row shows \"Turno cancelado por staff\" and the note", async () => {
    listMock.mockResolvedValue(
      pageFixture([
        paymentFixture({
          attentionReason: "booking_cancelled_by_staff",
          attentionNote: "17:00 del 12/11 · Mantenimiento de la sala",
        }),
      ]),
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(await screen.findByText("Turno cancelado por staff")).toBeDefined();
    expect(screen.getByText("17:00 del 12/11 · Mantenimiento de la sala")).toBeDefined();
    expect(screen.queryByText("Requiere revisión")).toBeNull();
    expect(screen.getByRole("button", { name: "Marcar revisado" })).toBeDefined();
  });

  it("shows the payment method instead of the origin for offline rows", async () => {
    listMock.mockResolvedValue(
      pageFixture([
        paymentFixture({
          itemName: "Recovery · vie 6/11, 10:00",
          service: "recovery",
          paymentMethod: "cash",
          needsAttention: false,
        }),
      ]),
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    const origin = await screen.findByText("Reserva · Recovery · Efectivo");
    expect(origin.textContent).not.toContain("Pago único");
  });

  it("shows two decimals for an amount with cents", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture({ amount: 1250.5 })]));

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(await screen.findByText("$ 1.250,50")).toBeDefined();
  });

  it("shows a dash for an offline charge without amount", async () => {
    listMock.mockResolvedValue(
      pageFixture([
        paymentFixture({ paymentMethod: "undecided", amount: null, planId: null, needsAttention: false }),
      ]),
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(await screen.findByText("Reserva · Rehab · A definir")).toBeDefined();
    expect(screen.getByText("—", { selector: "span.block" })).toBeDefined();
    expect(screen.queryByText("$ 0")).toBeNull();
  });

  it("keeps \"Requiere revisión\" when the payment has no reason", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture({ attentionReason: null, attentionNote: null })]));

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(await screen.findByText("Requiere revisión")).toBeDefined();
    expect(screen.queryByText("Turno cancelado por staff")).toBeNull();
  });

  it("shows the loading skeleton and then the error state with retry", async () => {
    listMock.mockRejectedValueOnce(new Error("boom"));
    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(screen.getByText("Cargando pagos…")).toBeDefined();
    expect(await screen.findByText("No pudimos cargar los pagos")).toBeDefined();

    listMock.mockResolvedValue(pageFixture([paymentFixture()]));
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Juan Pérez")).toBeDefined();
  });

  it("shows the empty state for a filtered search with a way to clear it", async () => {
    listMock.mockResolvedValue(pageFixture([]));
    renderWithSnackbar(<StaffPaymentsPanel filter={{ status: "rejected" }} page={1} view="all" />);

    expect(await screen.findByText("No hay pagos con estos filtros")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(push).toHaveBeenCalledWith("/staff/payments");
  });

  it("pushes the selected status into the URL and resets to page 1", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture()]));
    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={3} view="all" />);
    await screen.findByText("Juan Pérez");

    await userEvent.selectOptions(screen.getByLabelText("Estado"), "approved");

    expect(push).toHaveBeenCalledWith("/staff/payments?status=approved");
  });

  it("toggles the needs-attention filter", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture()]));
    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);
    await screen.findByText("Juan Pérez");

    const toggle = screen.getByRole("button", { name: "Solo con atención requerida" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(toggle);

    expect(push).toHaveBeenCalledWith("/staff/payments?needsAttention=true");
  });

  it("shows which client a clientId filter is scoped to, and can clear just that filter", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture()]));
    renderWithSnackbar(<StaffPaymentsPanel filter={{ clientId: "client-1" }} page={1} view="all" />);
    await screen.findByText("Juan Pérez");

    expect(screen.getByText("Mostrando solo los pagos de Juan Pérez.")).toBeDefined();
    expect(listMock).toHaveBeenCalledWith({ clientId: "client-1" }, 1);

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro" }));

    expect(push).toHaveBeenCalledWith("/staff/payments");
  });

  it("keeps the clientId filter when another filter changes", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture()]));
    renderWithSnackbar(<StaffPaymentsPanel filter={{ clientId: "client-1" }} page={1} view="all" />);
    await screen.findByText("Juan Pérez");

    await userEvent.selectOptions(screen.getByLabelText("Estado"), "approved");

    expect(push).toHaveBeenCalledWith("/staff/payments?status=approved&clientId=client-1");
  });

  it("offers to mark a flagged payment as reviewed, without touching the others", async () => {
    const maria = paymentFixture({
      purchaseId: "purchase-2",
      client: { id: "client-2", name: "María Fernández", email: "maria.fernandez@example.com" },
      needsAttention: true,
    });
    listMock.mockResolvedValue(pageFixture([paymentFixture(), maria]));
    resolveMock.mockResolvedValue({ ...paymentFixture(), needsAttention: false });
    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);
    await screen.findByText("Juan Pérez");

    const [firstAction] = screen.getAllByRole("button", { name: "Marcar revisado" });
    await userEvent.click(firstAction);

    const dialog = screen.getByRole("dialog", { name: "¿Marcar este pago como revisado?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Marcar revisado" }));

    expect(resolveMock).toHaveBeenCalledWith("purchase-1");
    expect(await screen.findByText("2 pagos · 1 de esta página requiere atención")).toBeDefined();
    // María's own action stays put: only the reviewed row changed.
    expect(screen.getAllByRole("button", { name: "Marcar revisado" })).toHaveLength(1);
  });

  it("shows an error and keeps the dialog open when resolving fails", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture()]));
    resolveMock.mockRejectedValue(new Error("boom"));
    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);
    await screen.findByText("Juan Pérez");

    await userEvent.click(screen.getByRole("button", { name: "Marcar revisado" }));
    const dialog = screen.getByRole("dialog", { name: "¿Marcar este pago como revisado?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Marcar revisado" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos marcar el pago como revisado. Probá de nuevo.",
    );
    expect(screen.getByRole("dialog", { name: "¿Marcar este pago como revisado?" })).toBeDefined();
    expect(screen.getByText("Requiere revisión")).toBeDefined();
  });

  it("paginates, disabling Anterior on the first page", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture()], { total: 45, page: 1, pageSize: 20 }));
    renderWithSnackbar(<StaffPaymentsPanel filter={{ status: "pending" }} page={1} view="all" />);
    await screen.findByText("Juan Pérez");

    expect(screen.getByText("Mostrando 1–20 de 45")).toBeDefined();
    expect((screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(push).toHaveBeenCalledWith("/staff/payments?status=pending&page=2");
  });
  it("shows the to-collect count next to the views", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture()]));
    openChargesMock.mockResolvedValue({ items: [], total: 3, limitPerClient: 2 });

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(await screen.findByRole("link", { name: "Por cobrar · 3" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Todos" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the views without a count when it cannot be loaded", async () => {
    listMock.mockResolvedValue(pageFixture([paymentFixture()]));
    openChargesMock.mockRejectedValue(new Error("boom"));

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    await screen.findByText("Juan Pérez");
    expect(screen.getByRole("link", { name: "Por cobrar" })).toBeDefined();
  });

  it("shows the to-collect list instead of the table and filters in the to-collect view", async () => {
    const open: OfflineChargeDto = {
      id: "ch1",
      kind: "booking",
      planStartsOn: null,
      paysWith: null,
      client: { id: "c1", name: "Sofía Pérez", email: "sofia@move.test" },
      bookingId: "b1",
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
    openChargesMock.mockResolvedValue({ items: [open], total: 1, limitPerClient: 2 });

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" />);

    expect(await screen.findByRole("button", { name: /Marcar como pagado/ })).toBeDefined();
    expect(listMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByLabelText("Buscar cliente")).toBeNull();
    expect(screen.queryByLabelText("Estado")).toBeNull();
    expect(screen.getByRole("link", { name: "Por cobrar · 1" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("filters the to-collect list by the clientId of the URL and keeps the chip's count unfiltered", async () => {
    openChargesMock.mockImplementation(async (filter) =>
      filter.clientId ? { items: [], total: 1, limitPerClient: 2 } : { items: [], total: 9, limitPerClient: 2 },
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{ clientId: "c1" }} page={1} view="to-collect" />);

    await waitFor(() => expect(openChargesMock).toHaveBeenCalledWith({ clientId: "c1" }));
    expect(await screen.findByRole("link", { name: "Por cobrar · 9" })).toBeDefined();
  });

  it("filters the to-collect list to the overdue ones and keeps the chip's count unfiltered", async () => {
    let resolveCount: (value: OfflineChargeListDto) => void = () => {};
    const unfiltered = new Promise<OfflineChargeListDto>((resolve) => {
      resolveCount = resolve;
    });
    openChargesMock.mockImplementation((filter) =>
      filter.overdue ? Promise.resolve({ items: [], total: 1, limitPerClient: 2 }) : unfiltered,
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" overdueOnly />);

    await waitFor(() => expect(openChargesMock).toHaveBeenCalledWith({ overdue: true }));
    expect(await screen.findByText("No hay cobros atrasados")).toBeDefined();
    // Only the overdue answer is in: the chip must not borrow its total.
    expect(screen.queryByRole("link", { name: /Por cobrar · / })).toBeNull();

    resolveCount({ items: [], total: 9, limitPerClient: 2 });

    expect(await screen.findByRole("link", { name: "Por cobrar · 9" })).toBeDefined();
  });

  it("filters the to-collect list to today's and keeps the chip's count unfiltered", async () => {
    let resolveCount: (value: OfflineChargeListDto) => void = () => {};
    const unfiltered = new Promise<OfflineChargeListDto>((resolve) => {
      resolveCount = resolve;
    });
    openChargesMock.mockImplementation((filter) =>
      filter.today ? Promise.resolve({ items: [], total: 2, limitPerClient: 2 }) : unfiltered,
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" todayOnly />);

    await waitFor(() => expect(openChargesMock).toHaveBeenCalledWith({ today: true }));
    expect(await screen.findByText("No hay cobros para hoy")).toBeDefined();
    expect(screen.queryByRole("link", { name: /Por cobrar · / })).toBeNull();

    resolveCount({ items: [], total: 6, limitPerClient: 2 });

    expect(await screen.findByRole("link", { name: "Por cobrar · 6" })).toBeDefined();
  });

  it("shows loading instead of the previous rows when the today filter changes", async () => {
    openChargesMock.mockResolvedValueOnce({ items: [openCharge()], total: 1, limitPerClient: 2 });
    const { rerender } = renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" />);
    expect(await screen.findByRole("button", { name: /Marcar como pagado/ })).toBeDefined();

    openChargesMock.mockReturnValue(new Promise(() => {}));
    rerender(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" todayOnly />);

    expect(await screen.findByRole("status")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Marcar como pagado/ })).toBeNull();
  });

  it("shows loading instead of the previous rows when the overdue filter changes", async () => {
    openChargesMock.mockResolvedValueOnce({ items: [openCharge()], total: 1, limitPerClient: 2 });
    const { rerender } = renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" />);
    expect(await screen.findByRole("button", { name: /Marcar como pagado/ })).toBeDefined();

    openChargesMock.mockReturnValue(new Promise(() => {}));
    rerender(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" overdueOnly />);

    expect(await screen.findByRole("status")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Marcar como pagado/ })).toBeNull();
  });

  describe("to-collect view filtered by client", () => {

    it("says it is filtered by the client and can clear just that filter", async () => {
      openChargesMock.mockImplementation(async (filter) =>
        filter.clientId
          ? { items: [openCharge("ch1")], total: 1, limitPerClient: 2 }
          : { items: [], total: 4, limitPerClient: 2 },
      );

      renderWithSnackbar(<StaffPaymentsPanel filter={{ clientId: "c1" }} page={1} view="to-collect" />);

      expect(await screen.findByText("Mostrando solo los pagos de Sofía Pérez.")).toBeDefined();

      await userEvent.click(screen.getByRole("button", { name: "Quitar filtro" }));

      expect(push).toHaveBeenCalledWith("/staff/payments?view=to-collect");
    });

    it("keeps the today filter when it clears just the client", async () => {
      openChargesMock.mockResolvedValue({ items: [openCharge("ch1")], total: 1, limitPerClient: 2 });

      renderWithSnackbar(<StaffPaymentsPanel filter={{ clientId: "c1" }} page={1} view="to-collect" todayOnly />);

      await screen.findByText("Mostrando solo los pagos de Sofía Pérez.");
      await userEvent.click(screen.getByRole("button", { name: "Quitar filtro" }));

      expect(push).toHaveBeenCalledWith("/staff/payments?view=to-collect&dia=hoy");
    });

    it("falls back to este cliente when the client has nothing open", async () => {
      openChargesMock.mockResolvedValue({ items: [], total: 0, limitPerClient: 2 });

      renderWithSnackbar(<StaffPaymentsPanel filter={{ clientId: "c1" }} page={1} view="to-collect" />);

      expect(await screen.findByText("Mostrando solo los pagos de este cliente.")).toBeDefined();
    });

    it("does not show the hint without a client filter", async () => {
      openChargesMock.mockResolvedValue({ items: [openCharge("ch1")], total: 1, limitPerClient: 2 });

      renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" />);

      await screen.findByRole("button", { name: /Marcar como pagado/ });
      expect(screen.queryByRole("button", { name: "Quitar filtro" })).toBeNull();
    });

    it("refreshes the chip's count after Marcar como pagado", async () => {
      let globalTotal = 4;
      openChargesMock.mockImplementation(async (filter) =>
        filter.clientId
          ? { items: [openCharge("ch1")], total: 1, limitPerClient: 2 }
          : { items: [], total: globalTotal, limitPerClient: 2 },
      );
      vi.mocked(getReceiptUpload).mockResolvedValue({ available: false, maxBytes: 5242880, allowedTypes: [] });
      recordMock.mockImplementation(async () => {
        globalTotal = 3;
        return { ...openCharge("ch1"), status: "approved", payments: [] };
      });

      renderWithSnackbar(<StaffPaymentsPanel filter={{ clientId: "c1" }} page={1} view="to-collect" />);
      expect(await screen.findByRole("link", { name: "Por cobrar · 4" })).toBeDefined();

      await userEvent.click(await screen.findByRole("button", { name: /Marcar como pagado/ }));
      await userEvent.click(await screen.findByRole("button", { name: "Confirmar pago" }));

      expect(await screen.findByRole("link", { name: "Por cobrar · 3" })).toBeDefined();
    });
  });

  it("asks for the open charges once when the unfiltered to-collect view loads", async () => {
    openChargesMock.mockResolvedValue({ items: [], total: 2, limitPerClient: 2 });

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="to-collect" />);

    expect(await screen.findByRole("link", { name: "Por cobrar · 2" })).toBeDefined();
    expect(openChargesMock).toHaveBeenCalledTimes(1);
  });

  it("offers Ver detalle for offline rows only", async () => {
    listMock.mockResolvedValue(
      pageFixture([
        paymentFixture({ purchaseId: "off 1", paymentMethod: "cash", needsAttention: false }),
        paymentFixture({
          purchaseId: "mp-1",
          client: { id: "client-2", name: "María Fernández", email: "maria@example.com" },
          needsAttention: false,
        }),
      ]),
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    await screen.findByText("María Fernández");
    const links = screen.getAllByRole("link", { name: "Ver detalle" });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/staff/payments/offline-charges/off%201");
  });

  it("labels a waived charge No se cobra and the filter Estado offers it", async () => {
    listMock.mockResolvedValue(
      pageFixture([paymentFixture({ status: "waived", paymentMethod: "cash", needsAttention: false })]),
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    const row = (await screen.findByText("Juan Pérez")).closest("tr") as HTMLElement;
    expect(within(row).getByText("No se cobra")).toBeDefined();
    expect(within(screen.getByLabelText("Estado")).getByRole("option", { name: "No se cobra" })).toBeDefined();
  });

  it("explains what to do with a cancelled offline booking that was paid", async () => {
    listMock.mockResolvedValue(
      pageFixture([
        paymentFixture({
          paymentMethod: "cash",
          status: "approved",
          attentionReason: "offline_booking_cancelled",
          attentionNote: "Pagó $ 900 en efectivo",
        }),
      ]),
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(await screen.findByText("Reserva por fuera cancelada")).toBeDefined();
    expect(screen.getByText("Pagó $ 900 en efectivo")).toBeDefined();
    expect(
      screen.getByText("Qué hacer: devolverle la plata o usar ese pago para otro turno, y después tocar Marcar revisado."),
    ).toBeDefined();
  });

  it("explains what to do when the client cancelled a booking that was already paid", async () => {
    listMock.mockResolvedValue(
      pageFixture([
        paymentFixture({
          paymentMethod: "mercado_pago",
          status: "approved",
          attentionReason: "booking_cancelled_by_client",
          attentionNote: "17:00 del 12/11 · Cancelada por el cliente",
        }),
      ]),
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    expect(await screen.findByText("Reserva cancelada por el cliente")).toBeDefined();
    expect(screen.getByText("17:00 del 12/11 · Cancelada por el cliente")).toBeDefined();
    expect(
      screen.getByText("Qué hacer: el cliente ya pagó y canceló. Devolverle la plata o usar ese pago para otro turno, y después tocar Marcar revisado."),
    ).toBeDefined();
  });

  it("gives no instructions for the other reasons", async () => {
    listMock.mockResolvedValue(
      pageFixture([paymentFixture({ attentionReason: "booking_cancelled_by_staff", attentionNote: "x" })]),
    );

    renderWithSnackbar(<StaffPaymentsPanel filter={{}} page={1} view="all" />);

    await screen.findByText("Turno cancelado por staff");
    expect(screen.queryByText(/Qué hacer/)).toBeNull();
  });
});
