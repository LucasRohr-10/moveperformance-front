import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { StaffPlanDto } from "@/lib/api/types";

import {
  fieldErrorsFrom,
  slugFromName,
  toFormValues,
  toPlanInput,
  toPlanPatch,
  validatePlanForm,
} from "./plan-form-values";

const pack: StaffPlanDto = {
  id: "1",
  service: "recovery",
  kind: "session_pack",
  slug: "paquete-4",
  name: "Paquete 4",
  description: "",
  features: ["4 sesiones"],
  price: 3200,
  periodMonths: null,
  periodDays: 30,
  sessionsIncluded: 4,
  durationMinutes: 45,
  featured: false,
  autoDebitEnabled: false,
  sortOrder: 0,
  isActive: true,
};

const packValues = (overrides: Record<string, string> = {}) => ({
  ...toFormValues(pack),
  ...overrides,
});

describe("toPlanInput", () => {
  it("sends only the fields of the kind, with the service the kind implies", () => {
    const input = toPlanInput(packValues({ periodMonths: "3" }));

    expect(input).toMatchObject({
      service: "recovery",
      kind: "session_pack",
      periodDays: 30,
      sessionsIncluded: 4,
      durationMinutes: 45,
    });
    expect(input).not.toHaveProperty("periodMonths");
  });

  it("omits an empty optional field", () => {
    expect(toPlanInput(packValues({ durationMinutes: "" }))).not.toHaveProperty("durationMinutes");
  });

  it("turns the features textarea into one feature per line, dropping blank lines", () => {
    expect(toPlanInput(packValues({ features: "a\n\n b " })).features).toEqual(["a", "b"]);
  });
});

describe("automatic debit", () => {
  const periodPlan: StaffPlanDto = {
    ...pack,
    service: "performance",
    kind: "period_plan",
    periodMonths: 1,
    periodDays: null,
    sessionsIncluded: null,
    durationMinutes: null,
  };
  const evaluation: StaffPlanDto = { ...periodPlan, service: "rehab", kind: "evaluation", durationMinutes: 45 };

  it("reads the flag of the plan into the form", () => {
    expect(toFormValues({ ...pack, autoDebitEnabled: true }).autoDebitEnabled).toBe("true");
    expect(toFormValues(pack).autoDebitEnabled).toBe("false");
    expect(toFormValues().autoDebitEnabled).toBe("false");
  });

  it("sends the flag for a period plan and a pack", () => {
    expect(toPlanInput({ ...toFormValues(periodPlan), autoDebitEnabled: "true" }).autoDebitEnabled).toBe(true);
    expect(toPlanInput(packValues()).autoDebitEnabled).toBe(false);
  });

  it("does not send the flag for a kind that cannot be debited", () => {
    const values = { ...toFormValues(evaluation), autoDebitEnabled: "true" };

    expect(toPlanInput(values)).not.toHaveProperty("autoDebitEnabled");
  });

  it("patches the flag only when it changed", () => {
    expect(toPlanPatch(packValues({ autoDebitEnabled: "true" }), pack)).toEqual({ autoDebitEnabled: true });
    expect(toPlanPatch(packValues({ name: "Otro" }), pack)).toEqual({ name: "Otro" });
  });

  it("never patches the flag of a kind that cannot be debited", () => {
    const values = { ...toFormValues(evaluation), autoDebitEnabled: "true" };

    expect(toPlanPatch(values, evaluation)).toEqual({});
  });
});

describe("toPlanPatch", () => {
  it("contains only what changed", () => {
    expect(toPlanPatch(packValues({ name: "Otro" }), pack)).toEqual({ name: "Otro" });
  });

  it("is empty when nothing changed", () => {
    expect(toPlanPatch(toFormValues(pack), pack)).toEqual({});
  });

  it("sends null when the optional duration is emptied", () => {
    expect(toPlanPatch(packValues({ durationMinutes: "" }), pack)).toEqual({ durationMinutes: null });
  });

  it("does not send an empty optional duration that was already empty", () => {
    const withoutDuration = { ...pack, durationMinutes: null };

    expect(toPlanPatch(toFormValues(withoutDuration), withoutDuration)).toEqual({});
  });
});

describe("fieldErrorsFrom", () => {
  it("maps each detail to its field", () => {
    const error = new ApiError({
      statusCode: 400,
      code: "PLAN_KIND_INVALID",
      message: "El tipo de plan no es válido para esta operación.",
      details: [{ field: "sessionsIncluded", messages: ["Este tipo de plan necesita este dato."] }],
    });

    expect(fieldErrorsFrom(error)).toEqual({ sessionsIncluded: "Este tipo de plan necesita este dato." });
  });

  it("puts SLUG_TAKEN under the slug", () => {
    const error = new ApiError({
      statusCode: 409,
      code: "SLUG_TAKEN",
      message: "Ya existe un plan con ese identificador.",
    });

    expect(fieldErrorsFrom(error)).toEqual({ slug: "Ya existe un plan con ese identificador." });
  });

  it("returns nothing for an error that is not an ApiError", () => {
    expect(fieldErrorsFrom(new TypeError("Failed to fetch"))).toEqual({});
  });
});

describe("validatePlanForm", () => {
  it("accepts a complete pack", () => {
    expect(validatePlanForm(toFormValues(pack))).toEqual({});
  });

  it("asks for a name, a slug in the right format and whole numbers", () => {
    const errors = validatePlanForm(
      packValues({ name: "A", slug: "Con Espacios", price: "10.5", sessionsIncluded: "" }),
    );

    expect(Object.keys(errors).sort()).toEqual(["name", "price", "sessionsIncluded", "slug"]);
  });

  it("does not ask for the optional duration", () => {
    expect(validatePlanForm(packValues({ durationMinutes: "" }))).toEqual({});
  });

  it("ignores the fields of other kinds", () => {
    expect(validatePlanForm(packValues({ periodMonths: "abc" }))).toEqual({});
  });
});

describe("slugFromName", () => {
  it("lowercases, removes accents and joins words with dashes", () => {
    expect(slugFromName("  Sesión Suelta · Recovery ")).toBe("sesion-suelta-recovery");
  });
});
