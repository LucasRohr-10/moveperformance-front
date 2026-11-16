import { describe, expect, it } from "vitest";

import type { MyPaymentDto } from "@/lib/api/types";

import { GENERIC_DECLINE_MESSAGE } from "./decline-reasons";
import { presentPayment } from "./present-payment";

const payment = (overrides: Partial<MyPaymentDto> = {}): MyPaymentDto => ({
  id: "purchase-1",
  state: "approved",
  origin: "one_time",
  paymentMethod: "mercado_pago",
  paidOn: null,
  hasReceipt: false,
  kind: "plan",
  service: "performance",
  itemName: "Mensual",
  amount: 2400,
  currency: "UYU",
  createdAt: "2026-10-26T13:00:00.000Z",
  approvedAt: null,
  lastPaymentAt: null,
  refundedAt: null,
  paymentId: null,
  reasonCode: null,
  delivered: null,
  ...overrides,
});

const PLAN_PERIOD = { type: "plan", startsOn: "2026-10-20", endsOn: "2026-11-19", sessionsTotal: null } as const;

describe("presentPayment: approved", () => {
  const approved = (overrides: Partial<MyPaymentDto> = {}) =>
    payment({ state: "approved", approvedAt: "2026-10-20T12:03:00.000Z", paymentId: "1234500011", ...overrides });

  it("shows an approved plan with its period", () => {
    const model = presentPayment(approved({ delivered: PLAN_PERIOD }));

    expect(model.badge).toEqual({ label: "Aprobado", tone: "success" });
    expect(model.note).toEqual({
      tone: "success",
      icon: "check",
      title: "Pago acreditado",
      body: "Tu plan quedó activo.",
    });
    expect(model.rows).toEqual([
      { label: "Aprobado el", value: "20/10/2026 · 09:03" },
      { label: "Vigencia", value: "20/10/2026 → 19/11/2026" },
      { label: "N.º de operación", value: "1234500011" },
    ]);
  });

  it("adds the included sessions for a session pack", () => {
    const model = presentPayment(approved({ delivered: { ...PLAN_PERIOD, sessionsTotal: 4 } }));

    expect(model.rows.map(({ label }) => label)).toEqual([
      "Aprobado el",
      "Vigencia",
      "Sesiones incluidas",
      "N.º de operación",
    ]);
    expect(model.rows[2].value).toBe("4");
  });

  it("shows an approved booking with the session time", () => {
    const model = presentPayment(
      approved({ kind: "booking", delivered: { type: "booking", startsAt: "2026-10-16T21:00:00.000Z" } }),
    );

    expect(model.note.body).toBe("Tu reserva quedó confirmada.");
    expect(model.rows).toEqual([
      { label: "Aprobado el", value: "20/10/2026 · 09:03" },
      { label: "Sesión reservada", value: "16/10/2026 · 18:00" },
      { label: "N.º de operación", value: "1234500011" },
    ]);
  });

  it("says nothing about what was delivered when the API has nothing to show", () => {
    const model = presentPayment(approved({ delivered: null }));

    expect(model.note.title).toBe("Pago acreditado");
    expect(model.note.body).toBeNull();
    expect(model.rows.map(({ label }) => label)).toEqual(["Aprobado el", "N.º de operación"]);
  });
});

describe("presentPayment: the other states", () => {
  it("refunded shows when it was charged and when the refund was registered", () => {
    const model = presentPayment(
      payment({
        state: "refunded",
        approvedAt: "2026-09-20T12:02:00.000Z",
        refundedAt: "2026-09-24T18:40:00.000Z",
        paymentId: "1233901204",
      }),
    );

    expect(model.badge).toEqual({ label: "Reembolsado", tone: "info" });
    expect(model.note).toEqual({
      tone: "info",
      icon: "undo",
      title: "Pago reembolsado",
      body: "Mercado Pago registró el reembolso de este cobro.",
    });
    expect(model.rows).toEqual([
      { label: "Cobrado el", value: "20/09/2026 · 09:02" },
      { label: "Reembolso registrado", value: "24/09/2026 · 15:40" },
      { label: "N.º de operación", value: "1233901204" },
    ]);
  });

  it("declined says why in words, never with the provider's code", () => {
    const model = presentPayment(
      payment({
        state: "declined",
        reasonCode: "cc_rejected_insufficient_amount",
        lastPaymentAt: "2026-10-09T21:42:00.000Z",
        paymentId: "1234498877",
      }),
    );

    expect(model.badge).toEqual({ label: "Rechazado", tone: "danger" });
    expect(model.note).toEqual({
      tone: "danger",
      icon: "cross",
      title: "No se pudo realizar el pago",
      body: "Tu tarjeta no tiene saldo suficiente.",
    });
    expect(model.rows).toEqual([
      { label: "Intentado", value: "09/10/2026 · 18:42" },
      { label: "N.º de operación", value: "1234498877" },
    ]);
    expect(JSON.stringify(model)).not.toContain("cc_rejected");
  });

  it.each([null, "cc_rejected_something_new"])("declined with the reason %s gets the generic message", (reasonCode) => {
    const model = presentPayment(payment({ state: "declined", reasonCode, lastPaymentAt: "2026-10-09T21:42:00.000Z" }));

    expect(model.note.body).toBe(GENERIC_DECLINE_MESSAGE);
  });

  it("processing waits for Mercado Pago with a spinner", () => {
    const model = presentPayment(
      payment({ state: "processing", lastPaymentAt: "2026-10-26T13:14:00.000Z", paymentId: "1234567890" }),
    );

    expect(model.badge).toEqual({ label: "En proceso", tone: "warning" });
    expect(model.note).toEqual({
      tone: "warning",
      icon: "spinner",
      title: "Confirmando tu pago",
      body: "Estamos esperando la confirmación de Mercado Pago. Puede tardar unos minutos.",
    });
    expect(model.rows).toEqual([
      { label: "Intentado", value: "26/10/2026 · 10:14" },
      { label: "N.º de operación", value: "1234567890" },
    ]);
  });

  it("waiting is a payment that was started and not completed", () => {
    const model = presentPayment(payment({ state: "waiting", createdAt: "2026-10-12T14:05:00.000Z" }));

    expect(model.badge).toEqual({ label: "Pendiente", tone: "warning" });
    expect(model.note).toEqual({
      tone: "warning",
      icon: "clock",
      title: "Pago sin completar",
      body: "Iniciaste el pago pero no se completó.",
    });
    expect(model.rows).toEqual([{ label: "Iniciado", value: "12/10/2026 · 11:05" }]);
  });

  it("expired is a purchase that was not completed in time", () => {
    const model = presentPayment(payment({ state: "expired", createdAt: "2026-10-02T23:31:00.000Z" }));

    expect(model.badge).toEqual({ label: "Vencido", tone: "neutral" });
    expect(model.note).toEqual({
      tone: "neutral",
      icon: "calendar-x",
      title: "Compra vencida",
      body: "El pago no se completó a tiempo y la compra venció.",
    });
    expect(model.rows).toEqual([{ label: "Iniciado", value: "02/10/2026 · 20:31" }]);
  });

  it("tells an offline purchase that cost nothing was settled on its own, with no day it was paid", () => {
    const model = presentPayment(
      payment({ state: "approved", paymentMethod: "cash", amount: 0, paidOn: null, createdAt: "2026-10-12T14:05:00.000Z", delivered: PLAN_PERIOD }),
    );

    expect(model.badge).toEqual({ label: "Aprobado", tone: "success" });
    expect(model.note).toEqual({
      tone: "success",
      icon: "check",
      title: "Compra sin costo",
      body: "No hubo nada para pagar: la compra quedó paga sola. Tu plan quedó activo.",
    });
    expect(model.rows).toEqual([
      { label: "Vigencia", value: "20/10/2026 → 19/11/2026" },
      { label: "Medio", value: "Efectivo" },
    ]);
    expect(model.subtitle).toBe("Efectivo · 12/10/2026");
    expect(model.amount).toBe("$ 0");
    expect(JSON.stringify(model)).not.toContain("registró el equipo");
  });

  it("to_pay is something chosen for cash or transfer that the team has not recorded yet", () => {
    const model = presentPayment(payment({ state: "to_pay", paymentMethod: "cash", createdAt: "2026-10-12T14:05:00.000Z" }));

    expect(model.badge).toEqual({ label: "A pagar en MOVE", tone: "warning" });
    expect(model.note).toEqual({
      tone: "warning",
      icon: "clock",
      title: "Falta pagarlo en MOVE",
      body: "Pagalo en MOVE en efectivo o por transferencia. Cuando el equipo lo registre, lo vas a ver como pagado.",
    });
    expect(model.rows).toEqual([
      { label: "Elegido el", value: "12/10/2026 · 11:05" },
      { label: "Medio", value: "Efectivo" },
    ]);
  });

  it("dates a payment to make by the day it was chosen, not as if it were already paid", () => {
    const model = presentPayment(
      payment({ state: "to_pay", paymentMethod: "transfer", createdAt: "2026-10-12T14:05:00.000Z", paidOn: null }),
    );

    expect(model.subtitle).toBe("Transferencia · 12/10/2026");
    expect(model.isAmountMuted).toBe(false);
    expect(model.receiptPurchaseId).toBeNull();
  });

  it("leaves out a row whose data the API did not send", () => {
    const approvedWithoutData = presentPayment(payment({ state: "approved", approvedAt: null, paymentId: null }));
    const refundedWithoutDate = presentPayment(payment({ state: "refunded", refundedAt: null, approvedAt: null }));

    expect(approvedWithoutData.rows).toEqual([]);
    expect(refundedWithoutDate.rows).toEqual([]);
  });
});

describe("presentPayment: the card", () => {
  it("titles the card with the service and the plan, and its subtitle with the origin and the creation date", () => {
    const model = presentPayment(payment({ createdAt: "2026-10-26T13:00:00.000Z" }));

    expect(model.id).toBe("purchase-1");
    expect(model.title).toBe("Performance · Mensual");
    expect(model.subtitle).toBe("Pago único · 26/10/2026");
    expect(model.amount).toBe("$ 2.400");
  });

  it("tells an automatic debit apart by its label and its icon", () => {
    const debit = presentPayment(payment({ origin: "auto_debit" }));
    const oneTime = presentPayment(payment({ origin: "one_time" }));

    expect(debit.subtitle).toBe("Débito automático · 26/10/2026");
    expect(debit.icon).toBe("repeat");
    expect(oneTime.icon).toBe("card");
  });

  it("mutes the amount only for a declined or an expired purchase", () => {
    const muted = (state: MyPaymentDto["state"]) => presentPayment(payment({ state })).isAmountMuted;

    expect(muted("declined")).toBe(true);
    expect(muted("expired")).toBe(true);
    expect(["approved", "refunded", "processing", "waiting"].map((state) => muted(state as MyPaymentDto["state"]))).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("shows the day in Montevideo, not in UTC, near midnight", () => {
    const model = presentPayment(payment({ createdAt: "2026-10-26T02:30:00.000Z" }));

    expect(model.subtitle).toBe("Pago único · 25/10/2026");
  });
});

describe("presentPayment: paid outside the app", () => {
  const offline = (overrides: Partial<MyPaymentDto> = {}) =>
    payment({
      state: "approved",
      paymentMethod: "cash",
      paidOn: "2026-11-02",
      approvedAt: "2026-11-02T15:00:00.000Z",
      kind: "booking",
      service: "recovery",
      itemName: "Sesión de Recovery",
      delivered: { type: "booking", startsAt: "2026-11-06T13:00:00.000Z" },
      ...overrides,
    });

  it("presents a cash payment registered by MOVE", () => {
    const model = presentPayment(offline());

    expect(model.subtitle).toBe("Efectivo · 02/11/2026");
    expect(model.badge).toEqual({ label: "Aprobado", tone: "success" });
    expect(model.note).toEqual({
      tone: "success",
      icon: "check",
      title: "Pago registrado",
      body: "Pagaste en efectivo el 02/11/2026. Lo registró el equipo de MOVE.",
    });
    expect(model.rows).toEqual([
      { label: "Sesión reservada", value: "06/11/2026 · 10:00" },
      { label: "Medio", value: "Efectivo" },
    ]);
    expect(model.rows.map(({ label }) => label)).not.toContain("N.º de operación");
  });

  it("says por transferencia for a transfer", () => {
    const model = presentPayment(offline({ paymentMethod: "transfer" }));

    expect(model.subtitle).toBe("Transferencia · 02/11/2026");
    expect(model.note.body).toBe("Pagaste por transferencia el 02/11/2026. Lo registró el equipo de MOVE.");
    expect(model.rows).toContainEqual({ label: "Medio", value: "Transferencia" });
  });

  it("points to the receipt only when there is one", () => {
    expect(presentPayment(offline({ hasReceipt: true })).receiptPurchaseId).toBe("purchase-1");
    expect(presentPayment(offline({ hasReceipt: false })).receiptPurchaseId).toBeNull();
  });

  it("leaves Mercado Pago payments as they were", () => {
    const model = presentPayment(
      payment({ state: "approved", approvedAt: "2026-10-20T12:03:00.000Z", paymentId: "1234500011" }),
    );

    expect(model.subtitle).toBe("Pago único · 26/10/2026");
    expect(model.note.title).toBe("Pago acreditado");
    expect(model.rows.map(({ label }) => label)).toEqual(["Aprobado el", "N.º de operación"]);
    expect(model.receiptPurchaseId).toBeNull();
  });
});
