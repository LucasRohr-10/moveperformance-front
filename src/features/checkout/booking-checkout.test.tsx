import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";
import type { BookableSlot, PlanDto } from "@/lib/api/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./checkout-server-api", () => ({
  getBookingPlan: vi.fn(),
  getCheckoutSlot: vi.fn(),
  getOfflineOptions: vi.fn(),
}));

import { BookingCheckout } from "./booking-checkout";
import { getBookingPlan, getCheckoutSlot, getOfflineOptions } from "./checkout-server-api";

const getBookingPlanMock = vi.mocked(getBookingPlan);
const getCheckoutSlotMock = vi.mocked(getCheckoutSlot);
const getOfflineOptionsMock = vi.mocked(getOfflineOptions);

const evaluation: PlanDto = {
  id: "plan-eval",
  service: "rehab",
  kind: "evaluation",
  slug: "evaluacion",
  name: "Evaluación y Diagnóstico",
  description: "",
  features: [],
  price: 2500,
  periodMonths: null,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: 45,
  featured: false,
  autoDebitEnabled: false,
};

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

const validParams = { service: "rehab", date: "2026-10-21", slotId: "slot-1" };
const UNAVAILABLE_TITLE = "Ese horario ya no está disponible";

describe("BookingCheckout", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T12:00:00.000Z"));
    getBookingPlanMock.mockReset();
    getCheckoutSlotMock.mockReset();
    getBookingPlanMock.mockResolvedValue(evaluation);
    getCheckoutSlotMock.mockResolvedValue(slot);
    getOfflineOptionsMock.mockReset();
    getOfflineOptionsMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the booking summary and the pay button for a valid slot", async () => {
    renderWithSnackbar(await BookingCheckout(validParams));

    expect(screen.getByText("Rehab")).toBeDefined();
    expect(screen.getByText("Evaluación y Diagnóstico")).toBeDefined();
    expect(screen.getByText("miércoles 21/10 · 10:00 hs")).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
    expect(getCheckoutSlotMock).toHaveBeenCalledWith({ service: "rehab", date: "2026-10-21", slotId: "slot-1" });
  });

  it("offers cash and transfer for the booking, and the hold notice only while paying with Mercado Pago", async () => {
    getOfflineOptionsMock.mockResolvedValue({
      discountPercent: null,
      transferDetails: null,
      unpaid: { count: 0, limit: 2, items: [] },
    });

    renderWithSnackbar(await BookingCheckout(validParams));

    expect(screen.getByRole("radio", { name: "Efectivo" })).toBeDefined();
    expect(screen.queryByRole("radio", { name: "Transferencia" })).toBeNull();
    expect(screen.getByText("Guardamos tu horario unos minutos mientras completás el pago.")).toBeDefined();
    expect(screen.getByText(/tu turno queda reservado ya/)).toBeDefined();
  });

  it.each([
    ["a missing slot id", { ...validParams, slotId: undefined }],
    ["a missing date", { ...validParams, date: undefined }],
  ])("offers another slot for %s", async (_name, params) => {
    renderWithSnackbar(await BookingCheckout(params));

    expect(screen.getByText(UNAVAILABLE_TITLE)).toBeDefined();
    expect(screen.getByText("Elegí otro horario para continuar.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Elegir otro horario" }).getAttribute("href")).toBe(
      "/bookings?service=rehab",
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it.each([
    ["a slot that is not there", null],
    ["a full slot", { ...slot, isFull: true }],
    ["a slot the client already booked", { ...slot, alreadyBooked: true }],
    ["a slot that already started", { ...slot, startsAt: "2026-10-19T11:00:00.000Z" }],
  ])("offers another slot for %s", async (_name, found) => {
    getCheckoutSlotMock.mockResolvedValue(found);

    renderWithSnackbar(await BookingCheckout(validParams));

    expect(screen.getByText(UNAVAILABLE_TITLE)).toBeDefined();
    expect(screen.getByRole("link", { name: "Elegir otro horario" })).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sends the client back to the picker of the service in the link, whichever it is", async () => {
    renderWithSnackbar(await BookingCheckout({ ...validParams, service: "performance" }));

    expect(screen.getByText(UNAVAILABLE_TITLE)).toBeDefined();
    expect(screen.getByRole("link", { name: "Elegir otro horario" }).getAttribute("href")).toBe(
      "/bookings?service=performance",
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("falls back to the Rehab picker when the service in the link is unknown", async () => {
    renderWithSnackbar(await BookingCheckout({ ...validParams, service: "yoga" }));

    expect(screen.getByRole("link", { name: "Elegir otro horario" }).getAttribute("href")).toBe(
      "/bookings?service=rehab",
    );
  });

  it("sends the client back to the picker of the recovery service", async () => {
    getCheckoutSlotMock.mockResolvedValue(null);

    renderWithSnackbar(await BookingCheckout({ ...validParams, service: "recovery" }));

    expect(screen.getByRole("link", { name: "Elegir otro horario" }).getAttribute("href")).toBe(
      "/bookings?service=recovery",
    );
  });

  it("says the service cannot be paid online when there is no booking plan", async () => {
    getBookingPlanMock.mockResolvedValue(null);

    renderWithSnackbar(await BookingCheckout(validParams));

    expect(screen.getByText("Este servicio no se puede pagar online por ahora.")).toBeDefined();
    expect(screen.getByText("Volvé a intentarlo más tarde.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Volver" }).getAttribute("href")).toBe("/bookings?service=rehab");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows an alert, without leaving the screen, when the API fails", async () => {
    getCheckoutSlotMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "boom" }));

    renderWithSnackbar(await BookingCheckout(validParams));

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar tu reserva.");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe(
      "/checkout/reserva?service=rehab&date=2026-10-21&slot=slot-1",
    );
  });
});
