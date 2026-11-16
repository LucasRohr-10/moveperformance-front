import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ApiError } from "@/lib/api/errors";
import type { AutoDebitDto, MySubscriptionsDto } from "@/lib/api/types";

vi.mock("@/features/auto-debits", () => ({ AutoDebitLine: () => null }));
vi.mock("@/features/auto-debits/auto-debits-server-api", () => ({
  getMyAutoDebits: vi.fn(),
}));
vi.mock("@/features/checkout/checkout-server-api", () => ({ getOfflineOptions: vi.fn() }));
vi.mock("./get-my-subscriptions", () => ({
  getMySubscriptions: vi.fn(),
}));

import { getMyAutoDebits } from "@/features/auto-debits/auto-debits-server-api";
import { getOfflineOptions } from "@/features/checkout/checkout-server-api";

import { getMySubscriptions } from "./get-my-subscriptions";
import { MySubscriptionsSection } from "./my-subscriptions-section";

const getMySubscriptionsMock = vi.mocked(getMySubscriptions);
const getMyAutoDebitsMock = vi.mocked(getMyAutoDebits);
const getOfflineOptionsMock = vi.mocked(getOfflineOptions);

const dto: MySubscriptionsDto = {
  performance: {
    id: "p1",
    planId: "plan-1",
    planName: "Trimestral",
    startsOn: "2026-08-15",
    endsOn: "2026-11-15",
    status: "active",
    daysLeft: 34,
    expiringSoon: false,
    purchaseId: null,
    awaitingPayment: false,
  },
  upcomingPerformances: [],
  recoveryPacks: [],
};

const expiringDto: MySubscriptionsDto = {
  ...dto,
  performance: { ...dto.performance!, daysLeft: 3, expiringSoon: true },
};

const debit = (overrides: Partial<AutoDebitDto> = {}): AutoDebitDto => ({
  id: "d1",
  externalReference: "ref-1",
  planId: "plan-1",
  planName: "Trimestral",
  service: "performance",
  status: "authorized",
  amount: 3900,
  currency: "UYU",
  frequency: 1,
  frequencyType: "months",
  nextChargeOn: "2026-11-16",
  createdAt: "2026-08-15T12:00:00.000Z",
  cancelledAt: null,
  cancelReason: null,
  ...overrides,
});

describe("MySubscriptionsSection", () => {
  beforeEach(() => {
    getMySubscriptionsMock.mockReset();
    getMyAutoDebitsMock.mockReset();
    getMyAutoDebitsMock.mockResolvedValue([]);
    getOfflineOptionsMock.mockReset();
    getOfflineOptionsMock.mockResolvedValue(null);
  });

  it("renders the overview when the API answers", async () => {
    getMySubscriptionsMock.mockResolvedValue(dto);

    renderWithSnackbar(await MySubscriptionsSection());

    expect(
      screen.getByRole("heading", { name: "Plan Trimestral" }),
    ).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    [
      "an API error",
      new ApiError({ statusCode: 500, code: "INTERNAL", message: "Boom" }),
    ],
    ["a network failure", new TypeError("fetch failed")],
  ])("shows an error card with a retry link on %s", async (_label, error) => {
    getMySubscriptionsMock.mockRejectedValue(error);

    renderWithSnackbar(await MySubscriptionsSection());

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("No pudimos cargar tu plan.");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe(
      "/dashboard",
    );
  });

  describe("the expiring warning and the automatic debit", () => {
    beforeEach(() => {
      getMySubscriptionsMock.mockResolvedValue(expiringDto);
    });

    it("shows the warning when the client has no debit", async () => {
      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.getByRole("link", { name: "Renovar plan" })).toBeDefined();
    });

    it("hides the warning when an authorized debit renews Performance", async () => {
      getMyAutoDebitsMock.mockResolvedValue([debit()]);

      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.queryByRole("link", { name: "Renovar plan" })).toBeNull();
      expect(screen.getByText("Activo")).toBeDefined();
    });

    it.each([
      ["a cancelled debit of Performance", debit({ status: "cancelled" })],
      ["a pending debit of Performance", debit({ status: "pending" })],
      ["an authorized debit of Recovery", debit({ service: "recovery" })],
    ])("still shows the warning with %s", async (_label, other) => {
      getMyAutoDebitsMock.mockResolvedValue([other]);

      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.getByRole("link", { name: "Renovar plan" })).toBeDefined();
    });

    it("still shows the warning, and no error card, when the debits cannot be read", async () => {
      getMyAutoDebitsMock.mockRejectedValue(new TypeError("fetch failed"));

      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.getByRole("link", { name: "Renovar plan" })).toBeDefined();
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("the expired plan and the automatic debit", () => {
    beforeEach(() => {
      getMySubscriptionsMock.mockResolvedValue({
        ...dto,
        performance: { ...dto.performance!, status: "expired", daysLeft: 0 },
      });
    });

    it("sends the client to the plans when no debit renews the plan", async () => {
      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.getByRole("link", { name: "Ver planes" })).toBeDefined();
      expect(screen.getByText(/Tu plan venció/)).toBeDefined();
    });

    it("shows nothing to do when an authorized debit renews Performance", async () => {
      getMyAutoDebitsMock.mockResolvedValue([debit()]);

      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.queryByRole("link", { name: "Ver planes" })).toBeNull();
      expect(screen.queryByText(/Tu plan venció/)).toBeNull();
      expect(screen.getByText("Vencido")).toBeDefined();
    });

    it("sends the client to the plans again when the debit was cancelled", async () => {
      getMyAutoDebitsMock.mockResolvedValue([debit({ status: "cancelled" })]);

      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.getByRole("link", { name: "Ver planes" })).toBeDefined();
    });
  });

  it("does not ask for the cap when nothing is waiting for payment", async () => {
    getMySubscriptionsMock.mockResolvedValue(dto);

    renderWithSnackbar(await MySubscriptionsSection());

    expect(getOfflineOptionsMock).not.toHaveBeenCalled();
  });

  describe("a plan waiting for payment", () => {
    const unpaidDto: MySubscriptionsDto = {
      ...dto,
      performance: { ...dto.performance!, purchaseId: "pur-1", awaitingPayment: true },
    };

    it("shows Sin pagar with the amount and the turns left", async () => {
      getMySubscriptionsMock.mockResolvedValue(unpaidDto);
      getOfflineOptionsMock.mockResolvedValue({
        discountPercent: null,
        transferDetails: null,
        unpaid: {
          count: 1,
          limit: 2,
          items: [{ purchaseId: "pur-1", kind: "plan", label: "Plan", amount: 2700, startsAt: null }],
        },
      });

      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.getByText("Sin pagar")).toBeDefined();
      expect(screen.getByText("Pagalo en MOVE ($ 2.700). Mientras tanto, podés reservar 1 turno más.")).toBeDefined();
    });

    it("still shows the badge, without the amount, when the options cannot be read", async () => {
      getMySubscriptionsMock.mockResolvedValue(unpaidDto);

      renderWithSnackbar(await MySubscriptionsSection());

      expect(screen.getByText("Sin pagar")).toBeDefined();
      expect(screen.getByText("Pagalo en MOVE.")).toBeDefined();
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});
