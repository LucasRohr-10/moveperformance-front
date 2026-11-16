import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfflineChargeDetailDto, OfflineChargeDto, OfflineChargeListDto } from "@/lib/api/types";

import { listOpenOfflineCharges } from "./offline-charges-api";
import { ToCollectList } from "./to-collect-list";

vi.mock("./offline-charges-api", () => ({
  listOpenOfflineCharges: vi.fn(),
  getReceiptUpload: vi.fn(),
  recordOfflinePayment: vi.fn(),
}));
vi.mock("./record-payment-button", () => ({
  RecordPaymentButton: ({
    charge,
    onChanged,
  }: {
    charge: OfflineChargeDto;
    onChanged(detail?: OfflineChargeDetailDto): void;
  }) => (
    <button type="button" onClick={() => onChanged()}>
      {`Marcar como pagado ${charge.id}`}
    </button>
  ),
}));

const listMock = vi.mocked(listOpenOfflineCharges);

function charge(overrides: Partial<OfflineChargeDto> = {}): OfflineChargeDto {
  return {
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
    ...overrides,
  };
}

function list(items: OfflineChargeDto[]): OfflineChargeListDto {
  return { items, total: items.length, limitPerClient: 2 };
}

beforeEach(() => vi.resetAllMocks());

describe("ToCollectList", () => {
  it("lists every open charge in the API order with client, title, method and Marcar como pagado", async () => {
    listMock.mockResolvedValue(
      list([
        charge({ id: "ch2", client: { id: "c2", name: "Bruno Gómez", email: "b@move.test" }, paymentMethod: "undecided", amount: null }),
        charge({ id: "ch1" }),
      ]),
    );

    render(<ToCollectList />);

    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Bruno Gómez")).toBeDefined();
    expect(within(rows[0]).getByText("A definir")).toBeDefined();
    expect(within(rows[0]).getByRole("button", { name: "Marcar como pagado ch2" })).toBeDefined();
    expect(within(rows[1]).getByText("Sofía Pérez")).toBeDefined();
    expect(within(rows[1]).getByText("Sesión de Recovery · Recovery")).toBeDefined();
    expect(within(rows[1]).getByText("Vie 6/11 10:00")).toBeDefined();
    expect(within(rows[1]).getByText("Efectivo")).toBeDefined();
    expect(within(rows[1]).getByText("$ 900")).toBeDefined();
    expect(listMock).toHaveBeenCalledWith({});
  });

  describe("an unpaid plan and the turns booked with it", () => {
    const planCharge = (overrides: Partial<OfflineChargeDto> = {}) =>
      charge({
        id: "ch-plan",
        kind: "plan",
        planStartsOn: "2026-11-04",
        bookingId: null,
        booking: null,
        service: "performance",
        itemName: "Mensual",
        amount: 2700,
        ...overrides,
      });
    const turnOfThePlan = (bookingId: string, startsAt: string) =>
      planCharge({
        bookingId,
        booking: { startsAt, status: "confirmed" },
        paysWith: { itemName: "Mensual" },
      });

    it("shows the plan with since when it runs, and its amount", async () => {
      listMock.mockResolvedValue(list([planCharge()]));

      render(<ToCollectList />);

      const row = (await screen.findAllByRole("listitem"))[0];
      expect(within(row).getByRole("link", { name: "Plan Mensual · Performance" })).toBeDefined();
      expect(within(row).getByText("Desde 04/11")).toBeDefined();
      expect(within(row).getByText("$ 2.700")).toBeDefined();
    });

    it("shows a turn of the plan with what it is paid with and no amount of its own", async () => {
      listMock.mockResolvedValue(list([turnOfThePlan("b1", "2026-11-10T22:00:00.000Z")]));

      render(<ToCollectList />);

      const row = (await screen.findAllByRole("listitem"))[0];
      expect(within(row).getByRole("link", { name: "Turno Performance" })).toBeDefined();
      expect(within(row).getByText("Mar 10/11 19:00")).toBeDefined();
      expect(within(row).getByText("Se paga con el plan Mensual")).toBeDefined();
      expect(within(row).queryByText("$ 2.700")).toBeNull();
      expect(within(row).getByText("—")).toBeDefined();
    });

    it("lists the plan and two turns of it without repeating a key", async () => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
      listMock.mockResolvedValue(
        list([
          planCharge(),
          turnOfThePlan("b1", "2026-11-10T22:00:00.000Z"),
          turnOfThePlan("b2", "2026-11-12T22:00:00.000Z"),
        ]),
      );

      render(<ToCollectList />);

      expect(await screen.findAllByRole("listitem")).toHaveLength(3);
      expect(errors.mock.calls.flat().join(" ")).not.toContain("same key");
      errors.mockRestore();
    });

    it("does not call the plan's own row a turn that already passed", async () => {
      listMock.mockResolvedValue(
        list([
          planCharge({ slotStarted: true }),
          turnOfThePlan("b1", "2026-11-10T22:00:00.000Z"),
          { ...turnOfThePlan("b0", "2026-11-03T22:00:00.000Z"), slotStarted: true },
        ]),
      );

      render(<ToCollectList />);

      const rows = await screen.findAllByRole("listitem");
      expect(within(rows[0]).queryByText("turno ya pasó")).toBeNull();
      expect(within(rows[1]).queryByText("turno ya pasó")).toBeNull();
      expect(within(rows[2]).getByText("turno ya pasó")).toBeDefined();
    });

    it("gives the button the charge of the plan, from the row of a turn", async () => {
      listMock.mockResolvedValue(list([turnOfThePlan("b1", "2026-11-10T22:00:00.000Z")]));

      render(<ToCollectList />);

      expect(await screen.findByRole("button", { name: "Marcar como pagado ch-plan" })).toBeDefined();
    });
  });

  it("filters by clientId from the URL", async () => {
    listMock.mockResolvedValue(list([charge()]));

    render(<ToCollectList clientId="c1" />);

    await screen.findByText("Sofía Pérez");
    expect(listMock).toHaveBeenCalledWith({ clientId: "c1" });
  });

  it("marks a charge whose slot started with turno ya pasó", async () => {
    listMock.mockResolvedValue(list([charge({ id: "ch1", slotStarted: true }), charge({ id: "ch2" })]));

    render(<ToCollectList />);

    const rows = await screen.findAllByRole("listitem");
    const badge = within(rows[0]).getByText("turno ya pasó");
    expect(badge.className).toContain("text-danger");
    expect(within(rows[1]).queryByText("turno ya pasó")).toBeNull();
  });

  it("links each one to its detail", async () => {
    listMock.mockResolvedValue(list([charge({ id: "ch 1" })]));

    render(<ToCollectList />);

    const link = await screen.findByRole("link", { name: "Sesión de Recovery · Recovery" });
    expect(link.getAttribute("href")).toBe("/staff/payments/offline-charges/ch%201");
  });

  it("links the client to their record", async () => {
    listMock.mockResolvedValue(list([charge()]));

    render(<ToCollectList />);

    expect((await screen.findByRole("link", { name: "Sofía Pérez" })).getAttribute("href")).toBe("/staff/clients/c1");
  });

  it("reloads after a payment is recorded", async () => {
    listMock.mockResolvedValueOnce(list([charge()])).mockResolvedValueOnce(list([]));
    render(<ToCollectList />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Marcar como pagado ch1" }));

    expect(await screen.findByText("No hay nada por cobrar")).toBeDefined();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("tells the parent how many are left", async () => {
    listMock.mockResolvedValue({ items: [charge()], total: 7, limitPerClient: 2 });
    const onTotalChange = vi.fn();

    render(<ToCollectList onTotalChange={onTotalChange} />);

    await waitFor(() => expect(onTotalChange).toHaveBeenCalledWith(7));
  });

  it("shows the empty state", async () => {
    listMock.mockResolvedValue(list([]));

    render(<ToCollectList />);

    expect(await screen.findByText("No hay nada por cobrar")).toBeDefined();
    expect(
      screen.getByText("Cuando Staff reserve un turno que se cobra por fuera va a aparecer acá."),
    ).toBeDefined();
  });

  it("asks the API for overdue charges when overdueOnly is set", async () => {
    listMock.mockResolvedValue(list([charge()]));

    render(<ToCollectList overdueOnly clientId="c1" />);

    await screen.findByText("Sofía Pérez");
    expect(listMock).toHaveBeenCalledWith({ clientId: "c1", overdue: true });
  });

  it("does not send overdue when the list is not filtered", async () => {
    listMock.mockResolvedValue(list([charge()]));

    render(<ToCollectList />);

    await screen.findByText("Sofía Pérez");
    expect(listMock).toHaveBeenCalledWith({});
  });

  it("offers Solo atrasados as a link that turns the filter on, and off again", async () => {
    listMock.mockResolvedValue(list([charge()]));
    const { unmount } = render(<ToCollectList />);

    const chip = await screen.findByRole("link", { name: "Solo atrasados" });
    expect(chip.getAttribute("href")).toBe("/staff/payments?view=to-collect&atrasados=true");
    expect(chip.getAttribute("aria-current")).toBeNull();
    unmount();

    render(<ToCollectList overdueOnly />);

    const current = await screen.findByRole("link", { name: "Solo atrasados" });
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.getAttribute("href")).toBe("/staff/payments?view=to-collect");
  });

  it("asks the API with today=true when dia=hoy", async () => {
    listMock.mockResolvedValue(list([charge()]));

    render(<ToCollectList todayOnly />);

    await screen.findByText("Sofía Pérez");
    expect(listMock).toHaveBeenCalledWith({ today: true });
  });

  it("offers Solo de hoy as a link that turns the filter on, and off again", async () => {
    listMock.mockResolvedValue(list([charge()]));
    const { unmount } = render(<ToCollectList />);

    const chip = await screen.findByRole("link", { name: "Solo de hoy" });
    expect(chip.getAttribute("href")).toBe("/staff/payments?view=to-collect&dia=hoy");
    expect(chip.getAttribute("aria-current")).toBeNull();
    unmount();

    render(<ToCollectList todayOnly />);

    const current = await screen.findByRole("link", { name: "Solo de hoy" });
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.getAttribute("href")).toBe("/staff/payments?view=to-collect");
  });

  it("keeps the client in the Solo de hoy link", async () => {
    listMock.mockResolvedValue(list([charge()]));

    render(<ToCollectList clientId="c1" />);

    expect((await screen.findByRole("link", { name: "Solo de hoy" })).getAttribute("href")).toBe(
      "/staff/payments?view=to-collect&clientId=c1&dia=hoy",
    );
  });

  it("Solo de hoy and Solo atrasados are not both on", async () => {
    listMock.mockResolvedValue(list([charge()]));

    render(<ToCollectList todayOnly />);

    const overdue = await screen.findByRole("link", { name: "Solo atrasados" });
    const today = screen.getByRole("link", { name: "Solo de hoy" });
    expect(today.getAttribute("aria-current")).toBe("true");
    expect(overdue.getAttribute("aria-current")).toBeNull();
    // Turning the other one on replaces this one instead of adding to it.
    expect(overdue.getAttribute("href")).toBe("/staff/payments?view=to-collect&atrasados=true");
  });

  it("empty state says No hay cobros para hoy", async () => {
    listMock.mockResolvedValue(list([]));

    render(<ToCollectList todayOnly />);

    expect(await screen.findByText("No hay cobros para hoy")).toBeDefined();
  });

  it("keeps the client in the Solo atrasados link", async () => {
    listMock.mockResolvedValue(list([charge()]));

    render(<ToCollectList clientId="c1" />);

    expect((await screen.findByRole("link", { name: "Solo atrasados" })).getAttribute("href")).toBe(
      "/staff/payments?view=to-collect&clientId=c1&atrasados=true",
    );
  });

  it("says nobody owes from earlier days when the overdue list is empty", async () => {
    listMock.mockResolvedValue(list([]));

    render(<ToCollectList overdueOnly />);

    expect(await screen.findByText("No hay cobros atrasados")).toBeDefined();
  });

  it("shows the error with Reintentar", async () => {
    listMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(list([charge()]));
    render(<ToCollectList />);
    const user = userEvent.setup();

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos cargar lo que hay por cobrar");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Sofía Pérez")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
