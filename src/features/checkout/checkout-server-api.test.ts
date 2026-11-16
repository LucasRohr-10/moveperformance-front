import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPlans } from "@/features/plans";
import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";
import type { BookableSlot, PlanDto } from "@/lib/api/types";

import { getBookingPlan, getCheckoutPlan, getCheckoutSlot, getOfflineOptions } from "./checkout-server-api";

vi.mock("@/lib/api/server");
vi.mock("@/features/plans");

const apiFetchServerMock = vi.mocked(apiFetchServer);
const getPlansMock = vi.mocked(getPlans);

const plan = (overrides: Partial<PlanDto>): PlanDto => ({
  id: "plan-1",
  service: "performance",
  kind: "period_plan",
  slug: "plan-1",
  name: "Plan",
  description: "",
  features: [],
  price: 1000,
  periodMonths: 1,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: null,
  featured: false,
  autoDebitEnabled: false,
  ...overrides,
});

const slot = (id: string): BookableSlot => ({
  id,
  service: "rehab",
  startsAt: "2026-10-21T13:00:00.000Z",
  endsAt: "2026-10-21T13:45:00.000Z",
  durationMinutes: 45,
  capacity: 1,
  available: 1,
  isFull: false,
  alreadyBooked: false,
});

beforeEach(() => {
  apiFetchServerMock.mockReset();
  getPlansMock.mockReset();
});

describe("getCheckoutPlan", () => {
  it("finds the plan among all the active plans", async () => {
    getPlansMock.mockResolvedValue([plan({ id: "a" }), plan({ id: "plan-trimestral" })]);

    await expect(getCheckoutPlan("plan-trimestral")).resolves.toMatchObject({ id: "plan-trimestral" });
    expect(getPlansMock).toHaveBeenCalledWith();
  });

  it("returns null for an unknown id", async () => {
    getPlansMock.mockResolvedValue([plan({ id: "a" })]);

    await expect(getCheckoutPlan("nope")).resolves.toBeNull();
  });
});

describe("getBookingPlan", () => {
  it("picks the first evaluation of rehab", async () => {
    getPlansMock.mockResolvedValue([
      plan({ id: "pack", service: "rehab", kind: "session_pack" }),
      plan({ id: "eval-1", service: "rehab", kind: "evaluation" }),
      plan({ id: "eval-2", service: "rehab", kind: "evaluation" }),
    ]);

    await expect(getBookingPlan("rehab")).resolves.toMatchObject({ id: "eval-1" });
    expect(getPlansMock).toHaveBeenCalledWith("rehab");
  });

  it("returns null for performance, which has no bookable plan", async () => {
    getPlansMock.mockResolvedValue([plan({ id: "a" })]);

    await expect(getBookingPlan("performance")).resolves.toBeNull();
  });
});

describe("getCheckoutSlot", () => {
  const input = { service: "rehab", date: "2026-10-21", slotId: "slot-1" } as const;

  it("asks for the slots of that day and returns the one with the id", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json([slot("slot-0"), slot("slot-1")]));

    await expect(getCheckoutSlot(input)).resolves.toMatchObject({ id: "slot-1" });
    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/bookings/slots?service=rehab&date=2026-10-21");
  });

  it("returns null when the slot is not in the list", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json([slot("slot-0")]));

    await expect(getCheckoutSlot(input)).resolves.toBeNull();
  });

  it("returns null when the API rejects the date", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 400, code: "VALIDATION_FAILED", message: "x" }, { status: 400 }),
    );

    await expect(getCheckoutSlot(input)).resolves.toBeNull();
  });

  it("throws the API's error for any other failure", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "x" }, { status: 500 }),
    );

    await expect(getCheckoutSlot(input)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("getOfflineOptions", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  const options = { discountPercent: 10, transferDetails: "BROU", unpaid: { count: 0, limit: 2, items: [] } };

  it("reads the options of the signed-in client", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(options));

    await expect(getOfflineOptions()).resolves.toEqual(options);
    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/checkout/offline-options");
  });

  it("is null when the API fails, so the screen only offers Mercado Pago", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json({ statusCode: 500, code: "X", message: "x" }, { status: 500 }));
    await expect(getOfflineOptions()).resolves.toBeNull();

    apiFetchServerMock.mockRejectedValue(new Error("network"));
    await expect(getOfflineOptions()).resolves.toBeNull();
  });
});
