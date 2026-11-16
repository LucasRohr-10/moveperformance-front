import { describe, expect, it } from "vitest";

import type { PlanDto } from "@/lib/api/types";

import { presentPlan } from "./present-plan";

const basePlan: PlanDto = {
  id: "plan-id",
  service: "performance",
  kind: "period_plan",
  slug: "performance-mensual",
  name: "Mensual",
  description: "",
  features: ["Asistencias ilimitadas con reserva"],
  price: 3900,
  periodMonths: 1,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: null,
  featured: false,
  autoDebitEnabled: false,
};

describe("presentPlan", () => {
  it("presents a period plan with its name, price and checkout action", () => {
    expect(presentPlan(basePlan)).toMatchObject({
      name: "Plan Mensual",
      price: "$ 3.900",
      actionLabel: "Contratar",
    });
  });

  it("presents a session pack by its validity in days", () => {
    const pack: PlanDto = {
      ...basePlan,
      service: "recovery",
      kind: "session_pack",
      name: "Paquete 4 sesiones",
      price: 3200,
      periodMonths: null,
      periodDays: 30,
      sessionsIncluded: 4,
    };

    expect(presentPlan(pack)).toMatchObject({
      name: "Paquete 4 sesiones",
      price: "$ 3.200",
      actionLabel: "Contratar paquete",
    });
  });

  it("presents a single session and an evaluation as one-off bookings", () => {
    const single: PlanDto = {
      ...basePlan,
      service: "recovery",
      kind: "single_session",
      name: "Sesión individual",
      price: 900,
      periodMonths: null,
      durationMinutes: 45,
    };
    const evaluation: PlanDto = {
      ...single,
      service: "rehab",
      kind: "evaluation",
      name: "Evaluación",
    };

    expect(presentPlan(single)).toMatchObject({
      price: "$ 900",
      actionLabel: "Reservar sesión",
    });
    expect(presentPlan(evaluation)).toMatchObject({
      actionLabel: "Reservar evaluación",
    });
  });

  describe("actionHref", () => {
    it("sends a period plan to the checkout of that plan", () => {
      const trimestral = { ...basePlan, id: "plan-trimestral", periodMonths: 3 };

      expect(presentPlan(trimestral).actionHref).toBe("/checkout/plan/plan-trimestral");
    });

    it("sends a session pack to the checkout of that pack", () => {
      const pack: PlanDto = {
        ...basePlan,
        id: "plan-pack-4",
        service: "recovery",
        kind: "session_pack",
        name: "Paquete 4 sesiones",
        periodMonths: null,
        periodDays: 30,
        sessionsIncluded: 4,
      };

      expect(presentPlan(pack).actionHref).toBe("/checkout/plan/plan-pack-4");
    });

    it("sends a single session and an evaluation to the public booking of their service", () => {
      const single: PlanDto = {
        ...basePlan,
        service: "recovery",
        kind: "single_session",
        name: "Sesión individual",
        periodMonths: null,
        durationMinutes: 45,
      };
      const evaluation: PlanDto = { ...single, service: "rehab", kind: "evaluation", name: "Evaluación" };

      expect(presentPlan(single).actionHref).toBe("/reservar?service=recovery");
      expect(presentPlan(evaluation).actionHref).toBe("/reservar?service=rehab");
    });

    it("has no destination for a kind it does not know yet", () => {
      const future = { ...basePlan, kind: "lifetime" } as unknown as PlanDto;

      expect(presentPlan(future).actionHref).toBeNull();
    });
  });

  it("highlights a featured plan with a badge, and only that one", () => {
    expect(presentPlan({ ...basePlan, featured: true })).toMatchObject({
      highlighted: true,
      badge: "Recomendado",
    });
    expect(presentPlan(basePlan)).toMatchObject({
      highlighted: false,
      badge: undefined,
    });
  });

  it("groups thousands in prices of five digits and more", () => {
    expect(presentPlan({ ...basePlan, price: 19800 }).price).toBe("$ 19.800");
  });

  it("shows a kind it does not know yet instead of crashing", () => {
    const future = { ...basePlan, kind: "lifetime" } as unknown as PlanDto;

    expect(presentPlan(future)).toMatchObject({
      name: "Mensual",
      actionLabel: "Contratar",
    });
  });
});
