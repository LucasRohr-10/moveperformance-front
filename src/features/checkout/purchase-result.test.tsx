import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PurchaseStatus, PurchaseStatusDto } from "@/lib/api/types";

vi.mock("./use-purchase-status", () => ({ usePurchaseStatus: vi.fn() }));
vi.mock("./checkout-api", () => ({ fetchOfflineOptions: vi.fn() }));

import {
  attachPurchaseToPendingSlotIntent,
  readPendingSlotIntentState,
  savePendingSlotIntent,
} from "@/features/bookings/pending-slot-intent";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { fetchOfflineOptions } from "./checkout-api";
import { PurchaseResult } from "./purchase-result";
import { CONSULTING_PAYMENT_MESSAGE } from "./purchase-result-view";
import { usePurchaseStatus, type PurchaseStatusState } from "./use-purchase-status";

const usePurchaseStatusMock = vi.mocked(usePurchaseStatus);
const recheck = vi.fn();
const fetchOfflineOptionsMock = vi.mocked(fetchOfflineOptions);

const PENDING_PLAN: PurchaseStatusDto = {
  externalReference: "ref-1",
  kind: "plan",
  status: "pending",
  itemName: "Plan mensual",
  service: "performance",
  amount: 2500,
  currency: "UYU",
  planId: "plan-1",
  bookingId: null,
  startsAt: null,
  needsAttention: false,
  paymentStatus: null,
  paymentStatusDetail: null,
  paymentMethod: "mercado_pago",
  transferDetails: null,
};

const APPROVED_BOOKING: PurchaseStatusDto = {
  ...PENDING_PLAN,
  kind: "booking",
  status: "approved",
  itemName: "Evaluación y Diagnóstico",
  service: "rehab",
  planId: "plan-eval",
  bookingId: "booking-1",
  startsAt: "2026-10-21T13:00:00.000Z",
};

function givenState(state: PurchaseStatusState) {
  usePurchaseStatusMock.mockReturnValue({ state, recheck });
}

const loaded = (purchase: PurchaseStatusDto, timedOut = false): PurchaseStatusState => ({
  phase: "loaded",
  purchase,
  timedOut,
});

function renderResult(props: { externalReference?: string | null; providerSaysRejected?: boolean } = {}) {
  return render(
    <PurchaseResult
      externalReference={props.externalReference === undefined ? "ref-1" : props.externalReference}
      providerSaysRejected={props.providerSaysRejected ?? false}
    />,
  );
}

describe("PurchaseResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("has the polite status region while loading", () => {
    givenState({ phase: "loading" });
    renderResult();

    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(within(region).getByText(CONSULTING_PAYMENT_MESSAGE)).toBeDefined();
    expect(usePurchaseStatusMock).toHaveBeenCalledWith("ref-1");
  });

  it("says 'Consultando tu pago…' while loading", () => {
    expect(CONSULTING_PAYMENT_MESSAGE).toBe("Consultando tu pago…");
  });

  it("announces politely, from the first render, the change of a purchase from pending to approved", () => {
    givenState(loaded(PENDING_PLAN));
    const { rerender } = renderResult();
    const region = screen.getByRole("status");
    expect(region.textContent).toContain("Confirmando tu pago");
    expect(within(region).getByTestId("notice-spinner")).toBeDefined();

    givenState(loaded({ ...PENDING_PLAN, status: "approved" }));
    rerender(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toContain("¡Listo! Tu pago fue aprobado.");
    expect(region.textContent).not.toContain("Confirmando tu pago");
  });

  it("tells the client why the card was rejected and links to try again, without the code or the payment data", () => {
    givenState(
      loaded({ ...PENDING_PLAN, paymentStatus: "rejected", paymentStatusDetail: "cc_rejected_insufficient_amount" }),
    );
    renderResult();

    const region = screen.getByRole("status");
    expect(region.textContent).toContain("Pago no completado");
    expect(region.textContent).toContain("Tu tarjeta no tiene fondos suficientes.");
    expect(region.textContent).not.toContain("cc_rejected");
    expect(region.textContent).not.toContain("Confirmando tu pago");
    expect(within(region).getByRole("link", { name: "Intentar de nuevo" }).getAttribute("href")).toBe(
      "/checkout/plan/plan-1",
    );
  });

  it("says a payment in process is under review and offers no new payment", () => {
    givenState(
      loaded({ ...PENDING_PLAN, paymentStatus: "in_process", paymentStatusDetail: "pending_contingency" }),
    );
    renderResult();

    const region = screen.getByRole("status");
    expect(region.textContent).toContain("Estamos revisando tu pago");
    expect(within(region).queryByRole("link", { name: "Intentar de nuevo" })).toBeNull();
    expect(within(region).getByRole("button", { name: "Volver a consultar" })).toBeDefined();
  });

  it("shows the date and time of an approved booking from startsAt", () => {
    givenState(loaded(APPROVED_BOOKING));
    renderResult();

    expect(screen.getByText("Fecha y hora")).toBeDefined();
    expect(screen.getByText("miércoles 21/10 · 10:00 hs")).toBeDefined();
  });

  it("leaves the date out of an approved booking without startsAt and shows no error", () => {
    givenState(loaded({ ...APPROVED_BOOKING, startsAt: null }));
    renderResult();

    expect(screen.getByText("¡Listo! Tu pago fue aprobado.")).toBeDefined();
    expect(screen.queryByText("Fecha y hora")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sends a rejected plan purchase back to its own checkout", () => {
    givenState(loaded({ ...PENDING_PLAN, status: "rejected" }));
    renderResult();

    expect(screen.getByRole("link", { name: "Intentar de nuevo" }).getAttribute("href")).toBe("/checkout/plan/plan-1");
  });

  it("says 'Pago no completado' when Mercado Pago rejected a plan the API still has pending", () => {
    givenState(loaded(PENDING_PLAN));
    renderResult({ providerSaysRejected: true });

    expect(screen.getByText("Pago no completado")).toBeDefined();
    expect(screen.queryByText("¡Listo! Tu pago fue aprobado.")).toBeNull();
    expect(screen.queryByText("Confirmando tu pago")).toBeNull();
  });

  it("never claims approval while the API says pending", () => {
    givenState(loaded(PENDING_PLAN, true));
    renderResult();

    expect(screen.getByText("Se agotó el tiempo de espera")).toBeDefined();
    expect(screen.queryByText("¡Listo! Tu pago fue aprobado.")).toBeNull();
  });

  it("lets the client ask again after the time-out", async () => {
    givenState(loaded(PENDING_PLAN, true));
    renderResult();

    await userEvent.click(screen.getByRole("button", { name: "Volver a consultar" }));
    expect(recheck).toHaveBeenCalledTimes(1);
  });

  it("never offers to pay again after a time-out — the first payment may still be processing", () => {
    givenState(loaded(PENDING_PLAN, true));
    renderResult();

    expect(screen.queryByRole("link", { name: "Intentar de nuevo" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ir a mi perfil" }).getAttribute("href")).toBe("/dashboard");
  });

  it("offers to continue with the chosen service once a plan purchase is approved and a pending slot intent exists", () => {
    savePendingSlotIntent({
      surface: "reservar",
      slots: [{ slotId: "slot-1", service: "performance", startsAt: "2026-11-05T13:00:00.000Z" }],
    });
    givenState(loaded({ ...PENDING_PLAN, status: "approved" }));

    renderResult();

    expect(
      screen.getByRole("link", { name: "Continuar con mis reservas" }).getAttribute("href"),
    ).toBe("/reservar?service=performance");
  });

  it("offers to continue at /bookings when the pending intent was saved from there", () => {
    savePendingSlotIntent({
      surface: "bookings",
      slots: [{ slotId: "slot-1", service: "recovery", startsAt: "2026-11-05T13:00:00.000Z" }],
    });
    givenState(loaded({ ...PENDING_PLAN, status: "approved" }));

    renderResult();

    expect(
      screen.getByRole("link", { name: "Continuar con mis reservas" }).getAttribute("href"),
    ).toBe("/bookings?service=recovery");
  });

  it("offers only the profile, not a resume link, when a plan purchase is approved but there is no pending intent", () => {
    givenState(loaded({ ...PENDING_PLAN, status: "approved" }));

    renderResult();

    expect(screen.queryByRole("link", { name: "Continuar con mis reservas" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ir a mi perfil" }).getAttribute("href")).toBe("/dashboard");
  });

  it("offers no resume link once the approved booking settles the slot it was paying for", () => {
    savePendingSlotIntent({
      surface: "reservar",
      slots: [{ slotId: "slot-1", service: "rehab", startsAt: "2026-11-05T13:00:00.000Z" }],
      payingSlotId: "slot-1",
    });
    givenState(loaded(APPROVED_BOOKING));

    renderResult();

    expect(screen.queryByRole("link", { name: "Continuar con mis reservas" })).toBeNull();
  });

  describe("a purchase to pay at MOVE", () => {
    const CASH_PLAN: PurchaseStatusDto = { ...PENDING_PLAN, paymentMethod: "cash", amount: 2700, itemName: "Mensual" };
    const offlineOptions = { discountPercent: null, transferDetails: null, unpaid: { count: 1, limit: 2, items: [] } };

    it("shows the success screen with the cap read from the API", async () => {
      fetchOfflineOptionsMock.mockResolvedValue(offlineOptions);
      givenState(loaded(CASH_PLAN));

      renderWithSnackbar(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

      expect(screen.getByText("Tu plan ya está activo")).toBeDefined();
      expect(
        await screen.findByText(
          "Pagalo en MOVE en efectivo. Hasta que lo pagues podés tener como mucho 2 cosas sin pagar, contando el plan.",
        ),
      ).toBeDefined();
      expect(screen.getByRole("link", { name: "Reservar un turno" }).getAttribute("href")).toBe(
        "/reservar?service=performance",
      );
    });

    it("still shows the success screen, without the cap, when the options cannot be read", async () => {
      fetchOfflineOptionsMock.mockRejectedValue(new Error("down"));
      givenState(loaded(CASH_PLAN));

      renderWithSnackbar(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

      expect(await screen.findByText("Pagalo en MOVE en efectivo.")).toBeDefined();
    });

    it("shows the transfer details with the copy button", async () => {
      givenState(loaded({ ...CASH_PLAN, paymentMethod: "transfer", transferDetails: "BROU · Caja 000" }));
      fetchOfflineOptionsMock.mockResolvedValue(offlineOptions);

      renderWithSnackbar(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

      expect(await screen.findByText("BROU · Caja 000")).toBeDefined();
      expect(screen.getByRole("button", { name: "Copiar datos" })).toBeDefined();
    });

    describe("a booking bought by hand", () => {
      const BOOKED_BY_HAND: PurchaseStatusDto = { ...APPROVED_BOOKING, status: "pending", paymentMethod: "cash" };
      const slot = (slotId: string, service: "rehab" | "recovery") => ({
        slotId,
        service,
        startsAt: "2026-11-05T13:00:00.000Z",
      });
      const savedSlotIds = () => {
        const state = readPendingSlotIntentState();
        return state.status === "ready" ? state.intent.slots.map((item) => item.slotId) : [];
      };

      it("settles the slot it was paying for, like an approved one", async () => {
        savePendingSlotIntent({
          surface: "reservar",
          slots: [slot("slot-1", "rehab"), slot("slot-2", "recovery")],
          payingSlotId: "slot-1",
        });
        givenState(loaded(BOOKED_BY_HAND));

        renderWithSnackbar(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

        expect(await screen.findByText("Tu turno está reservado")).toBeDefined();
        expect(savedSlotIds()).toEqual(["slot-2"]);
      });

      it("leads to continue the rest of the selection, with the profile second", async () => {
        savePendingSlotIntent({
          surface: "reservar",
          slots: [slot("slot-1", "rehab"), slot("slot-2", "recovery")],
          payingSlotId: "slot-1",
        });
        givenState(loaded(BOOKED_BY_HAND));

        renderWithSnackbar(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

        const links = (await screen.findAllByRole("link")).map((link) => link.textContent);
        expect(links).toEqual(["Continuar con mis reservas", "Ir a mi perfil"]);
        expect(screen.getByRole("link", { name: "Continuar con mis reservas" }).getAttribute("href")).toBe(
          "/reservar?service=recovery",
        );
      });

      it("offers to reserve a turn when the paid slot was the only one in the selection", async () => {
        savePendingSlotIntent({ surface: "reservar", slots: [slot("slot-1", "rehab")], payingSlotId: "slot-1" });
        givenState(loaded(BOOKED_BY_HAND));

        renderWithSnackbar(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

        expect(await screen.findByRole("link", { name: "Reservar un turno" })).toBeDefined();
        expect(screen.queryByRole("link", { name: "Continuar con mis reservas" })).toBeNull();
        expect(savedSlotIds()).toEqual([]);
      });

      it("keeps a selection this purchase was not waiting on", async () => {
        savePendingSlotIntent({ surface: "reservar", slots: [slot("slot-1", "rehab")], payingSlotId: "slot-1" });
        attachPurchaseToPendingSlotIntent("another-ref");
        givenState(loaded(BOOKED_BY_HAND));

        renderWithSnackbar(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

        await screen.findByText("Tu turno está reservado");
        expect(savedSlotIds()).toEqual(["slot-1"]);
      });
    });

    it("does not ask for the cap for a booking or a Mercado Pago purchase", () => {
      givenState(loaded({ ...APPROVED_BOOKING, status: "pending", paymentMethod: "cash" }));
      renderWithSnackbar(<PurchaseResult externalReference="ref-1" providerSaysRejected={false} />);

      expect(fetchOfflineOptionsMock).not.toHaveBeenCalled();
    });
  });

  it("keeps the region and asks for the reference when the link has none", () => {
    givenState({ phase: "loading" });
    renderResult({ externalReference: null });

    const region = screen.getByRole("status");
    expect(within(region).getByText("No encontramos la operación")).toBeDefined();
    expect(screen.getByText("Revisá el link o contactá a MOVE.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ir a mi perfil" }).getAttribute("href")).toBe("/dashboard");
    expect(usePurchaseStatusMock).not.toHaveBeenCalled();
  });

  it("shows that the operation does not exist on not-found, with no retry", () => {
    givenState({ phase: "not-found" });
    renderResult();

    expect(screen.getByText("No encontramos la operación")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("shows an alert with retry when the status cannot be read", async () => {
    givenState({ phase: "error" });
    renderResult();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("No pudimos consultar tu pago.");
    expect(alert.textContent).toContain("Probá de nuevo en unos minutos.");
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(recheck).toHaveBeenCalledTimes(1);
  });

  it("does not break the page on a status the contract does not know", () => {
    givenState(loaded({ ...PENDING_PLAN, status: "refunded" as PurchaseStatus }));
    renderResult();

    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar tu pago.");
    expect(screen.queryByText("¡Listo! Tu pago fue aprobado.")).toBeNull();
  });
});
