import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { OfflineChargeDto } from "@/lib/api/types";

import {
  OFFLINE_CHARGE_STATUS,
  OFFLINE_ERROR_CODES,
  PAYMENT_METHOD_LABELS,
  formatChargeDateTime,
  formatOfflineAmount,
  formatPaidOn,
  offlineChargeHref,
  offlineChargeRowKey,
  offlineChargeSubtitle,
  offlineChargeWhat,
  offlineChargeWhen,
  offlineChargeTitle,
  offlineErrorCode,
  offlineErrorMessage,
  owedSummary,
  toCollectHref,
} from "./offline-charge-labels";

type TitleInput = Pick<OfflineChargeDto, "service" | "booking" | "itemName">;

describe("offline charge labels", () => {
  it("labels every payment method", () => {
    expect(PAYMENT_METHOD_LABELS).toEqual({
      mercado_pago: "Mercado Pago",
      cash: "Efectivo",
      transfer: "Transferencia",
      undecided: "A definir",
    });
  });

  it("labels every charge status", () => {
    expect(OFFLINE_CHARGE_STATUS).toEqual({
      pending: { label: "Por cobrar", tone: "warning" },
      approved: { label: "Pagado", tone: "success" },
      cancelled: { label: "Cancelado, no se cobró", tone: "neutral" },
      waived: { label: "No se cobra", tone: "neutral" },
    });
  });

  it("titles a charge with service, weekday, date and time", () => {
    const charge: TitleInput = {
      service: "recovery",
      itemName: "Sesión de Recovery",
      booking: { startsAt: "2026-11-06T13:00:00.000Z", status: "confirmed" },
    };

    expect(offlineChargeTitle(charge)).toBe("Recovery · vie 6/11, 10:00");
  });

  it("titles a charge without booking with its item", () => {
    const charge: TitleInput = { service: "recovery", itemName: "Sesión de Recovery", booking: null };

    expect(offlineChargeTitle(charge)).toBe("Recovery · Sesión de Recovery");
  });

  it("reads the API message or the fallback", () => {
    const apiError = new ApiError({
      statusCode: 409,
      code: OFFLINE_ERROR_CODES.NOT_OPEN,
      message: "El cobro ya no está abierto.",
    });
    const nonJson = new ApiError({ statusCode: 502, code: "UNKNOWN", message: "Bad Gateway" });

    expect(offlineErrorCode(apiError)).toBe("OFFLINE_CHARGE_NOT_OPEN");
    expect(offlineErrorCode(new Error("x"))).toBeNull();
    expect(offlineErrorMessage(apiError, "Fallback")).toBe("El cobro ya no está abierto.");
    expect(offlineErrorMessage(nonJson, "Fallback")).toBe("Fallback");
    expect(offlineErrorMessage(new Error("x"), "Fallback")).toBe("Fallback");
  });

  it("links to a charge's detail page", () => {
    expect(offlineChargeHref("ch1")).toBe("/staff/payments/offline-charges/ch1");
  });

  it("links to Por cobrar, for one client when given", () => {
    expect(toCollectHref()).toBe("/staff/payments?view=to-collect");
    expect(toCollectHref("c 1")).toBe("/staff/payments?view=to-collect&clientId=c%201");
  });

  it("links to the overdue charges, alone or for one client", () => {
    expect(toCollectHref(undefined, { overdue: true })).toBe("/staff/payments?view=to-collect&atrasados=true");
    expect(toCollectHref("c1", { overdue: true })).toBe("/staff/payments?view=to-collect&clientId=c1&atrasados=true");
    expect(toCollectHref(undefined, { overdue: false })).toBe("/staff/payments?view=to-collect");
  });

  it("links to today's charges, alone or for one client, and never asks for today and overdue together", () => {
    expect(toCollectHref(undefined, { today: true })).toBe("/staff/payments?view=to-collect&dia=hoy");
    expect(toCollectHref("c1", { today: true })).toBe("/staff/payments?view=to-collect&clientId=c1&dia=hoy");
    expect(toCollectHref(undefined, { today: false })).toBe("/staff/payments?view=to-collect");
    expect(toCollectHref(undefined, { today: true, overdue: true })).toBe("/staff/payments?view=to-collect&dia=hoy");
  });

  it("formats a moment as dd/mm hh:mm in Montevideo", () => {
    expect(formatChargeDateTime("2026-11-02T12:05:00.000Z")).toBe("02/11 09:05");
    expect(formatChargeDateTime("2026-11-03T02:30:00.000Z")).toBe("02/11 23:30");
  });

  it("formats the payment date and the amount", () => {
    expect(formatPaidOn("2026-11-02")).toBe("02/11/2026");
    expect(formatOfflineAmount(1200)).toBe("$ 1.200");
    expect(formatOfflineAmount(1200.5)).toBe("$ 1.200,50");
    expect(formatOfflineAmount(1250.5)).toBe("$ 1.250,50");
    expect(formatOfflineAmount(0.5)).toBe("$ 0,50");
    expect(formatOfflineAmount(null)).toBe("—");
  });
});

describe("an unpaid plan and the turns booked with it", () => {
  const plan = {
    kind: "plan" as const,
    planStartsOn: "2026-11-04",
    paysWith: null,
    bookingId: null,
    booking: null,
    service: "performance" as const,
    itemName: "Mensual",
    id: "ch-plan",
  };
  const turn = {
    ...plan,
    paysWith: { itemName: "Mensual" },
    bookingId: "b1",
    booking: { startsAt: "2026-11-10T22:00:00.000Z", status: "confirmed" as const },
  };
  const session = {
    kind: "booking" as const,
    planStartsOn: null,
    paysWith: null,
    bookingId: "b2",
    booking: { startsAt: "2026-11-12T13:00:00.000Z", status: "confirmed" as const },
    service: "recovery" as const,
    itemName: "Sesión individual",
    id: "ch-s",
  };

  it("names the plan with its service, and a turn of it by its service alone, as the mockup does", () => {
    expect(offlineChargeWhat(plan)).toBe("Plan Mensual · Performance");
    expect(offlineChargeWhat(turn)).toBe("Turno Performance");
    expect(offlineChargeWhat(session)).toBe("Sesión individual · Recovery");
  });

  it("says since when the plan runs, and when each turn is", () => {
    expect(offlineChargeWhen(plan)).toBe("Desde 04/11");
    expect(offlineChargeWhen(turn)).toBe("Mar 10/11 19:00");
    expect(offlineChargeWhen(session)).toBe("Jue 12/11 10:00");
    expect(offlineChargeWhen({ ...session, booking: null })).toBeNull();
  });

  it("says a turn of the plan is paid with the plan, and nothing for the rest", () => {
    expect(offlineChargeSubtitle(turn)).toBe("Se paga con el plan Mensual");
    expect(offlineChargeSubtitle(plan)).toBeNull();
    expect(offlineChargeSubtitle(session)).toBeNull();
  });

  describe("a Recovery pack is a paquete, not a plan", () => {
    const pack = { ...plan, service: "recovery" as const, itemName: "Paquete 4 sesiones", id: "ch-pack" };
    const packTurn = { ...pack, paysWith: { itemName: "Paquete 4 sesiones" }, bookingId: "b9", booking: turn.booking };

    it("names the pack by its own name, and a turn of it by its service", () => {
      expect(offlineChargeWhat(pack)).toBe("Paquete 4 sesiones · Recovery");
      expect(offlineChargeWhat(packTurn)).toBe("Turno Recovery");
    });

    it("says a turn is paid with the paquete", () => {
      expect(offlineChargeSubtitle(packTurn)).toBe("Se paga con el paquete 4 sesiones");
      expect(offlineChargeSubtitle(turn)).toBe("Se paga con el plan Mensual");
    });

    it("says since when the pack runs", () => {
      expect(offlineChargeWhen(pack)).toBe("Desde 04/11");
    });

    it("tells what is owed as a paquete, apart from a plan", () => {
      expect(owedSummary([{ id: "k", kind: "plan", service: "recovery" }])).toBe("Falta pagar el paquete");
      expect(owedSummary([{ id: "k", kind: "plan", service: "recovery" }, { id: "k2", kind: "plan", service: "recovery" }])).toBe(
        "Falta pagar 2 paquetes",
      );
      expect(
        owedSummary([
          { id: "a", kind: "plan", service: "performance" },
          { id: "k", kind: "plan", service: "recovery" },
          { id: "s", kind: "booking", service: "recovery" },
        ]),
      ).toBe("Falta pagar el plan, el paquete y 1 turno");
    });
  });

  it("titles the plan with its service and name", () => {
    expect(offlineChargeTitle({ service: "performance", itemName: "Mensual", booking: null })).toBe("Performance · Mensual");
  });

  it("gives a row of a turn its own key, even with the plan's id", () => {
    const keys = [plan, turn, { ...turn, bookingId: "b2" }].map(offlineChargeRowKey);

    expect(keys).toEqual(["ch-plan:plan", "ch-plan:b1", "ch-plan:b2"]);
    expect(new Set(keys).size).toBe(3);
  });
});

describe("owedSummary", () => {
  it("is null when nothing is owed", () => {
    expect(owedSummary([])).toBeNull();
  });

  it("counts each charge once, so a plan with its turns is one plan", () => {
    const rows = [
      { id: "p", kind: "plan" as const, service: "performance" as const },
      { id: "p", kind: "plan" as const, service: "performance" as const },
      { id: "p", kind: "plan" as const, service: "performance" as const },
    ];

    expect(owedSummary(rows)).toBe("Falta pagar el plan");
  });

  it("tells plans and turns apart, in singular and plural", () => {
    expect(owedSummary([{ id: "a", kind: "booking", service: "performance" }])).toBe("Falta pagar 1 turno");
    expect(owedSummary([{ id: "a", kind: "booking", service: "performance" }, { id: "b", kind: "booking", service: "performance" }])).toBe("Falta pagar 2 turnos");
    expect(owedSummary([{ id: "a", kind: "plan", service: "performance" }, { id: "b", kind: "plan", service: "performance" }])).toBe("Falta pagar 2 planes");
    expect(owedSummary([{ id: "a", kind: "plan", service: "performance" }, { id: "b", kind: "booking", service: "performance" }])).toBe("Falta pagar el plan y 1 turno");
  });
});
