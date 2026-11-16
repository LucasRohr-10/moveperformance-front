import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { BookableSlot, FailedSlotDto } from "@/lib/api/types";

import type { OfflineOptionsDto } from "@/lib/api/types";

import { batchFailureAction, BOOKING_FAILED_MESSAGE, toBookingFailure, unpaidLimitSnackbar } from "./booking-error-actions";

const SLOT: BookableSlot = {
  id: "slot-1",
  service: "recovery",
  startsAt: "2026-11-05T13:00:00.000Z",
  endsAt: "2026-11-05T14:00:00.000Z",
  durationMinutes: 60,
  capacity: 1,
  available: 1,
  isFull: false,
  alreadyBooked: false,
};

const OTHER_SLOT: BookableSlot = { ...SLOT, id: "slot-2", service: "performance" };

describe("toBookingFailure", () => {
  it("offers to pay the session for PACKAGE_REQUIRED, linking to that slot's checkout", () => {
    const error = new ApiError({ statusCode: 409, code: "PACKAGE_REQUIRED", message: "Necesitás un paquete." });

    const failure = toBookingFailure(error, SLOT);

    expect(failure.message).toBe("Necesitás un paquete.");
    expect(failure.action).toEqual({
      label: "Pagar esta sesión",
      href: "/checkout/reserva?service=recovery&date=2026-11-05&slot=slot-1",
    });
  });

  it("offers the plans page for PLAN_REQUIRED", () => {
    const error = new ApiError({ statusCode: 409, code: "PLAN_REQUIRED", message: "Necesitás un plan." });

    expect(toBookingFailure(error, SLOT).action).toEqual({ label: "Ver planes", href: "/plans" });
  });

  it("has no action for an unmapped code", () => {
    const error = new ApiError({ statusCode: 409, code: "SLOT_FULL", message: "No quedan cupos." });

    expect(toBookingFailure(error, SLOT)).toEqual({ message: "No quedan cupos.", action: null });
  });

  it("falls back to a generic message for a non-API error", () => {
    expect(toBookingFailure(new Error("boom"), SLOT)).toEqual({
      message: BOOKING_FAILED_MESSAGE,
      action: null,
    });
  });
});

describe("batchFailureAction", () => {
  function slotFor(map: Record<string, BookableSlot>) {
    return (id: string) => map[id];
  }

  it("offers one action when every failure shares the same actionable code", () => {
    const failures: FailedSlotDto[] = [
      { timeSlotId: "slot-1", code: "PACKAGE_REQUIRED", message: "x" },
      { timeSlotId: "slot-2", code: "PACKAGE_REQUIRED", message: "x" },
    ];

    const action = batchFailureAction(failures, slotFor({ "slot-1": SLOT, "slot-2": OTHER_SLOT }));

    expect(action).toEqual({
      label: "Pagar esta sesión",
      href: "/checkout/reserva?service=recovery&date=2026-11-05&slot=slot-1",
    });
  });

  it("offers no action when failures have mixed codes", () => {
    const failures: FailedSlotDto[] = [
      { timeSlotId: "slot-1", code: "PACKAGE_REQUIRED", message: "x" },
      { timeSlotId: "slot-2", code: "PLAN_REQUIRED", message: "x" },
    ];

    expect(batchFailureAction(failures, slotFor({ "slot-1": SLOT, "slot-2": OTHER_SLOT }))).toBeNull();
  });

  it("offers no action for an unmapped code", () => {
    const failures: FailedSlotDto[] = [{ timeSlotId: "slot-1", code: "SLOT_FULL", message: "x" }];

    expect(batchFailureAction(failures, slotFor({ "slot-1": SLOT }))).toBeNull();
  });

  it("offers no action when the failed slot can no longer be found", () => {
    const failures: FailedSlotDto[] = [{ timeSlotId: "missing", code: "PLAN_REQUIRED", message: "x" }];

    expect(batchFailureAction(failures, slotFor({}))).toBeNull();
  });

  it("is null for an empty list", () => {
    expect(batchFailureAction([], slotFor({}))).toBeNull();
  });
});

describe("unpaidLimitSnackbar", () => {
  const REASON = "Llegaste al máximo de cosas sin pagar en MOVE.";
  const unpaid = (items: OfflineOptionsDto["unpaid"]["items"], count = items.length): OfflineOptionsDto["unpaid"] => ({
    count,
    limit: count,
    items,
  });

  it("names each turn by its day and time, even though the API calls them all by the service", () => {
    const snackbar = unpaidLimitSnackbar(
      REASON,
      unpaid([
        { purchaseId: "p1", kind: "plan", label: "Mensual", amount: 2700, startsAt: null },
        { purchaseId: "p1", kind: "plan_booking", label: "Entrenamiento semi personalizado", amount: null, startsAt: "2026-11-10T22:00:00.000Z" },
        { purchaseId: "p1", kind: "plan_booking", label: "Entrenamiento semi personalizado", amount: null, startsAt: "2026-11-12T22:00:00.000Z" },
      ]),
    );

    const items = snackbar.groups?.[0].items;
    expect(items).toEqual([
      "Mensual · $ 2.700",
      "Turno del martes 10/11, 19:00",
      "Turno del jueves 12/11, 19:00",
    ]);
    expect(new Set(items).size).toBe(3);
  });

  it("names a session or an evaluation bought on its own, with its day, time and amount", () => {
    const snackbar = unpaidLimitSnackbar(
      REASON,
      unpaid([
        { purchaseId: "p2", kind: "booking", label: "Sesión individual", amount: 810, startsAt: "2026-11-07T13:00:00.000Z" },
        { purchaseId: "p3", kind: "booking", label: "Evaluación y Diagnóstico", amount: 1800, startsAt: "2026-11-09T12:00:00.000Z" },
      ]),
    );

    expect(snackbar.groups?.[0].items).toEqual([
      "Sesión individual · sábado 07/11, 10:00 · $ 810",
      "Evaluación y Diagnóstico · lunes 09/11, 09:00 · $ 1.800",
    ]);
  });

  it("falls back to the label of a turn that has no date, and leaves out an amount that is not there", () => {
    const snackbar = unpaidLimitSnackbar(
      REASON,
      unpaid([{ purchaseId: "p2", kind: "booking", label: "Evaluación y Diagnóstico", amount: null, startsAt: null }]),
    );

    expect(snackbar.groups?.[0].items).toEqual(["Evaluación y Diagnóstico"]);
  });

  it("says 1 cosa, not 1 cosas", () => {
    const snackbar = unpaidLimitSnackbar(REASON, unpaid([{ purchaseId: "p1", kind: "plan", label: "Mensual", amount: null, startsAt: null }]));

    expect(snackbar.message).toBe("Tenés 1 cosa sin pagar en MOVE, que es el máximo:");
  });
});
