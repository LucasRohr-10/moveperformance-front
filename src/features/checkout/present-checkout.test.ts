import { describe, expect, it } from "vitest";

import type {
  AutoDebitDto,
  BookableSlot,
  MySubscriptionsDto,
  OfflineOptionsDto,
  PerformanceSubscriptionDto,
  PlanDto,
} from "@/lib/api/types";

import {
  SERVICE_LABELS,
  businessDateOf,
  formatSlotDateTime,
  isAutoDebitBlocked,
  isPurchasablePlan,
  isSlotBookable,
  pickBookingPlan,
  presentBookingCheckout,
  presentBookingPaymentModes,
  presentOfflineNotice,
  presentPaymentModes,
  presentPlanCheckout,
} from "./present-checkout";

const plan = (overrides: Partial<PlanDto>): PlanDto => ({
  id: "plan-trimestral",
  service: "performance",
  kind: "period_plan",
  slug: "performance-trimestral",
  name: "Trimestral",
  description: "",
  features: ["Asistencias ilimitadas con reserva"],
  price: 10500,
  periodMonths: 3,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: null,
  featured: false,
  autoDebitEnabled: false,
  ...overrides,
});

const pack = plan({
  id: "pack-4",
  service: "recovery",
  kind: "session_pack",
  name: "Paquete 4 sesiones",
  price: 3200,
  periodMonths: null,
  periodDays: 30,
  sessionsIncluded: 4,
});

const evaluation = plan({
  id: "eval",
  service: "rehab",
  kind: "evaluation",
  name: "Evaluación y Diagnóstico",
  price: 1800,
  periodMonths: null,
  durationMinutes: 45,
});

const slot: BookableSlot = {
  id: "slot-1",
  service: "rehab",
  startsAt: "2026-10-21T13:00:00.000Z",
  endsAt: "2026-10-21T13:45:00.000Z",
  durationMinutes: 45,
  capacity: 1,
  available: 1,
  isFull: false,
  alreadyBooked: false,
};

const subscription = (
  endsOn: string,
  status: PerformanceSubscriptionDto["status"] = "active",
): PerformanceSubscriptionDto => ({
  id: "sub",
  planId: "p",
  planName: "Mensual",
  startsOn: "2026-10-15",
  endsOn,
  status,
  daysLeft: 3,
  expiringSoon: false,
  purchaseId: null,
  awaitingPayment: false,
});

const subscriptions = (overrides: Partial<MySubscriptionsDto>): MySubscriptionsDto => ({
  performance: null,
  upcomingPerformances: [],
  recoveryPacks: [],
  ...overrides,
});

const RENEWAL = (currentEnds: string, newStarts: string) => ({
  title: "Ya tenés un plan de Performance activo. El nuevo arranca cuando termina el actual, sin perder días.",
  rows: [
    { label: "Plan actual hasta", value: currentEnds },
    { label: "Plan Trimestral desde", value: newStarts },
  ],
});

describe("re-exported business time", () => {
  it("keeps the formatters on the Presentation contract's surface", () => {
    expect(formatSlotDateTime("2026-10-21T13:00:00.000Z")).toBe("miércoles 21/10 · 10:00 hs");
    expect(businessDateOf("2026-10-22T02:30:00.000Z")).toBe("2026-10-21");
  });
});

describe("SERVICE_LABELS", () => {
  it("names the three services", () => {
    expect(SERVICE_LABELS).toEqual({ performance: "Performance", rehab: "Rehab", recovery: "Recovery" });
  });
});

describe("isPurchasablePlan", () => {
  it("is true only for period plans and session packs", () => {
    expect(isPurchasablePlan(plan({}))).toBe(true);
    expect(isPurchasablePlan(pack)).toBe(true);
    expect(isPurchasablePlan(evaluation)).toBe(false);
    expect(isPurchasablePlan(plan({ kind: "single_session" }))).toBe(false);
  });
});

describe("pickBookingPlan", () => {
  const single = plan({ id: "single", service: "recovery", kind: "single_session" });

  it("picks the first evaluation for rehab and the first single session for recovery", () => {
    const plans = [pack, single, evaluation, plan({ id: "eval-2", kind: "evaluation" })];

    expect(pickBookingPlan(plans, "rehab")?.id).toBe("eval");
    expect(pickBookingPlan(plans, "recovery")?.id).toBe("single");
  });

  it("has nothing for performance, or when the kind is missing", () => {
    expect(pickBookingPlan([plan({})], "performance")).toBeNull();
    expect(pickBookingPlan([pack], "rehab")).toBeNull();
  });
});

describe("presentPlanCheckout", () => {
  it("summarises a quarterly plan", () => {
    expect(presentPlanCheckout(plan({}), null)).toEqual({
      eyebrow: "Performance",
      title: "Plan Trimestral",
      price: "$ 10.500",
      rows: [],
      features: ["Asistencias ilimitadas con reserva"],
      renewalNotice: null,
      notes: [],
      holdNotice: null,
    });
  });

  it("shows no duration row for a period plan", () => {
    expect(presentPlanCheckout(plan({ periodMonths: 1 }), null).rows).toEqual([]);
  });

  it("summarises a session pack with its sessions, validity and note", () => {
    const model = presentPlanCheckout(pack, null);

    expect(model.eyebrow).toBe("Recovery");
    expect(model.title).toBe("Paquete 4 sesiones");
    expect(model.price).toBe("$ 3.200");
    expect(model.rows).toEqual([
      { label: "Sesiones", value: "4" },
      { label: "Vigencia del paquete", value: "30 días" },
    ]);
    expect(model.notes).toEqual(["Las sesiones no usadas vencen al final del período."]);
  });

  it("leaves out the pack rows whose number is null", () => {
    const model = presentPlanCheckout({ ...pack, sessionsIncluded: null, periodDays: null }, null);

    expect(model.rows).toEqual([]);
  });

  it("warns about the current Performance plan, with its end date and the day the new one starts", () => {
    const model = presentPlanCheckout(plan({}), subscriptions({ performance: subscription("2026-11-15") }));

    expect(model.renewalNotice).toEqual(RENEWAL("15/11/2026", "16/11/2026"));
    expect(model.notes).toEqual([]);
  });

  it("starts the new plan on the first day of the next month when the current one ends on the last", () => {
    const model = presentPlanCheckout(plan({}), subscriptions({ performance: subscription("2026-10-31") }));

    expect(model.renewalNotice).toEqual(RENEWAL("31/10/2026", "01/11/2026"));
  });

  it("uses the scheduled plan when there is one", () => {
    const model = presentPlanCheckout(
      plan({}),
      subscriptions({
        performance: subscription("2026-11-15"),
        upcomingPerformances: [subscription("2027-02-15", "scheduled")],
      }),
    );

    expect(model.renewalNotice).toEqual(RENEWAL("15/02/2027", "16/02/2027"));
  });

  it("uses the end of the last queued plan, which is when a new one would start", () => {
    const model = presentPlanCheckout(
      plan({}),
      subscriptions({
        performance: subscription("2026-11-15"),
        upcomingPerformances: [
          subscription("2027-02-15", "scheduled"),
          subscription("2027-03-15", "scheduled"),
        ],
      }),
    );

    expect(model.renewalNotice).toEqual(RENEWAL("15/03/2027", "16/03/2027"));
  });

  it("does not announce a renewal after an expired plan or without subscriptions", () => {
    const expired = subscriptions({ performance: subscription("2026-09-15", "expired") });

    expect(presentPlanCheckout(plan({}), expired).renewalNotice).toBeNull();
    expect(presentPlanCheckout(plan({}), null).renewalNotice).toBeNull();
  });

  it("does not announce a renewal for a pack", () => {
    const model = presentPlanCheckout(pack, subscriptions({ performance: subscription("2026-11-15") }));

    expect(model.renewalNotice).toBeNull();
    expect(model.notes).toEqual(["Las sesiones no usadas vencen al final del período."]);
  });
});

describe("presentBookingCheckout", () => {
  it("summarises a rehab evaluation with the slot and the hold notice", () => {
    expect(presentBookingCheckout(evaluation, slot)).toEqual({
      eyebrow: "Rehab",
      title: "Evaluación y Diagnóstico",
      price: "$ 1.800",
      rows: [
        { label: "Fecha y hora", value: "miércoles 21/10 · 10:00 hs" },
        { label: "Duración", value: "45 min" },
      ],
      features: ["Asistencias ilimitadas con reserva"],
      renewalNotice: null,
      notes: [],
      holdNotice: "Guardamos tu horario unos minutos mientras completás el pago.",
    });
  });

  it("takes the duration from the plan when it has one, even if the slot is shorter", () => {
    const model = presentBookingCheckout({ ...evaluation, durationMinutes: 60 }, slot);

    expect(model.rows).toContainEqual({ label: "Duración", value: "60 min" });
  });

  it("falls back to the slot duration when the plan has none", () => {
    const model = presentBookingCheckout({ ...evaluation, durationMinutes: null }, slot);

    expect(model.rows).toContainEqual({ label: "Duración", value: "45 min" });
  });
});

describe("isSlotBookable", () => {
  const startMs = new Date(slot.startsAt).getTime();

  it("accepts a slot with room, not booked by the client and still to come", () => {
    expect(isSlotBookable(slot, startMs - 1)).toBe(true);
  });

  it("rejects a full slot", () => {
    expect(isSlotBookable({ ...slot, isFull: true }, startMs - 1)).toBe(false);
  });

  it("rejects a slot the client already booked", () => {
    expect(isSlotBookable({ ...slot, alreadyBooked: true }, startMs - 1)).toBe(false);
  });

  it("rejects a slot that started before now", () => {
    expect(isSlotBookable(slot, startMs + 1)).toBe(false);
  });

  it("rejects a slot that starts exactly now", () => {
    expect(isSlotBookable(slot, startMs)).toBe(false);
  });
});

const authorizedDebit = (overrides: Partial<AutoDebitDto> = {}): AutoDebitDto => ({
  id: "debit-1",
  externalReference: "ref-1",
  planId: "plan-mensual",
  planName: "Mensual",
  service: "performance",
  status: "authorized",
  amount: 3900,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: "2026-11-12",
  createdAt: "2026-10-12T10:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
  ...overrides,
});

describe("presentPaymentModes", () => {
  const MONTHLY_DEBIT_TEXT =
    "Se cobra automáticamente cada mes con Mercado Pago. Podés cancelarlo cuando quieras desde tu perfil.";
  const FIRST_CHARGE_NOTE = "El primer cobro se hace cuando termina el último plan que ya pagaste.";
  const withDebit = (overrides: Partial<PlanDto> = {}) => plan({ autoDebitEnabled: true, ...overrides });

  it("offers automatic debit only when the plan allows it", () => {
    expect(presentPaymentModes(plan({ autoDebitEnabled: false }), null)).toEqual([]);

    const modes = presentPaymentModes(withDebit(), null);

    expect(modes.map(({ value, label }) => [value, label])).toEqual([
      ["one_time", "Pago único"],
      ["auto_debit", "Débito automático"],
    ]);
  });

  it.each([
    [{ periodMonths: 1 }, "cada mes"],
    [{ periodMonths: 3 }, "cada 3 meses"],
    [{ ...pack, periodDays: 30, autoDebitEnabled: true }, "cada 30 días"],
  ])("says when the debit charges: %j", (overrides, cadence) => {
    const [, debit] = presentPaymentModes(withDebit(overrides), null);

    expect(debit.description).toBe(
      `Se cobra automáticamente ${cadence} con Mercado Pago. Podés cancelarlo cuando quieras desde tu perfil.`,
    );
  });

  it("explains that the first charge waits for the paid plans, without a date", () => {
    const current = subscriptions({ performance: subscription("2026-11-15") });

    const [, debit] = presentPaymentModes(withDebit({ periodMonths: 1 }), current);

    expect(debit.description).toBe(`${MONTHLY_DEBIT_TEXT} ${FIRST_CHARGE_NOTE}`);
  });

  it("does not call the last queued plan 'tu plan actual'", () => {
    const queued = subscriptions({
      performance: subscription("2026-11-15"),
      upcomingPerformances: [subscription("2026-12-15", "scheduled"), subscription("2027-02-15", "scheduled")],
    });

    const [, debit] = presentPaymentModes(withDebit({ periodMonths: 1 }), queued);

    expect(debit.description).toBe(`${MONTHLY_DEBIT_TEXT} ${FIRST_CHARGE_NOTE}`);
    expect(debit.description).not.toContain("plan actual");
  });

  it("does not mention the first charge after an expired plan or for a pack", () => {
    const expired = subscriptions({ performance: subscription("2026-09-15", "expired") });
    const active = subscriptions({ performance: subscription("2026-11-15") });

    expect(presentPaymentModes(withDebit(), expired)[1].description).not.toContain("plan actual");
    expect(presentPaymentModes(withDebit(), expired)[1].description).not.toContain("primer cobro");
    expect(presentPaymentModes(withDebit({ ...pack, autoDebitEnabled: true }), active)[1].description).not.toContain(
      "plan actual",
    );
    expect(presentPaymentModes(withDebit({ ...pack, autoDebitEnabled: true }), active)[1].description).not.toContain(
      "primer cobro",
    );
  });
});

const TRANSFER_DETAILS = "BROU · Caja de ahorro 000000000-00001\nComprobante al WhatsApp 099 000 000";

const offlineOptions = (overrides: Partial<OfflineOptionsDto> = {}): OfflineOptionsDto => ({
  discountPercent: 10,
  transferDetails: TRANSFER_DETAILS,
  unpaid: { count: 0, limit: 2, items: [] },
  ...overrides,
});

const atTheCap = (count = 2) => offlineOptions({ unpaid: { count, limit: 2, items: [] } });

describe("presentPaymentModes with cash and transfer", () => {
  const monthly = plan({ price: 3000 });
  const byValue = (modes: ReturnType<typeof presentPaymentModes>, value: string) =>
    modes.find((mode) => mode.value === value);

  it("offers a single payment, cash and transfer even when the plan has no debit", () => {
    const modes = presentPaymentModes(monthly, null, offlineOptions());

    expect(modes.map(({ value, label }) => [value, label])).toEqual([
      ["one_time", "Pago único"],
      ["cash", "Efectivo"],
      ["transfer", "Transferencia"],
    ]);
  });

  it("puts the debit between the single payment and the offline options", () => {
    const modes = presentPaymentModes(plan({ autoDebitEnabled: true }), null, offlineOptions());

    expect(modes.map((mode) => mode.value)).toEqual(["one_time", "auto_debit", "cash", "transfer"]);
  });

  it("says the single payment is with Mercado Pago and its price", () => {
    expect(byValue(presentPaymentModes(monthly, null, offlineOptions()), "one_time")?.description).toBe(
      "Con Mercado Pago · $ 3.000",
    );
  });

  it("shows the full and the discounted price with the percent", () => {
    const cash = byValue(presentPaymentModes(monthly, null, offlineOptions()), "cash");

    expect(cash?.priceLine).toEqual({ full: "$ 3.000", discounted: "$ 2.700", percent: 10 });
    expect(cash?.howTo).toBe("Pagás en MOVE");
    expect(cash?.disabledReason).toBeNull();
  });

  it("shows only the price when there is no discount", () => {
    const cash = byValue(presentPaymentModes(monthly, null, offlineOptions({ discountPercent: null })), "cash");

    expect(cash?.priceLine).toEqual({ full: "$ 3.000", discounted: null, percent: null });
  });

  it("gives the transfer its details and how to pay", () => {
    const transfer = byValue(presentPaymentModes(monthly, null, offlineOptions()), "transfer");

    expect(transfer?.howTo).toBe("Transferís y mandás el comprobante a:");
    expect(transfer?.transferDetails).toBe(TRANSFER_DETAILS);
  });

  it("leaves the transfer out when staff has no details to show", () => {
    const modes = presentPaymentModes(monthly, null, offlineOptions({ transferDetails: null }));

    expect(modes.map((mode) => mode.value)).toEqual(["one_time", "cash"]);
  });

  it("disables cash and transfer at the cap with the reason, and keeps Mercado Pago enabled", () => {
    const modes = presentPaymentModes(monthly, null, atTheCap());
    const reason =
      "Tenés 2 cosas sin pagar en MOVE, que es el máximo. Pagalas en MOVE para volver a usar efectivo o transferencia.";

    expect(byValue(modes, "cash")?.disabledReason).toBe(reason);
    expect(byValue(modes, "transfer")?.disabledReason).toBe(reason);
    expect(byValue(modes, "one_time")?.disabledReason).toBeNull();
    expect(byValue(modes, "transfer")?.transferDetails).toBeNull();
  });

  it("keeps cash and transfer open at the cap with a 100 % discount: the purchase costs nothing", () => {
    const modes = presentPaymentModes(monthly, null, { ...atTheCap(), discountPercent: 100 });

    expect(byValue(modes, "cash")?.disabledReason).toBeNull();
    expect(byValue(modes, "transfer")?.disabledReason).toBeNull();
    expect(byValue(modes, "transfer")?.transferDetails).not.toBeNull();
    expect(byValue(modes, "cash")?.priceLine).toEqual({ full: "$ 3.000", discounted: "$ 0", percent: 100 });
  });

  it("still disables them at the cap with a discount of 99 %", () => {
    const modes = presentPaymentModes(monthly, null, { ...atTheCap(), discountPercent: 99 });

    expect(byValue(modes, "cash")?.disabledReason).not.toBeNull();
  });

  it("also disables above the cap (staff lowered it), and says 'cosa' for one", () => {
    expect(byValue(presentPaymentModes(monthly, null, atTheCap(3)), "cash")?.disabledReason).toContain("Tenés 3 cosas");
    const oneOfOne = offlineOptions({ unpaid: { count: 1, limit: 1, items: [] } });
    expect(byValue(presentPaymentModes(monthly, null, oneOfOne), "cash")?.disabledReason).toContain(
      "Tenés 1 cosa sin pagar en MOVE, que es el máximo.",
    );
  });

  it("does not disable below the cap", () => {
    const modes = presentPaymentModes(monthly, null, offlineOptions({ unpaid: { count: 1, limit: 2, items: [] } }));

    expect(byValue(modes, "cash")?.disabledReason).toBeNull();
  });

  it("is what it was without the offline options", () => {
    expect(presentPaymentModes(monthly, null, null)).toEqual([]);
    expect(presentPaymentModes(plan({ autoDebitEnabled: true }), null, null).map((mode) => mode.value)).toEqual([
      "one_time",
      "auto_debit",
    ]);
  });
});

describe("presentOfflineNotice", () => {
  const CAP_RULE = "pero mientras no lo pagues en MOVE solo podés tener 2 cosas sin pagar";
  const text = (segments: ReturnType<typeof presentOfflineNotice>) => segments?.map((segment) => segment.text).join("");

  it("explains the cap for a plan, with the plan and its bookings", () => {
    expect(text(presentOfflineNotice(plan({}), offlineOptions()))).toBe(
      `Si elegís efectivo o transferencia, tu plan queda activo ya, ${CAP_RULE} (el plan cuenta como una y cada turno que reserves, como otra).`,
    );
  });

  it("marks in bold what the client has to remember, as the mockup does", () => {
    const strong = presentOfflineNotice(plan({}), offlineOptions())
      ?.filter((segment) => segment.isStrong)
      .map((segment) => segment.text);

    expect(strong).toEqual(["Si elegís efectivo o transferencia", "2 cosas sin pagar"]);
  });

  it("says package for a pack", () => {
    expect(text(presentOfflineNotice(pack, offlineOptions()))).toContain("tu paquete queda activo ya");
    expect(text(presentOfflineNotice(pack, offlineOptions()))).toContain("(el paquete cuenta como una");
  });

  it("explains it for a booking without the part about plans", () => {
    expect(text(presentOfflineNotice(evaluation, offlineOptions()))).toBe(
      `Si elegís efectivo o transferencia, tu turno queda reservado ya, ${CAP_RULE}.`,
    );
  });

  it("says 1 cosa, not 1 cosas, when the cap is 1", () => {
    const base = offlineOptions();
    const capOfOne = { ...base, unpaid: { ...base.unpaid, count: 0, limit: 1 } };

    expect(text(presentOfflineNotice(evaluation, capOfOne))).toContain("solo podés tener 1 cosa sin pagar.");
  });

  it("is not shown with a 100 % discount, at the cap or not: it costs nothing, so nothing is left unpaid", () => {
    expect(presentOfflineNotice(plan({}), { ...offlineOptions(), discountPercent: 100 })).toBeNull();
    expect(presentOfflineNotice(plan({}), { ...atTheCap(), discountPercent: 100 })).toBeNull();
  });

  it("is not shown without the options, or when the client is already at the cap", () => {
    expect(presentOfflineNotice(plan({}), null)).toBeNull();
    expect(presentOfflineNotice(plan({}), atTheCap())).toBeNull();
  });
});

describe("presentBookingPaymentModes", () => {
  it("offers a single payment, cash and transfer, never a debit", () => {
    const modes = presentBookingPaymentModes(evaluation, offlineOptions());

    expect(modes.map((mode) => mode.value)).toEqual(["one_time", "cash", "transfer"]);
    expect(modes[1].priceLine).toEqual({ full: "$ 1.800", discounted: "$ 1.620", percent: 10 });
  });

  it("disables cash and transfer at the cap", () => {
    const modes = presentBookingPaymentModes(evaluation, atTheCap());

    expect(modes[1].disabledReason).not.toBeNull();
    expect(modes[2].disabledReason).not.toBeNull();
  });

  it("offers nothing when the offline options are unknown: it is just Mercado Pago", () => {
    expect(presentBookingPaymentModes(evaluation, null)).toEqual([]);
  });
});

describe("isAutoDebitBlocked", () => {
  it("blocks a Performance plan while a Performance debit is authorized", () => {
    expect(isAutoDebitBlocked(plan({}), [authorizedDebit()])).toBe(true);
  });

  it("does not block Recovery with an authorized Performance debit", () => {
    expect(isAutoDebitBlocked(pack, [authorizedDebit()])).toBe(false);
  });

  it("does not block Recovery with an authorized Recovery debit either: only Performance is blocked", () => {
    expect(isAutoDebitBlocked(pack, [authorizedDebit({ service: "recovery" })])).toBe(false);
  });

  it("does not block while the debit is pending or cancelled, or when the debits are unknown", () => {
    expect(isAutoDebitBlocked(plan({}), [authorizedDebit({ status: "pending" })])).toBe(false);
    expect(isAutoDebitBlocked(plan({}), [authorizedDebit({ status: "cancelled" })])).toBe(false);
    expect(isAutoDebitBlocked(plan({}), [authorizedDebit({ service: "recovery" })])).toBe(false);
    expect(isAutoDebitBlocked(plan({}), null)).toBe(false);
  });
});
