import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { OfflineChargeDetailDto, OfflinePaymentDto } from "@/lib/api/types";

import {
  getOfflineCharge,
  getReceiptUpload,
  getStaffReceiptLink,
  recordOfflinePayment,
  waiveOfflineCharge,
} from "./offline-charges-api";
import { OfflineChargeDetailPanel } from "./offline-charge-detail-panel";
import { openReceipt } from "./open-receipt";

const showSnackbar = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/snackbar", () => ({ useSnackbar: () => ({ showSnackbar }) }));
vi.mock("@/features/bookings/slots", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/bookings/slots")>()),
  todayBusinessDate: () => "2026-11-02",
}));
vi.mock("./offline-charges-api", () => ({
  getOfflineCharge: vi.fn(),
  getReceiptUpload: vi.fn(),
  getStaffReceiptLink: vi.fn(),
  recordOfflinePayment: vi.fn(),
  waiveOfflineCharge: vi.fn(),
}));
vi.mock("./open-receipt", () => ({ openReceipt: vi.fn() }));

const getMock = vi.mocked(getOfflineCharge);
const waiveMock = vi.mocked(waiveOfflineCharge);
const openReceiptMock = vi.mocked(openReceipt);

const RECORD: OfflinePaymentDto = {
  id: "p1",
  method: "transfer",
  amount: 900,
  currency: "UYU",
  paidOn: "2026-11-02",
  note: "Desde la cuenta de la madre",
  hasReceipt: true,
  recordedAt: "2026-11-02T15:30:00.000Z",
  recordedBy: { id: "s2", name: "Valentina" },
  voidedAt: null,
  voidedBy: null,
  voidReason: null,
};
const VOIDED: OfflinePaymentDto = {
  ...RECORD,
  id: "p0",
  method: "cash",
  amount: 800,
  paidOn: "2026-11-01",
  note: null,
  hasReceipt: false,
  recordedAt: "2026-11-01T15:00:00.000Z",
  voidedAt: "2026-11-02T10:00:00.000Z",
  voidedBy: { id: "s3", name: "Leo" },
  voidReason: "Se anotó mal",
};

const PENDING: OfflineChargeDetailDto = {
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
  bookedBy: { id: "s1", name: "Staff Uno" },
  closedAt: null,
  closedBy: null,
  closeReason: null,
  needsAttention: false,
  attentionReason: null,
  attentionNote: null,
  payment: null,
  payments: [],
};
const APPROVED: OfflineChargeDetailDto = {
  ...PENDING,
  status: "approved",
  paymentMethod: "transfer",
  payment: RECORD,
  payments: [RECORD, VOIDED],
};

function apiError(statusCode: number, code: string, message = "Mensaje del back.") {
  return new ApiError({ statusCode, code, message });
}

async function renderPanel(detail: OfflineChargeDetailDto = PENDING) {
  getMock.mockResolvedValue(detail);
  render(<OfflineChargeDetailPanel chargeId="ch1" />);
  await screen.findByRole("heading", { level: 1 });
}

function valueOf(label: string): string {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent ?? "";
}

function button(name: string): HTMLElement | null {
  return screen.queryByRole("button", { name: new RegExp(name) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getReceiptUpload).mockResolvedValue({ available: false, maxBytes: 5242880, allowedTypes: [] });
});

const PLAN_CHARGE: OfflineChargeDetailDto = {
  ...PENDING,
  kind: "plan",
  planStartsOn: "2026-11-04",
  bookingId: null,
  booking: null,
  service: "performance",
  itemName: "Mensual",
  amount: 2700,
  slotStarted: false,
};

describe("OfflineChargeDetailPanel for an unpaid plan", () => {
  it("shows the plan, not a reservation, and since when it runs", async () => {
    await renderPanel(PLAN_CHARGE);

    expect(screen.getByRole("heading", { level: 1, name: "Cobro por fuera · Sofía Pérez" })).toBeDefined();
    expect(valueOf("Plan")).toBe("Performance · Mensual");
    expect(valueOf("Desde")).toBe("04/11/2026");
    expect(screen.queryByText("Reserva", { selector: "dt" })).toBeNull();
    expect(valueOf("Monto")).toBe("$ 2.700");
  });

  it("calls a Recovery pack a Paquete, not a Plan", async () => {
    await renderPanel({ ...PLAN_CHARGE, service: "recovery", itemName: "Paquete 4 sesiones" });

    expect(valueOf("Paquete")).toBe("Recovery · Paquete 4 sesiones");
    expect(screen.queryByText("Plan", { selector: "dt" })).toBeNull();
  });

  it("offers No se cobra only once the plan started", async () => {
    await renderPanel(PLAN_CHARGE);
    expect(button("No se cobra")).toBeNull();
  });

  it("offers No se cobra when the API says the plan already started", async () => {
    await renderPanel({ ...PLAN_CHARGE, slotStarted: true });
    expect(button("No se cobra")).not.toBeNull();
  });
});

describe("OfflineChargeDetailPanel", () => {
  it("shows the booking, status, method, amount and who booked", async () => {
    await renderPanel();

    expect(screen.getByRole("heading", { level: 1, name: "Cobro por fuera · Sofía Pérez" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Pagos" }).getAttribute("href")).toBe("/staff/payments");
    expect(getMock).toHaveBeenCalledWith("ch1");
    expect(valueOf("Reserva")).toBe("Recovery · vie 6/11, 10:00");
    expect(valueOf("Estado")).toBe("Por cobrar");
    expect(valueOf("Medio")).toBe("Efectivo");
    expect(valueOf("Monto")).toBe("$ 900");
    expect(valueOf("Reservó")).toBe("Staff Uno · 02/11 09:00");
    expect(screen.queryByText("Cerrado", { selector: "dt" })).toBeNull();
    expect(screen.queryByText("Pagos registrados")).toBeNull();
  });

  it("shows a dash when the charge has no amount yet", async () => {
    await renderPanel({ ...PENDING, amount: null, paymentMethod: "undecided" });

    expect(valueOf("Monto")).toBe("—");
    expect(valueOf("Medio")).toBe("A definir");
  });

  it("lists every record with voided ones marked Anulado and who voided it", async () => {
    await renderPanel(APPROVED);

    expect(screen.getByRole("heading", { level: 2, name: "Pagos registrados" })).toBeDefined();
    const section = screen.getByRole("region", { name: "Pagos registrados" });
    const [current, voided] = within(section).getAllByRole("listitem");

    expect(within(current).getByText("Transferencia · $ 900")).toBeDefined();
    expect(within(current).queryByText("Anulado")).toBeNull();
    expect(within(current).getByText("Valentina · 02/11 12:30")).toBeDefined();
    expect(within(current).getByText("02/11/2026")).toBeDefined();
    expect(within(current).getByText("Desde la cuenta de la madre")).toBeDefined();
    expect(within(current).getByRole("button", { name: "Ver comprobante" })).toBeDefined();

    expect(within(voided).getByText("Efectivo · $ 800")).toBeDefined();
    expect(within(voided).getByText("Anulado")).toBeDefined();
    expect(within(voided).getByText("Leo · 02/11 07:00 · Se anotó mal")).toBeDefined();
    expect(within(voided).queryByRole("button", { name: "Ver comprobante" })).toBeNull();
    expect(within(voided).queryByText("Nota", { selector: "dt" })).toBeNull();
  });

  it("opens a receipt from a record", async () => {
    openReceiptMock.mockImplementation(async (getLink) => {
      await getLink();
      return true;
    });
    await renderPanel(APPROVED);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ver comprobante" }));

    expect(getStaffReceiptLink).toHaveBeenCalledWith("ch1", "p1");
    expect(showSnackbar).not.toHaveBeenCalled();
  });

  it("says so when the receipt cannot be opened", async () => {
    openReceiptMock.mockResolvedValue(false);
    await renderPanel(APPROVED);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ver comprobante" }));

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({
        tone: "danger",
        title: "No pudimos abrir el comprobante. Probá de nuevo.",
      }),
    );
  });

  it("offers Marcar como pagado only while pending", async () => {
    await renderPanel(PENDING);
    expect(button("Marcar como pagado")).not.toBeNull();
  });

  it.each([APPROVED, { ...PENDING, status: "waived" as const }, { ...PENDING, status: "cancelled" as const }])(
    "does not offer Marcar como pagado when it is %#",
    async (detail) => {
      await renderPanel(detail);
      expect(button("Marcar como pagado")).toBeNull();
    },
  );

  it("shows the charge as paid after recording a payment", async () => {
    vi.mocked(recordOfflinePayment).mockResolvedValue(APPROVED);
    await renderPanel(PENDING);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Marcar como pagado/ }));
    await user.click(screen.getByRole("button", { name: "Confirmar pago" }));

    expect(await screen.findByText("Pagos registrados")).toBeDefined();
    expect(valueOf("Estado")).toBe("Pagado");
    expect(button("Marcar como pagado")).toBeNull();
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("has no Anular pago button, even for a paid charge with a current record", async () => {
    await renderPanel(APPROVED);

    expect(valueOf("Estado")).toBe("Pagado");
    expect(button("Anular pago")).toBeNull();
  });

  it("offers No se cobra only while pending and once the slot started", async () => {
    await renderPanel({ ...PENDING, slotStarted: true });
    expect(button("No se cobra")).not.toBeNull();
  });

  it.each([
    ["the slot has not started", { ...PENDING, slotStarted: false }],
    ["it is paid", { ...APPROVED, slotStarted: true }],
    ["it is waived", { ...PENDING, status: "waived" as const, slotStarted: true }],
  ])("does not offer No se cobra when %s", async (_name, detail) => {
    await renderPanel(detail);
    expect(button("No se cobra")).toBeNull();
  });

  it("waives with the reason", async () => {
    waiveMock.mockResolvedValue({
      ...PENDING,
      slotStarted: true,
      status: "waived",
      closedAt: "2026-11-02T16:00:00.000Z",
      closedBy: { id: "s1", name: "Staff Uno" },
      closeReason: "Cortesía",
    });
    await renderPanel({ ...PENDING, slotStarted: true });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "No se cobra" }));
    const dialog = screen.getByRole("dialog", { name: "¿Marcar que no se cobra?" });
    expect(
      within(dialog).getByText("El cobro se cierra y libera el lugar del tope. El cliente no ve nada."),
    ).toBeDefined();
    expect(within(dialog).getByPlaceholderText("Ej.: cortesía, no va a pagar")).toBeDefined();
    await user.type(within(dialog).getByLabelText("Motivo"), "Cortesía");
    await user.click(within(dialog).getByRole("button", { name: "No se cobra" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(waiveMock).toHaveBeenCalledWith("ch1", "Cortesía");
    expect(showSnackbar).toHaveBeenCalledWith({ tone: "success", title: "Marcado como que no se cobra." });
    expect(valueOf("Estado")).toBe("No se cobra");
    expect(button("No se cobra")).toBeNull();
  });

  it("keeps the dialog open and shows the fallback when waiving fails", async () => {
    waiveMock.mockRejectedValue(new Error("network"));
    await renderPanel({ ...PENDING, slotStarted: true });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "No se cobra" }));
    await user.type(screen.getByLabelText("Motivo"), "Cortesía");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "No se cobra" }));

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({
        tone: "danger",
        title: "No pudimos cerrar el cobro. Probá de nuevo.",
      }),
    );
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("reloads and shows the API message on a 409", async () => {
    const reloaded: OfflineChargeDetailDto = { ...PENDING, status: "waived" };
    waiveMock.mockRejectedValue(apiError(409, "OFFLINE_CHARGE_SLOT_NOT_STARTED", "El cobro cambió."));
    await renderPanel({ ...PENDING, slotStarted: true });
    getMock.mockResolvedValue(reloaded);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "No se cobra" }));
    await user.type(screen.getByLabelText("Motivo"), "Algo");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "No se cobra" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(showSnackbar).toHaveBeenCalledWith({ tone: "info", title: "El cobro cambió." });
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(valueOf("Estado")).toBe("No se cobra");
  });

  it("shows the closed line for a cancelled or waived charge", async () => {
    await renderPanel({
      ...PENDING,
      status: "waived",
      closedAt: "2026-11-02T16:00:00.000Z",
      closedBy: { id: "s1", name: "Staff Uno" },
      closeReason: "Cortesía",
    });

    expect(valueOf("Cerrado")).toBe("Staff Uno · 02/11 13:00 · Cortesía");
  });

  it("shows the closed line without a name when the system closed it", async () => {
    await renderPanel({
      ...PENDING,
      status: "cancelled",
      closedAt: "2026-11-02T16:00:00.000Z",
      closedBy: null,
      closeReason: "Reserva cancelada",
    });

    expect(valueOf("Estado")).toBe("Cancelado, no se cobró");
    expect(valueOf("Cerrado")).toBe("02/11 13:00 · Reserva cancelada");
  });

  it("shows a dash when the closed line has nothing to say", async () => {
    await renderPanel({
      ...PENDING,
      status: "cancelled",
      closedAt: null,
      closedBy: null,
      closeReason: null,
    });

    expect(valueOf("Cerrado")).toBe("—");
  });

  it("shows a not found state for a 404", async () => {
    getMock.mockRejectedValue(apiError(404, "OFFLINE_CHARGE_NOT_FOUND"));
    render(<OfflineChargeDetailPanel chargeId="nope" />);

    expect(await screen.findByText("El cobro no existe.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Volver a Pagos" }).getAttribute("href")).toBe("/staff/payments");
  });

  it("shows an error with Reintentar", async () => {
    getMock.mockRejectedValueOnce(new Error("boom"));
    render(<OfflineChargeDetailPanel chargeId="ch1" />);

    expect(await screen.findByText("No pudimos cargar el cobro")).toBeDefined();
    getMock.mockResolvedValue(PENDING);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Cobro por fuera · Sofía Pérez" })).toBeDefined();
  });

  it("shows a loading state first", () => {
    getMock.mockReturnValue(new Promise(() => {}));
    render(<OfflineChargeDetailPanel chargeId="ch1" />);

    expect(screen.getByRole("status")).toBeDefined();
  });
});
