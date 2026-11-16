import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { OfflineChargeDetailDto, OfflineChargeDto } from "@/lib/api/types";

import { getReceiptUpload, recordOfflinePayment } from "./offline-charges-api";
import { RecordPaymentButton } from "./record-payment-button";

vi.mock("@/components/ui/snackbar", () => ({ useSnackbar: () => ({ showSnackbar: vi.fn() }) }));
vi.mock("@/features/bookings/slots", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/bookings/slots")>()),
  todayBusinessDate: () => "2026-11-02",
}));
vi.mock("./offline-charges-api", () => ({ getReceiptUpload: vi.fn(), recordOfflinePayment: vi.fn() }));

const CHARGE: OfflineChargeDto = {
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getReceiptUpload).mockResolvedValue({ available: false, maxBytes: 5242880, allowedTypes: [] });
});

describe("RecordPaymentButton", () => {
  it("opens the dialog and calls onChanged after recording", async () => {
    const detail: OfflineChargeDetailDto = { ...CHARGE, status: "approved", payments: [] };
    vi.mocked(recordOfflinePayment).mockResolvedValue(detail);
    const onChanged = vi.fn();
    render(<RecordPaymentButton charge={CHARGE} onChanged={onChanged} />);
    const user = userEvent.setup();
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Marcar como pagado/ }));
    await user.click(screen.getByRole("button", { name: "Confirmar pago" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(onChanged).toHaveBeenCalledWith(detail);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tells screen readers whose charge and what it pays, so two rows of one client sound different", () => {
    const turn: OfflineChargeDto = {
      ...CHARGE,
      kind: "plan",
      paysWith: { itemName: "Mensual" },
      service: "performance",
      itemName: "Mensual",
      booking: { startsAt: "2026-11-10T22:00:00.000Z", status: "confirmed" },
    };
    const plan = { ...turn, paysWith: null, booking: null, bookingId: null, planStartsOn: "2026-11-04" };
    const { unmount } = render(<RecordPaymentButton charge={turn} onChanged={vi.fn()} />);
    const turnName = screen.getByRole("button", { name: /Marcar como pagado/ }).getAttribute("aria-label");
    unmount();
    render(<RecordPaymentButton charge={plan} onChanged={vi.fn()} />);
    const planName = screen.getByRole("button", { name: /Marcar como pagado/ }).getAttribute("aria-label");

    expect(turnName).toBe("Marcar como pagado: Sofía Pérez, Turno Performance, Mar 10/11 19:00");
    expect(planName).toBe("Marcar como pagado: Sofía Pérez, Plan Mensual · Performance, Desde 04/11");
  });

  it("calls onChanged and closes when the charge is no longer open", async () => {
    vi.mocked(recordOfflinePayment).mockRejectedValue(
      new ApiError({ statusCode: 409, code: "OFFLINE_CHARGE_NOT_OPEN", message: "Ya no está abierto." }),
    );
    const onChanged = vi.fn();
    render(<RecordPaymentButton charge={CHARGE} onChanged={onChanged} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Marcar como pagado/ }));
    await user.click(screen.getByRole("button", { name: "Confirmar pago" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(onChanged).toHaveBeenCalledWith();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes with Cancelar without calling onChanged", async () => {
    const onChanged = vi.fn();
    render(<RecordPaymentButton charge={CHARGE} onChanged={onChanged} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Marcar como pagado/ }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
