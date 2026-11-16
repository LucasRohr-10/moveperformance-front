import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";
import type { CheckoutResponseDto } from "@/lib/api/types";

vi.mock("./checkout-api", () => ({
  startPlanCheckout: vi.fn(),
  startBookingCheckout: vi.fn(),
}));
vi.mock("@/features/auto-debits", () => ({ startAutoDebit: vi.fn() }));
vi.mock("./redirect-to-payment", () => ({ redirectToPayment: vi.fn() }));
const pushMock = vi.fn();
const refreshMock = vi.fn();
const router = { push: pushMock, refresh: refreshMock };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { startAutoDebit } from "@/features/auto-debits";

import { startBookingCheckout, startPlanCheckout } from "./checkout-api";
import { BookingPayButton, PlanPayButton } from "./pay-button";
import type { PaymentModeOption } from "./present-checkout";
import { redirectToPayment } from "./redirect-to-payment";

const startPlanCheckoutMock = vi.mocked(startPlanCheckout);
const startBookingCheckoutMock = vi.mocked(startBookingCheckout);
const startAutoDebitMock = vi.mocked(startAutoDebit);
const redirectToPaymentMock = vi.mocked(redirectToPayment);

const checkoutResponse: CheckoutResponseDto = {
  purchaseId: "purchase-1",
  externalReference: "ref-1",
  redirectUrl: "https://pay.test/x",
  bookingId: null,
  holdExpiresAt: null,
};

const apiError = (code: string, message: string) =>
  new ApiError({ statusCode: 409, code, message });

describe("PlanPayButton", () => {
  beforeEach(() => {
    startPlanCheckoutMock.mockReset();
    redirectToPaymentMock.mockReset();
  });

  it("pays with Mercado Pago and stays disabled while it redirects", async () => {
    startPlanCheckoutMock.mockResolvedValue(checkoutResponse);
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={[]} price="$ 10.500" />);

    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));

    const busy = await screen.findByRole("button", { name: "Te llevamos a Mercado Pago…" });
    expect(busy).toHaveProperty("disabled", true);
    expect(startPlanCheckoutMock).toHaveBeenCalledWith("plan-1");
    expect(redirectToPaymentMock).toHaveBeenCalledWith("https://pay.test/x");
  });

  it("shows the footnote about how the purchase is confirmed", () => {
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={[]} price="$ 10.500" />);

    expect(
      screen.getByText(
        "Vas a pagar en Mercado Pago. Tu compra se confirma cuando Mercado Pago nos avisa que el pago se acreditó.",
      ),
    ).toBeDefined();
  });

  it("shows the provider error and enables the button again", async () => {
    startPlanCheckoutMock.mockRejectedValue(
      new ApiError({
        statusCode: 502,
        code: "PAYMENT_PROVIDER_ERROR",
        message: "No pudimos iniciar el pago. Probá de nuevo en unos minutos.",
      }),
    );
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={[]} price="$ 10.500" />);

    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos iniciar el pago. Probá de nuevo en unos minutos.",
    );
    expect(screen.getByRole("alert").querySelector("[data-snackbar-title]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toHaveProperty("disabled", false);
  });
});

const NO_OFFLINE = { priceLine: null, howTo: null, transferDetails: null, disabledReason: null };

const debitModes: PaymentModeOption[] = [
  { value: "one_time", label: "Pago único", description: null, ...NO_OFFLINE },
  {
    value: "auto_debit",
    label: "Débito automático",
    description: "Se cobra automáticamente cada mes con Mercado Pago.",
    ...NO_OFFLINE,
  },
];

const BLOCK_TEXT = "Ya tenés débito automático activo para Performance.";

describe("PlanPayButton with automatic debit", () => {
  beforeEach(() => {
    startPlanCheckoutMock.mockReset();
    startAutoDebitMock.mockReset();
    redirectToPaymentMock.mockReset();
  });

  it("starts as a single payment and shows no options for a plan without debit", () => {
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={[]} price="$ 10.500" />);

    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
  });

  it("switches the button to Activar débito automático", async () => {
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={debitModes} price="$ 10.500" />);
    expect(screen.getByRole("radio", { name: "Pago único" })).toHaveProperty("checked", true);

    await userEvent.click(screen.getByRole("radio", { name: "Débito automático" }));

    expect(screen.getByRole("button", { name: "Activar débito automático" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Pagar con Mercado Pago" })).toBeNull();
  });

  it("starts once on a double click and redirects to the payment link", async () => {
    startAutoDebitMock.mockResolvedValue({ externalReference: "ref-1", redirectUrl: "https://mp.test/subscribe" });
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={debitModes} price="$ 10.500" />);
    await userEvent.click(screen.getByRole("radio", { name: "Débito automático" }));

    await userEvent.dblClick(screen.getByRole("button", { name: "Activar débito automático" }));

    expect(await screen.findByRole("button", { name: "Te llevamos a Mercado Pago…" })).toHaveProperty("disabled", true);
    expect(startAutoDebitMock).toHaveBeenCalledTimes(1);
    expect(startAutoDebitMock).toHaveBeenCalledWith("plan-1");
    expect(startPlanCheckoutMock).not.toHaveBeenCalled();
    expect(redirectToPaymentMock).toHaveBeenCalledTimes(1);
    expect(redirectToPaymentMock).toHaveBeenCalledWith("https://mp.test/subscribe");
  });

  it("shows the block when the API answers AUTO_DEBIT_ACTIVE", async () => {
    startAutoDebitMock.mockRejectedValue(apiError("AUTO_DEBIT_ACTIVE", "Ya tenés un débito automático activo."));
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={debitModes} price="$ 10.500" />);
    await userEvent.click(screen.getByRole("radio", { name: "Débito automático" }));

    await userEvent.click(screen.getByRole("button", { name: "Activar débito automático" }));

    expect(await screen.findByText(BLOCK_TEXT)).toBeDefined();
    expect(screen.getByRole("link", { name: "Gestionarlo en mi perfil" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.queryByRole("button", { name: "Activar débito automático" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the block too when the single payment answers AUTO_DEBIT_ACTIVE", async () => {
    startPlanCheckoutMock.mockRejectedValue(apiError("AUTO_DEBIT_ACTIVE", "Ya tenés un débito automático activo."));
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={debitModes} price="$ 10.500" />);

    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));

    expect(await screen.findByText(BLOCK_TEXT)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Pagar con Mercado Pago" })).toBeNull();
  });

  it("shows the API message, not the Performance block, when a Recovery debit answers AUTO_DEBIT_ACTIVE", async () => {
    startAutoDebitMock.mockRejectedValue(
      apiError("AUTO_DEBIT_ACTIVE", "Ya tenés un débito automático activo para este servicio."),
    );
    renderWithSnackbar(<PlanPayButton planId="pack-1" service="recovery" paymentModes={debitModes} price="$ 10.500" />);
    await userEvent.click(screen.getByRole("radio", { name: "Débito automático" }));

    await userEvent.click(screen.getByRole("button", { name: "Activar débito automático" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Ya tenés un débito automático activo para este servicio.");
    expect(screen.queryByText(BLOCK_TEXT)).toBeNull();
    expect(screen.getByRole("button", { name: "Activar débito automático" })).toHaveProperty("disabled", false);
  });

  it("shows other errors in an alert and lets the client try again", async () => {
    startAutoDebitMock.mockRejectedValue(
      new ApiError({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR", message: "Mercado Pago no responde." }),
    );
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={debitModes} price="$ 10.500" />);
    await userEvent.click(screen.getByRole("radio", { name: "Débito automático" }));

    await userEvent.click(screen.getByRole("button", { name: "Activar débito automático" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Mercado Pago no responde.");
    expect(screen.getByRole("button", { name: "Activar débito automático" })).toHaveProperty("disabled", false);
  });
});

describe("BookingPayButton", () => {
  beforeEach(() => {
    startBookingCheckoutMock.mockReset();
  });

  it("starts the booking checkout with the plan and the slot", async () => {
    startBookingCheckoutMock.mockResolvedValue(checkoutResponse);
    renderWithSnackbar(<BookingPayButton planId="plan-1" timeSlotId="slot-1" service="rehab" paymentModes={[]} price="$ 1.800" />);

    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));

    expect(startBookingCheckoutMock).toHaveBeenCalledWith("plan-1", "slot-1");
  });

  it.each([
    ["SLOT_FULL", "No quedan cupos para este turno."],
    ["SLOT_NOT_BOOKABLE", "Este turno ya no admite reservas."],
    ["SLOT_NOT_FOUND", "No encontramos el turno."],
    ["ALREADY_BOOKED", "Ya tenés una reserva activa para este turno."],
  ])("offers another slot on %s", async (code, message) => {
    startBookingCheckoutMock.mockRejectedValue(apiError(code, message));
    renderWithSnackbar(<BookingPayButton planId="plan-1" timeSlotId="slot-1" service="rehab" paymentModes={[]} price="$ 1.800" />);

    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));

    expect((await screen.findByRole("alert")).textContent).toContain(message);
    expect(screen.getByRole("link", { name: "Elegir otro horario" }).getAttribute("href")).toBe(
      "/bookings?service=rehab",
    );
    // Paying again for this slot is certain to fail: picking another one is the only way on.
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toHaveProperty("disabled", true);
  });

  it("starts fresh for another slot after a slot error", async () => {
    startBookingCheckoutMock.mockRejectedValue(apiError("SLOT_FULL", "No quedan cupos para este turno."));
    const { rerender } = renderWithSnackbar(<BookingPayButton planId="plan-1" timeSlotId="slot-1" service="rehab" paymentModes={[]} price="$ 1.800" />);
    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));
    await screen.findByRole("alert");

    // Next keeps the checkout route alive and reuses it when the client picks another slot.
    rerender(<BookingPayButton planId="plan-1" timeSlotId="slot-2" service="rehab" paymentModes={[]} price="$ 1.800" />);

    expect(screen.queryByRole("link", { name: "Elegir otro horario" })).toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toHaveProperty("disabled", false);
  });

  it.each([
    ["PLAN_INACTIVE", "Este plan no está disponible."],
    ["PAYMENT_PROVIDER_ERROR", "No pudimos iniciar el pago. Probá de nuevo en unos minutos."],
  ])("offers no other slot on %s", async (code, message) => {
    startBookingCheckoutMock.mockRejectedValue(apiError(code, message));
    renderWithSnackbar(<BookingPayButton planId="plan-1" timeSlotId="slot-1" service="rehab" paymentModes={[]} price="$ 1.800" />);

    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));

    expect((await screen.findByRole("alert")).textContent).toContain(message);
    expect(screen.queryByRole("link", { name: "Elegir otro horario" })).toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toHaveProperty("disabled", false);
  });
});

const HOLD_NOTICE = "Guardamos tu horario unos minutos mientras completás el pago.";

const offlineModes: PaymentModeOption[] = [
  { value: "one_time", label: "Pago único", description: "Con Mercado Pago · $ 3.000", ...NO_OFFLINE },
  {
    value: "cash",
    label: "Efectivo",
    description: null,
    priceLine: { full: "$ 3.000", discounted: "$ 2.700", percent: 10 },
    howTo: "Pagás en MOVE",
    transferDetails: null,
    disabledReason: null,
  },
];

describe("the total follows the chosen option", () => {
  it("crosses out the price and shows the discounted one for cash, and goes back for Mercado Pago", async () => {
    renderWithSnackbar(
      <PlanPayButton
        planId="plan-1"
        service="performance"
        paymentModes={offlineModes}
        price="$ 3.000"
      />,
    );
    const total = () => screen.getByTestId("checkout-total");
    expect(total().textContent).toBe("$ 3.000");

    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));

    expect(total().textContent).toBe("$ 3.000$ 2.700");
    expect(within(total()).getByText("$ 3.000").className).toContain("line-through");

    await userEvent.click(screen.getByRole("radio", { name: "Pago único" }));

    expect(total().textContent).toBe("$ 3.000");
  });

  it("shows the hold notice of a booking only with Mercado Pago", async () => {
    renderWithSnackbar(
      <BookingPayButton
        planId="plan-1"
        timeSlotId="slot-1"
        service="rehab"
        paymentModes={offlineModes}
        price="$ 3.000"
        holdNotice={HOLD_NOTICE}
      />,
    );
    expect(screen.getByText(HOLD_NOTICE)).toBeDefined();

    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));

    expect(screen.queryByText(HOLD_NOTICE)).toBeNull();
  });
});

const CONFIRM_ALIAS = { name: "Confirmar" };

describe("confirming a cash or transfer purchase", () => {
  beforeEach(() => {
    startPlanCheckoutMock.mockReset();
    startBookingCheckoutMock.mockReset();
    redirectToPaymentMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  const renderPlan = () =>
    renderWithSnackbar(<PlanPayButton planId="plan-1" service="performance" paymentModes={offlineModes} price="$ 3.000" />);

  it("says Confirmar, without the Mercado Pago note, and starts the checkout with the mode", async () => {
    startPlanCheckoutMock.mockResolvedValue({ ...checkoutResponse, redirectUrl: null });
    renderPlan();

    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));
    expect(screen.queryByText(/Vas a pagar en Mercado Pago/)).toBeNull();
    await userEvent.click(screen.getByRole("button", CONFIRM_ALIAS));

    expect(startPlanCheckoutMock).toHaveBeenCalledWith("plan-1", "cash");
    expect(pushMock).toHaveBeenCalledWith("/checkout/resultado?ref=ref-1");
    expect(redirectToPaymentMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Confirmando…" })).toHaveProperty("disabled", true);
  });

  it("makes one purchase when the client double clicks Confirmar", async () => {
    startPlanCheckoutMock.mockResolvedValue({ ...checkoutResponse, redirectUrl: null });
    renderPlan();
    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));

    await userEvent.dblClick(screen.getByRole("button", CONFIRM_ALIAS));

    expect(startPlanCheckoutMock).toHaveBeenCalledTimes(1);
  });

  it("goes back to paying with Mercado Pago, with no mode sent", async () => {
    startPlanCheckoutMock.mockResolvedValue(checkoutResponse);
    renderPlan();
    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));
    await userEvent.click(screen.getByRole("radio", { name: "Pago único" }));

    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));

    expect(startPlanCheckoutMock).toHaveBeenCalledWith("plan-1");
  });

  it("falls back to Mercado Pago when the chosen option is no longer usable for the next slot", async () => {
    startBookingCheckoutMock.mockResolvedValue(checkoutResponse);
    const atTheCap: PaymentModeOption[] = offlineModes.map((option) =>
      option.value === "cash" ? { ...option, disabledReason: "Tenés 2 cosas sin pagar en MOVE, que es el máximo." } : option,
    );
    const { rerender } = renderWithSnackbar(
      <BookingPayButton planId="plan-1" timeSlotId="slot-1" service="rehab" paymentModes={offlineModes} price="$ 3.000" />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));
    expect(screen.getByRole("button", CONFIRM_ALIAS)).toBeDefined();

    // Next keeps the checkout route alive: the next slot arrives with the cash option disabled.
    rerender(<BookingPayButton planId="plan-1" timeSlotId="slot-2" service="rehab" paymentModes={atTheCap} price="$ 3.000" />);

    expect(screen.getByRole("radio", { name: "Pago único" })).toHaveProperty("checked", true);
    expect(screen.getByRole("radio", { name: "Efectivo" })).toHaveProperty("checked", false);
    expect(screen.getByTestId("checkout-total").textContent).toBe("$ 3.000");
    await userEvent.click(screen.getByRole("button", { name: "Pagar con Mercado Pago" }));
    expect(startBookingCheckoutMock).toHaveBeenCalledWith("plan-1", "slot-2");
  });

  it("falls back to Mercado Pago when the chosen option is gone from the list", async () => {
    const { rerender } = renderWithSnackbar(
      <PlanPayButton planId="plan-1" service="performance" paymentModes={offlineModes} price="$ 3.000" />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));

    rerender(<PlanPayButton planId="plan-1" service="performance" paymentModes={[offlineModes[0]]} price="$ 3.000" />);

    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
    expect(screen.queryByRole("button", CONFIRM_ALIAS)).toBeNull();
  });

  it("books and confirms a booking by hand", async () => {
    startBookingCheckoutMock.mockResolvedValue({ ...checkoutResponse, redirectUrl: null, bookingId: "b1" });
    renderWithSnackbar(
      <BookingPayButton planId="plan-1" timeSlotId="slot-1" service="rehab" paymentModes={offlineModes} price="$ 3.000" />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));
    await userEvent.click(screen.getByRole("button", CONFIRM_ALIAS));

    expect(startBookingCheckoutMock).toHaveBeenCalledWith("plan-1", "slot-1", "cash");
  });

  it.each([
    ["UNPAID_LIMIT_REACHED", "Llegaste al máximo de cosas sin pagar en MOVE."],
    ["TRANSFER_DISABLED", "MOVE no está recibiendo transferencias. Elegí otro medio de pago."],
  ])("shows the API message as a red snackbar for %s and lets the client try again", async (code, message) => {
    startPlanCheckoutMock.mockRejectedValue(apiError(code, message));
    renderPlan();
    await userEvent.click(screen.getByRole("radio", { name: "Efectivo" }));

    await userEvent.click(screen.getByRole("button", CONFIRM_ALIAS));

    expect((await screen.findByRole("alert")).textContent).toContain(message);
    expect(screen.getByRole("button", CONFIRM_ALIAS)).toHaveProperty("disabled", false);
    // The screen reads the options again: what the API refused shows as unavailable.
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
