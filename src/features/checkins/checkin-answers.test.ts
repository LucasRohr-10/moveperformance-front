import { describe, expect, it } from "vitest";

import { type CompleteCheckinForm, EMPTY_CHECKIN_FORM, toCheckinAnswers, validateCheckin } from "./checkin-answers";

const complete: CompleteCheckinForm = {
  feeling: "good",
  pain: "none",
  painDetail: "",
  goals: "same",
  goalsDetail: "",
};

describe("validateCheckin", () => {
  it("asks for every answer", () => {
    expect(validateCheckin(EMPTY_CHECKIN_FORM)).toEqual({
      ok: false,
      errors: {
        feeling: "Elegí cómo te sentís.",
        pain: "Contanos si sentiste alguna molestia.",
        goals: "Contanos si cambiaron tus objetivos.",
      },
    });
  });

  it("requires the pain detail when there was a mild pain", () => {
    expect(validateCheckin({ ...complete, pain: "mild", painDetail: "   " })).toEqual({
      ok: false,
      errors: { painDetail: "Contanos dónde sentís la molestia." },
    });
  });

  it("limits each detail to 500 characters", () => {
    const tooLong = "a".repeat(501);

    expect(validateCheckin({ ...complete, pain: "mild", painDetail: tooLong })).toMatchObject({
      ok: false,
      errors: { painDetail: "Usá hasta 500 caracteres." },
    });
    expect(validateCheckin({ ...complete, goals: "adjust", goalsDetail: tooLong })).toMatchObject({
      ok: false,
      errors: { goalsDetail: "Usá hasta 500 caracteres." },
    });
  });

  it("gives the answers of a complete form", () => {
    expect(validateCheckin(complete)).toEqual({
      ok: true,
      answers: { feeling: "good", pain: "none", goals: "same" },
    });
  });
});

describe("toCheckinAnswers", () => {
  it("sends the pain detail only with a mild pain", () => {
    expect(toCheckinAnswers({ ...complete, pain: "none", painDetail: "Rodilla" })).not.toHaveProperty("painDetail");
    expect(toCheckinAnswers({ ...complete, pain: "mild", painDetail: "  Rodilla  " })).toMatchObject({
      painDetail: "Rodilla",
    });
  });

  it("sends the goals text only when the goals change and it is not empty", () => {
    expect(toCheckinAnswers({ ...complete, goals: "same", goalsDetail: "Más fuerza" })).not.toHaveProperty("goalsDetail");
    expect(toCheckinAnswers({ ...complete, goals: "adjust", goalsDetail: "  " })).not.toHaveProperty("goalsDetail");
    expect(toCheckinAnswers({ ...complete, goals: "adjust", goalsDetail: "Más fuerza" })).toMatchObject({
      goalsDetail: "Más fuerza",
    });
  });
});
