import { describe, expect, it } from "vitest";

import type { PlanDto } from "@/lib/api/types";

import { presentSelectorPlans } from "./present-selector-plans";

const plan = (overrides: Partial<PlanDto>): PlanDto => ({
  id: "id",
  service: "performance",
  kind: "period_plan",
  slug: "slug",
  name: "Mensual",
  description: "",
  features: ["Asistencias ilimitadas con reserva", "Historial de entrenamiento"],
  price: 3900,
  periodMonths: 1,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: null,
  featured: false,
  autoDebitEnabled: false,
  ...overrides,
});

const performancePlans = [
  plan({ id: "mensual", name: "Mensual" }),
  plan({
    id: "trimestral",
    name: "Trimestral",
    price: 10500,
    featured: true,
    features: ["Asistencias ilimitadas con reserva", "Ahorrás un 10% vs. mensual"],
  }),
  plan({
    id: "semestral",
    name: "Semestral",
    price: 19800,
    features: ["Asistencias ilimitadas con reserva", "Ahorrás un 15% vs. mensual"],
  }),
];

describe("presentSelectorPlans", () => {
  it("lists the benefits of the first plan, which the others build on", () => {
    const [base] = presentSelectorPlans("performance", performancePlans);

    expect(base).toMatchObject({
      id: "mensual",
      name: "Plan Mensual",
      price: "$ 3.900",
      features: ["Asistencias ilimitadas con reserva", "Historial de entrenamiento"],
      includes: null,
    });
  });

  it("describes every other plan as the first one plus its saving", () => {
    const [, trimestral, semestral] = presentSelectorPlans("performance", performancePlans);

    expect(trimestral.features).toEqual([]);
    expect(trimestral.includes).toBe("Todo lo del Plan Mensual + ahorrás un 10%");
    expect(semestral.includes).toBe("Todo lo del Plan Mensual + ahorrás un 15%");
  });

  it("says 'de la' for Recovery, whose first plan is a feminine noun", () => {
    const recovery = presentSelectorPlans("recovery", [
      plan({
        id: "individual",
        service: "recovery",
        kind: "single_session",
        name: "Sesión individual",
      }),
      plan({
        id: "pack-4",
        service: "recovery",
        kind: "session_pack",
        name: "Paquete 4 sesiones",
        features: ["4 sesiones por mes", "Ahorrás un 11% vs. individual"],
      }),
    ]);

    expect(recovery[1].includes).toBe("Todo lo de la Sesión individual + ahorrás un 11%");
  });

  it("drops the saving when a plan does not advertise one", () => {
    const [, other] = presentSelectorPlans("performance", [
      plan({ id: "a", name: "Mensual" }),
      plan({ id: "b", name: "Anual", features: ["Asistencias ilimitadas con reserva"] }),
    ]);

    expect(other.includes).toBe("Todo lo del Plan Mensual");
  });

  it("carries the featured flag and the action of each plan kind", () => {
    const [mensual, trimestral] = presentSelectorPlans("performance", performancePlans);

    expect(mensual.featured).toBe(false);
    expect(trimestral.featured).toBe(true);
    expect(trimestral.actionLabel).toBe("Contratar");
    expect(trimestral.actionHref).toBe("/checkout/plan/trimestral");
  });

  it("returns nothing when there are no plans", () => {
    expect(presentSelectorPlans("performance", [])).toEqual([]);
  });
});
