import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";
import type { AutoDebitDto, MySubscriptionsDto, PlanDto } from "@/lib/api/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./checkout-server-api", () => ({ getCheckoutPlan: vi.fn(), getOfflineOptions: vi.fn() }));
vi.mock("@/features/auto-debits/auto-debits-server-api", () => ({ getMyAutoDebits: vi.fn() }));
vi.mock("@/features/auto-debits", () => ({ startAutoDebit: vi.fn() }));
vi.mock("@/features/subscriptions", () => ({
  getMySubscriptions: vi.fn(),
  formatBusinessDate: vi.fn(),
}));

import { getMyAutoDebits } from "@/features/auto-debits/auto-debits-server-api";
import { getMySubscriptions } from "@/features/subscriptions";

import { getCheckoutPlan, getOfflineOptions } from "./checkout-server-api";
import { PlanCheckout } from "./plan-checkout";

const getCheckoutPlanMock = vi.mocked(getCheckoutPlan);
const getMySubscriptionsMock = vi.mocked(getMySubscriptions);
const getMyAutoDebitsMock = vi.mocked(getMyAutoDebits);
const getOfflineOptionsMock = vi.mocked(getOfflineOptions);

const trimestral: PlanDto = {
  id: "plan-trimestral",
  service: "performance",
  kind: "period_plan",
  slug: "trimestral",
  name: "Trimestral",
  description: "",
  features: ["Acceso libre"],
  price: 10500,
  periodMonths: 3,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: null,
  featured: false,
  autoDebitEnabled: false,
};

const noSubscriptions: MySubscriptionsDto = {
  performance: null,
  upcomingPerformances: [],
  recoveryPacks: [],
};

const performanceDebit: AutoDebitDto = {
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
};

const pack: PlanDto = {
  ...trimestral,
  id: "pack-4",
  service: "recovery",
  kind: "session_pack",
  name: "Paquete 4 sesiones",
  price: 3200,
  periodMonths: null,
  periodDays: 30,
  sessionsIncluded: 4,
};

const apiFailure = new ApiError({ statusCode: 500, code: "INTERNAL", message: "boom" });

describe("PlanCheckout", () => {
  beforeEach(() => {
    getCheckoutPlanMock.mockReset();
    getMySubscriptionsMock.mockReset();
    getMyAutoDebitsMock.mockReset();
    getMyAutoDebitsMock.mockResolvedValue([]);
    getOfflineOptionsMock.mockReset();
    getOfflineOptionsMock.mockResolvedValue(null);
  });

  it("shows the plan summary and the pay button", async () => {
    getCheckoutPlanMock.mockResolvedValue(trimestral);
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.getByText("Plan Trimestral")).toBeDefined();
    expect(screen.getByText(/\$ 10\.500/)).toBeDefined();
    expect(screen.queryByText("3 meses")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
  });

  it("offers cash and transfer with the discounted total and the cap notice when the API has the options", async () => {
    getCheckoutPlanMock.mockResolvedValue(trimestral);
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);
    getOfflineOptionsMock.mockResolvedValue({
      discountPercent: 10,
      transferDetails: "BROU · Caja 000",
      unpaid: { count: 0, limit: 2, items: [] },
    });

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.getByRole("radio", { name: "Efectivo" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Transferencia" })).toBeDefined();
    expect(screen.getByText(/tu plan queda activo ya/)).toBeDefined();
    expect(screen.getByTestId("checkout-total").textContent).toBe("$ 10.500");
  });

  it("puts the cap notice in the left column, under the plan, with the key words in bold", async () => {
    getCheckoutPlanMock.mockResolvedValue(trimestral);
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);
    getOfflineOptionsMock.mockResolvedValue({
      discountPercent: 10,
      transferDetails: "BROU · Caja 000",
      unpaid: { count: 0, limit: 2, items: [] },
    });

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    const bold = screen.getByText("Si elegís efectivo o transferencia");
    expect(bold.tagName).toBe("STRONG");
    expect(screen.getByText("2 cosas sin pagar").tagName).toBe("STRONG");
    const notice = bold.closest('[role="status"]');
    expect(notice?.textContent).toContain("(el plan cuenta como una y cada turno que reserves, como otra).");
    // The right card (options, total, button) does not hold it: it sits next to the plan it talks about.
    const payCard = screen.getByRole("group", { name: "¿Cómo querés pagar?" }).closest("div.flex-col");
    expect(payCard?.contains(notice ?? null)).toBe(false);
  });

  it("only offers Mercado Pago when the options cannot be read", async () => {
    getCheckoutPlanMock.mockResolvedValue(trimestral);
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText(/Si elegís efectivo/)).toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
  });

  it("still shows the summary, without the renewal note, when the subscriptions fail", async () => {
    getCheckoutPlanMock.mockResolvedValue(trimestral);
    getMySubscriptionsMock.mockRejectedValue(apiFailure);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
    expect(screen.queryByText(/Ya tenés un plan de Performance/)).toBeNull();
  });

  it("says the plan is not available when it does not exist", async () => {
    getCheckoutPlanMock.mockResolvedValue(null);
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);

    renderWithSnackbar(await PlanCheckout({ planId: "missing" }));

    expect(screen.getByText("Plan no disponible")).toBeDefined();
    expect(screen.getByText("Este plan no existe o no se puede contratar online.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver planes" }).getAttribute("href")).toBe("/plans");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says the plan is not available when it is not a plan that can be bought", async () => {
    getCheckoutPlanMock.mockResolvedValue({ ...trimestral, kind: "single_session" });
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.getByText("Plan no disponible")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows an alert with a retry link to the same checkout when the plan fails to load", async () => {
    getCheckoutPlanMock.mockRejectedValue(apiFailure);
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar el plan.");
    expect(screen.getByText("Probá de nuevo en unos minutos.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe(
      "/checkout/plan/plan-trimestral",
    );
  });

  it("offers automatic debit only when the plan allows it", async () => {
    getCheckoutPlanMock.mockResolvedValue({ ...trimestral, autoDebitEnabled: true });
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.getByRole("group", { name: "¿Cómo querés pagar?" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Pago único" })).toHaveProperty("checked", true);
    expect(screen.getByRole("radio", { name: "Débito automático" })).toBeDefined();
  });

  it("shows no payment options for a plan without automatic debit", async () => {
    getCheckoutPlanMock.mockResolvedValue(trimestral);
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("blocks a Performance purchase while a debit is authorized", async () => {
    getCheckoutPlanMock.mockResolvedValue({ ...trimestral, autoDebitEnabled: true });
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);
    getMyAutoDebitsMock.mockResolvedValue([performanceDebit]);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.getByText("Ya tenés débito automático activo para Performance.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Gestionarlo en mi perfil" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("still sells Recovery with an authorized Performance debit", async () => {
    getCheckoutPlanMock.mockResolvedValue({ ...pack, autoDebitEnabled: true });
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);
    getMyAutoDebitsMock.mockResolvedValue([performanceDebit]);

    renderWithSnackbar(await PlanCheckout({ planId: "pack-4" }));

    expect(screen.queryByText("Ya tenés débito automático activo para Performance.")).toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
  });

  it("still sells a Recovery pack while a Recovery debit is authorized", async () => {
    getCheckoutPlanMock.mockResolvedValue({ ...pack, autoDebitEnabled: true });
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);
    getMyAutoDebitsMock.mockResolvedValue([{ ...performanceDebit, service: "recovery", planId: "pack-4" }]);

    renderWithSnackbar(await PlanCheckout({ planId: "pack-4" }));

    expect(screen.queryByText("Ya tenés débito automático activo para Performance.")).toBeNull();
    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
  });

  it("still sells the plan when the debits cannot be read", async () => {
    getCheckoutPlanMock.mockResolvedValue(trimestral);
    getMySubscriptionsMock.mockResolvedValue(noSubscriptions);
    getMyAutoDebitsMock.mockRejectedValue(apiFailure);

    renderWithSnackbar(await PlanCheckout({ planId: "plan-trimestral" }));

    expect(screen.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeDefined();
  });
});
