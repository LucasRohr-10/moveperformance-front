import { afterEach, describe, expect, it, vi } from "vitest";

import type { PurchaseStatus, PurchaseStatusDto } from "@/lib/api/types";

import { presentPurchaseResult, type PurchaseResultInput } from "./present-purchase-result";

const ZONES = ["UTC", "Pacific/Kiritimati", "America/Montevideo"];

const planPurchase: PurchaseStatusDto = {
  externalReference: "ref-1",
  kind: "plan",
  status: "pending",
  itemName: "Plan mensual",
  service: "performance",
  amount: 2500,
  currency: "UYU",
  planId: "plan-trimestral",
  bookingId: null,
  startsAt: null,
  needsAttention: false,
  paymentStatus: null,
  paymentStatusDetail: null,
  paymentMethod: "mercado_pago",
  transferDetails: null,
};

const bookingPurchase: PurchaseStatusDto = {
  ...planPurchase,
  kind: "booking",
  itemName: "Evaluación y Diagnóstico",
  service: "rehab",
  amount: 1800,
  planId: "plan-eval",
  bookingId: "booking-1",
  startsAt: "2026-10-21T13:00:00.000Z",
};

const present = (
  purchase: PurchaseStatusDto,
  status: PurchaseStatus,
  rest: Partial<Omit<PurchaseResultInput, "purchase">> = {},
) => presentPurchaseResult({ timedOut: false, providerSaysRejected: false, ...rest, purchase: { ...purchase, status } });

const PROFILE = { label: "Ir a mi perfil", href: "/dashboard" };
const PLAN_RETRY = { label: "Intentar de nuevo", href: "/checkout/plan/plan-trimestral" };

describe("presentPurchaseResult", () => {
  it("shows a payment recorded outside the app as neutral, not as a warning", () => {
    expect(present(planPurchase, "waived").badge).toEqual({ label: "No se cobra", tone: "neutral" });
  });

  it("asks for a review when the payment needs attention, even if approved", () => {
    const model = present({ ...planPurchase, needsAttention: true }, "approved");

    expect(model).toEqual({
      badge: { label: "En revisión", tone: "warning" },
      title: "Revisamos tu pago",
      body: "Recibimos tu pago, pero necesitamos revisarlo. El equipo de MOVE te va a contactar.",
      details: [
        { label: "Plan", value: "Plan mensual" },
        { label: "Total", value: "$ 2.500" },
      ],
      action: PROFILE,
      secondaryAction: null,
      canRecheck: false,
      isWaiting: false,
      selectionNote: null,
      transferDetails: null,
    });
  });

  it("labels the item of a booking in review as the slot", () => {
    const model = present({ ...bookingPurchase, needsAttention: true }, "pending");

    expect(model.details[0]).toEqual({ label: "Turno", value: "Evaluación y Diagnóstico" });
  });

  it("confirms an approved plan", () => {
    expect(present(planPurchase, "approved")).toEqual({
      badge: { label: "Aprobado", tone: "success" },
      title: "¡Listo! Tu pago fue aprobado.",
      body: "Tu plan plan mensual ya está activo.",
      details: [],
      action: PROFILE,
      secondaryAction: null,
      canRecheck: false,
      isWaiting: false,
      selectionNote: null,
      transferDetails: null,
    });
  });

  it("names the approved period plan by its length", () => {
    expect(present({ ...planPurchase, itemName: "Trimestral" }, "approved").body).toBe(
      "Tu plan trimestral ya está activo.",
    );
  });

  it("does not name an approved pack as a plan", () => {
    const pack = { ...planPurchase, service: "recovery" as const, itemName: "Paquete 4 sesiones" };

    expect(present(pack, "approved").body).toBe("Tu plan ya está activo.");
  });

  it("confirms an approved booking with the slot date and time", () => {
    const model = present(bookingPurchase, "approved");

    expect(model.body).toBe("Tu reserva está confirmada.");
    expect(model.details).toEqual([
      { label: "Turno", value: "Evaluación y Diagnóstico" },
      { label: "Servicio", value: "Fisioterapia" },
      { label: "Fecha y hora", value: "miércoles 21/10 · 10:00 hs" },
      { label: "Total", value: "$ 1.800" },
    ]);
    expect(model.action).toEqual(PROFILE);
  });

  describe("the time zone of the server", () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
      vi.resetModules();
    });

    // The formatters are built when the module loads, so the zone must be set before the import.
    it.each(ZONES)("shows the Montevideo time with TZ=%s", async (zone) => {
      process.env.TZ = zone;
      vi.resetModules();
      const { presentPurchaseResult: presentUnderZone } = await import("./present-purchase-result");

      const model = presentUnderZone({
        purchase: { ...bookingPurchase, status: "approved" },
        timedOut: false,
        providerSaysRejected: false,
      });

      expect(model.details).toContainEqual({ label: "Fecha y hora", value: "miércoles 21/10 · 10:00 hs" });
    });
  });

  it("leaves out the date line of an approved booking whose slot no longer exists", () => {
    const model = present({ ...bookingPurchase, startsAt: null }, "approved");

    expect(model.details.map((detail) => detail.label)).toEqual(["Turno", "Servicio", "Total"]);
  });

  it("never lets the URL override an approval from the API", () => {
    const model = present(planPurchase, "approved", { providerSaysRejected: true });

    expect(model.title).toBe("¡Listo! Tu pago fue aprobado.");
    expect(model.badge.tone).toBe("success");
  });

  it("says the payment was not completed when the URL says rejected and the API is still pending", () => {
    expect(present(planPurchase, "pending", { providerSaysRejected: true })).toEqual({
      badge: { label: "Rechazado", tone: "danger" },
      title: "Pago no completado",
      body: "Mercado Pago no aprobó el pago. Podés intentarlo de nuevo.",
      details: [],
      action: PLAN_RETRY,
      secondaryAction: null,
      canRecheck: false,
      isWaiting: false,
      selectionNote: null,
      transferDetails: null,
    });
  });

  it("sends a booking whose URL says rejected back to the slot picker", () => {
    expect(present(bookingPurchase, "pending", { providerSaysRejected: true }).action).toEqual({
      label: "Intentar de nuevo",
      href: "/reservar?service=rehab",
    });
  });

  it("keeps waiting, never succeeding, when the API is pending", () => {
    expect(present(planPurchase, "pending")).toEqual({
      badge: { label: "Pendiente", tone: "warning" },
      title: "Confirmando tu pago",
      body: "Estamos esperando la confirmación de Mercado Pago. No cierres esta página.",
      details: [],
      action: null,
      secondaryAction: null,
      canRecheck: false,
      isWaiting: true,
      selectionNote: null,
      transferDetails: null,
    });
  });

  it("offers to recheck and go to the profile, never to pay again, while a plan payment may still be processing", () => {
    expect(present(planPurchase, "pending", { timedOut: true })).toEqual({
      badge: { label: "Pendiente", tone: "warning" },
      title: "Se agotó el tiempo de espera",
      body: "No recibimos la confirmación de tu pago a tiempo. Si ya pagaste, tu plan se activa apenas se acredite el pago. Si no, intentá de nuevo.",
      details: [],
      action: PROFILE,
      secondaryAction: null,
      canRecheck: true,
      isWaiting: false,
      selectionNote: null,
      transferDetails: null,
    });
  });

  it("offers to recheck and go to the profile, never to pick a new slot, while a booking payment may still be processing", () => {
    expect(present(bookingPurchase, "pending", { timedOut: true })).toEqual({
      badge: { label: "Pendiente", tone: "warning" },
      title: "Se agotó el tiempo de espera",
      body: "No recibimos la confirmación de tu pago a tiempo. Si ya pagaste, tu reserva se confirma apenas se acredite el pago. Si no, elegí el horario y intentá de nuevo.",
      details: [],
      action: PROFILE,
      secondaryAction: null,
      canRecheck: true,
      isWaiting: false,
      selectionNote: null,
      transferDetails: null,
    });
  });

  it("explains a rejected plan and sends it back to its own checkout", () => {
    expect(present(planPurchase, "rejected")).toEqual({
      badge: { label: "Rechazado", tone: "danger" },
      title: "Pago no completado",
      body: "El pago no se completó. Podés intentarlo de nuevo.",
      details: [],
      action: PLAN_RETRY,
      secondaryAction: null,
      canRecheck: false,
      isWaiting: false,
      selectionNote: null,
      transferDetails: null,
    });
  });

  it("explains a rejected booking and says the slot was released", () => {
    const model = present(bookingPurchase, "rejected");

    expect(model.body).toBe("El pago no se completó y liberamos el horario.");
    expect(model.action).toEqual({ label: "Intentar de nuevo", href: "/reservar?service=rehab" });
  });

  it("treats a cancelled purchase like a rejected one of its kind", () => {
    expect(present(planPurchase, "cancelled")).toMatchObject({
      badge: { label: "Cancelado", tone: "danger" },
      title: "Pago no completado",
      body: "El pago no se completó. Podés intentarlo de nuevo.",
      action: PLAN_RETRY,
    });
    expect(present(bookingPurchase, "cancelled")).toMatchObject({
      badge: { label: "Cancelado", tone: "danger" },
      body: "El pago no se completó y liberamos el horario.",
    });
  });

  it("tells the client an expired booking ran out of time and offers another slot", () => {
    expect(present(bookingPurchase, "expired")).toEqual({
      badge: { label: "Vencido", tone: "danger" },
      title: "Se venció el tiempo para pagar",
      body: "Liberamos el horario. Podés elegir otro.",
      details: [],
      action: { label: "Elegir otro horario", href: "/reservar?service=rehab" },
      secondaryAction: null,
      canRecheck: false,
      isWaiting: false,
      selectionNote: null,
      transferDetails: null,
    });
  });

  it("treats an expired plan purchase as not completed", () => {
    expect(present(planPurchase, "expired")).toEqual({
      badge: { label: "Vencido", tone: "danger" },
      title: "Pago no completado",
      body: "El pago no se completó. Podés intentarlo de nuevo.",
      details: [],
      action: PLAN_RETRY,
      secondaryAction: null,
      canRecheck: false,
      isWaiting: false,
      selectionNote: null,
      transferDetails: null,
    });
  });

  describe("when the API says why the last payment failed", () => {
    const rejectedBy = (
      purchase: PurchaseStatusDto,
      detail: string | null,
      rest: Partial<Omit<PurchaseResultInput, "purchase">> = {},
    ) =>
      presentPurchaseResult({
        timedOut: false,
        providerSaysRejected: false,
        ...rest,
        purchase: { ...purchase, status: "pending", paymentStatus: "rejected", paymentStatusDetail: detail },
      });

    it("tells the reason of a rejected card and offers to try again, though the purchase is still pending", () => {
      expect(rejectedBy(planPurchase, "cc_rejected_insufficient_amount")).toEqual({
        badge: { label: "Rechazado", tone: "danger" },
        title: "Pago no completado",
        body: "Tu tarjeta no tiene fondos suficientes. Probá con otra tarjeta u otro medio de pago.",
        details: [],
        action: PLAN_RETRY,
        secondaryAction: null,
        canRecheck: false,
        isWaiting: false,
        selectionNote: null,
        transferDetails: null,
      });
    });

    it("sends a booking back to the slot picker", () => {
      expect(rejectedBy(bookingPurchase, "cc_rejected_bad_filled_security_code").action).toEqual({
        label: "Intentar de nuevo",
        href: "/reservar?service=rehab",
      });
    });

    it("shows the reason without the URL saying anything and after the waiting time ran out", () => {
      expect(rejectedBy(planPurchase, "cc_rejected_card_disabled", { timedOut: true }).body).toBe(
        "Tu tarjeta está deshabilitada. Llamá a tu banco para activarla o probá con otra.",
      );
    });

    it("keeps the way back to the selection the user left", () => {
      const model = rejectedBy(planPurchase, "cc_rejected_card_disabled", {
        pendingSelection: { surface: "reservar", service: "rehab" },
      });

      expect(model.secondaryAction).toEqual({ label: "Volver a la selección", href: "/reservar?service=rehab" });
    });

    it.each([["a reason it does not know", "cc_rejected_other_reason"], ["no reason", null]])(
      "keeps the generic text for %s",
      (_name, detail) => {
        expect(rejectedBy(planPurchase, detail).body).toBe("Mercado Pago no aprobó el pago. Podés intentarlo de nuevo.");
      },
    );

    it("never shows the code Mercado Pago sent, nor an email", () => {
      const model = rejectedBy(planPurchase, "cc_rejected_something_new_4111111111111111");

      expect(JSON.stringify(model).toLowerCase()).not.toMatch(/cc_rejected|4111|mail/);
    });

    it("never turns an approved purchase into a failure because an earlier payment failed", () => {
      const model = presentPurchaseResult({
        timedOut: false,
        providerSaysRejected: false,
        purchase: {
          ...planPurchase,
          status: "approved",
          paymentStatus: "rejected",
          paymentStatusDetail: "cc_rejected_insufficient_amount",
        },
      });

      expect(model.badge.tone).toBe("success");
    });
  });

  describe("while the API says the last payment is in process", () => {
    const inProcess = (
      purchase: PurchaseStatusDto,
      rest: Partial<Omit<PurchaseResultInput, "purchase">> = {},
      detail = "pending_contingency",
    ) =>
      presentPurchaseResult({
        timedOut: false,
        providerSaysRejected: false,
        ...rest,
        purchase: { ...purchase, status: "pending", paymentStatus: "in_process", paymentStatusDetail: detail },
      });

    it("says it is being reviewed, never asks to pay again, and lets the client check again", () => {
      expect(inProcess(planPurchase)).toEqual({
        badge: { label: "En revisión", tone: "warning" },
        title: "Estamos revisando tu pago",
        body: "Mercado Pago todavía está procesando tu pago y puede demorar hasta 2 días hábiles. No pagues de nuevo: apenas se acredite, tu plan se activa.",
        details: [],
        action: PROFILE,
        secondaryAction: null,
        canRecheck: true,
        isWaiting: false,
        selectionNote: null,
        transferDetails: null,
      });
    });

    it("says the booking is confirmed once it is credited", () => {
      expect(inProcess(bookingPurchase).body).toBe(
        "Mercado Pago todavía está procesando tu pago y puede demorar hasta 2 días hábiles. No pagues de nuevo: apenas se acredite, tu reserva se confirma.",
      );
    });

    it("says the same for a manual review, and after the waiting time ran out", () => {
      expect(inProcess(planPurchase, { timedOut: true }, "pending_review_manual").title).toBe("Estamos revisando tu pago");
    });

    it("is not undone by the URL saying rejected: a payment in process must not be paid twice", () => {
      const model = inProcess(planPurchase, { providerSaysRejected: true });

      expect(model.title).toBe("Estamos revisando tu pago");
      expect(model.action).toEqual(PROFILE);
      expect(JSON.stringify(model)).not.toContain("Intentar de nuevo");
    });

    it("leads to continue the pending reservations, with the profile aside", () => {
      const model = inProcess(planPurchase, { pendingSelection: { surface: "bookings", service: "recovery" } });

      expect(model.action).toEqual({ label: "Continuar con mis reservas", href: "/bookings?service=recovery" });
      expect(model.secondaryAction).toEqual(PROFILE);
    });
  });

  it("never mentions an email, in any state", () => {
    const statuses: PurchaseStatus[] = ["pending", "approved", "rejected", "cancelled", "expired"];
    const models = [planPurchase, bookingPurchase].flatMap((purchase) =>
      statuses.flatMap((status) => [
        present(purchase, status),
        present(purchase, status, { timedOut: true }),
        present(purchase, status, { providerSaysRejected: true }),
        present({ ...purchase, needsAttention: true }, status),
      ]),
    );

    for (const model of models) {
      expect(JSON.stringify(model).toLowerCase()).not.toContain("mail");
    }
  });
});

describe("presentPurchaseResult for a purchase to pay at MOVE", () => {
  const cashPlan: PurchaseStatusDto = { ...planPurchase, itemName: "Mensual", amount: 2700, paymentMethod: "cash" };
  const transferBooking: PurchaseStatusDto = {
    ...bookingPurchase,
    itemName: "Evaluación y Diagnóstico",
    service: "rehab",
    amount: 1620,
    paymentMethod: "transfer",
    transferDetails: "BROU · Caja 000",
  };
  const present = (purchase: PurchaseStatusDto, unpaidLimit?: number | null) =>
    presentPurchaseResult({ purchase, timedOut: false, providerSaysRejected: false, unpaidLimit });

  it("tells a cash plan is active, how to pay and the cap counting the plan", () => {
    const model = present(cashPlan, 2);

    expect(model.badge.tone).toBe("success");
    expect(model.title).toBe("Tu plan ya está activo");
    expect(model.body).toBe(
      "Pagalo en MOVE en efectivo. Hasta que lo pagues podés tener como mucho 2 cosas sin pagar, contando el plan.",
    );
    expect(model.details).toEqual([
      { label: "Plan", value: "Mensual" },
      { label: "Medio", value: "Efectivo" },
      { label: "A pagar en MOVE", value: "$ 2.700" },
    ]);
    expect(model.transferDetails).toBeNull();
    expect(model.isWaiting).toBe(false);
    expect(model.canRecheck).toBe(false);
  });

  it("says 1 cosa, not 1 cosas, when the cap is 1", () => {
    expect(present(cashPlan, 1).body).toBe(
      "Pagalo en MOVE en efectivo. Hasta que lo pagues podés tener como mucho 1 cosa sin pagar, contando el plan.",
    );
  });

  it("leaves out the second sentence when the cap is not known", () => {
    expect(present(cashPlan).body).toBe("Pagalo en MOVE en efectivo.");
    expect(present(cashPlan, null).body).toBe("Pagalo en MOVE en efectivo.");
  });

  it("leads to book a turn and to the profile", () => {
    const model = present(cashPlan, 2);

    expect(model.action).toEqual({ label: "Reservar un turno", href: "/reservar?service=performance" });
    expect(model.secondaryAction).toEqual({ label: "Ir a mi perfil", href: "/dashboard" });
  });

  it("leads to continue the pending reservations, and the profile steps aside, like an approved payment", () => {
    const model = presentPurchaseResult({
      purchase: cashPlan,
      timedOut: false,
      providerSaysRejected: false,
      pendingSelection: { surface: "bookings", service: "recovery" },
    });

    expect(model.action).toEqual({ label: "Continuar con mis reservas", href: "/bookings?service=recovery" });
    expect(model.secondaryAction).toEqual({ label: "Ir a mi perfil", href: "/dashboard" });
  });

  it("says A definir when staff opened the charge with no amount", () => {
    const model = present({ ...cashPlan, amount: null }, 2);

    expect(model.details).toContainEqual({ label: "A pagar en MOVE", value: "A definir" });
    expect(JSON.stringify(model.details)).not.toMatch(/null|NaN/);
    expect(present({ ...cashPlan, amount: null, needsAttention: true }).details).toContainEqual({
      label: "Total",
      value: "A definir",
    });
  });

  it("tells a transfer booking is reserved, with the date and the transfer details", () => {
    const model = present(transferBooking, 2);

    expect(model.title).toBe("Tu turno está reservado");
    expect(model.body).toBe("Pagalo en MOVE por transferencia.");
    expect(model.details.map((detail) => detail.label)).toEqual([
      "Turno",
      "Servicio",
      "Medio",
      "A pagar en MOVE",
      "Fecha y hora",
    ]);
    expect(model.details[1].value).toBe("Fisioterapia");
    expect(model.details[2].value).toBe("Transferencia");
    expect(model.details[3].value).toBe("$ 1.620");
    expect(model.transferDetails).toBe("BROU · Caja 000");
  });

  describe("a purchase that cost nothing (a 100 % discount: the API settles it on the spot)", () => {
    const free = (purchase: PurchaseStatusDto): PurchaseStatusDto => ({ ...purchase, status: "approved", amount: 0 });

    it("says the plan is active and there is nothing to pay", () => {
      const model = present(free(cashPlan), 2);

      expect(model.badge).toEqual({ label: "Confirmado", tone: "success" });
      expect(model.title).toBe("Tu plan ya está activo");
      expect(model.body).toBe("No hay nada para pagar: esta compra no tuvo costo.");
      expect(model.details).toEqual([
        { label: "Plan", value: "Mensual" },
        { label: "Medio", value: "Efectivo" },
        { label: "Total", value: "Sin costo" },
      ]);
      expect(model.transferDetails).toBeNull();
      expect(model.action).toEqual({ label: "Reservar un turno", href: "/reservar?service=performance" });
      expect(model.secondaryAction).toEqual({ label: "Ir a mi perfil", href: "/dashboard" });
    });

    it("says the turn is reserved, with its service and date, and no transfer to make", () => {
      const model = present(free({ ...transferBooking, transferDetails: null }));

      expect(model.title).toBe("Tu turno está reservado");
      expect(model.details.map((detail) => detail.label)).toEqual(["Turno", "Servicio", "Medio", "Total", "Fecha y hora"]);
      expect(model.transferDetails).toBeNull();
    });

    it("never asks the client to pay at MOVE", () => {
      const text = JSON.stringify(present(free(cashPlan), 2));

      expect(text).not.toContain("Pagalo en MOVE");
      expect(text).not.toContain("A pagar en MOVE");
      expect(text).not.toContain("$ 0");
    });

    it("leads to continue the pending reservations, like any confirmed purchase", () => {
      const model = presentPurchaseResult({
        purchase: free(cashPlan),
        timedOut: false,
        providerSaysRejected: false,
        pendingSelection: { surface: "reservar", service: "recovery" },
      });

      expect(model.action?.label).toBe("Continuar con mis reservas");
    });

    it("keeps the approved screen for a purchase staff recorded as paid", () => {
      expect(present({ ...cashPlan, status: "approved" }).title).toBe("¡Listo! Tu pago fue aprobado.");
    });
  });

  describe("once staff closed it without collecting", () => {
    it("tells a waived plan is not charged and stays active", () => {
      const model = present({ ...cashPlan, status: "waived" });

      expect(model.badge).toEqual({ label: "No se cobra", tone: "neutral" });
      expect(model.title).toBe("No hay nada para pagar");
      expect(model.body).toBe("El equipo de MOVE marcó que este plan no se cobra. Tu plan sigue activo.");
      expect(model.action).toEqual({ label: "Ir a mi perfil", href: "/dashboard" });
      expect(model.secondaryAction).toBeNull();
    });

    it("tells a waived booking is not charged and stays confirmed", () => {
      const model = present({ ...transferBooking, status: "waived" });

      expect(model.title).toBe("No hay nada para pagar");
      expect(model.body).toBe("El equipo de MOVE marcó que este turno no se cobra. Tu reserva sigue confirmada.");
    });

    it("tells a cancelled booking needs no payment and offers to reserve another turn", () => {
      const model = present({ ...transferBooking, status: "cancelled" });

      expect(model.badge).toEqual({ label: "Cancelado", tone: "neutral" });
      expect(model.title).toBe("Reserva cancelada");
      expect(model.body).toBe("Esta reserva se canceló, así que ya no hay nada para pagar.");
      expect(model.action).toEqual({ label: "Reservar un turno", href: "/reservar?service=rehab" });
      expect(model.secondaryAction).toEqual({ label: "Ir a mi perfil", href: "/dashboard" });
    });

    it("tells a cancelled plan needs no payment either", () => {
      const model = present({ ...cashPlan, status: "cancelled" });

      expect(model.title).toBe("Compra cancelada");
      expect(model.body).toBe("Esta compra se canceló, así que ya no hay nada para pagar.");
    });

    it.each(["waived", "cancelled"] as const)("never says the payment failed or offers to try again (%s)", (status) => {
      const model = present({ ...transferBooking, status });
      const text = JSON.stringify(model);

      expect(text).not.toContain("Pago no completado");
      expect(text).not.toContain("Intentar de nuevo");
      expect(text).not.toContain("liberamos el horario");
      expect(model.canRecheck).toBe(false);
      expect(model.isWaiting).toBe(false);
    });

    it("keeps the Mercado Pago texts for a Mercado Pago purchase that was cancelled", () => {
      expect(present({ ...cashPlan, paymentMethod: "mercado_pago", status: "cancelled" }).title).toBe(
        "Pago no completado",
      );
    });
  });

  it("does not show the transfer details of a cash purchase", () => {
    expect(present({ ...transferBooking, paymentMethod: "cash", transferDetails: "BROU" }).transferDetails).toBeNull();
  });

  it("is not a waiting screen: Mercado Pago pending still waits", () => {
    expect(present({ ...cashPlan, paymentMethod: "mercado_pago" }).isWaiting).toBe(true);
  });

  it("still sends a purchase that needs review to the review screen", () => {
    expect(present({ ...cashPlan, needsAttention: true }).title).toBe("Revisamos tu pago");
  });
});
