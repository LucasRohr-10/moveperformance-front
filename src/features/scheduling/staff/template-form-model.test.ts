import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";

import {
  bookingsCountText,
  commonSuggestions,
  daySuggestionsFrom,
  formatTemplateDays,
  saveErrorSnackbar,
  templateDayRows,
  validationMessagesFrom,
  withoutDay,
} from "./template-form-model";

describe("formatTemplateDays", () => {
  it("lists the days in weekday order", () => {
    expect(
      formatTemplateDays([
        { weekday: 6, startTime: "09:00", endTime: "13:00" },
        { weekday: 1, startTime: "08:00", endTime: "20:00" },
      ]),
    ).toBe("Lun 08:00–20:00 · Sáb 09:00–13:00");
  });
});

describe("templateDayRows", () => {
  it("returns one row per day in weekday order, with the full day name", () => {
    expect(
      templateDayRows([
        { weekday: 3, startTime: "09:00", endTime: "13:00" },
        { weekday: 1, startTime: "08:00", endTime: "19:50" },
      ]),
    ).toEqual([
      { day: "Lunes", hours: "08:00 – 19:50" },
      { day: "Miércoles", hours: "09:00 – 13:00" },
    ]);
  });
});

describe("validationMessagesFrom", () => {
  it("returns every message of every detail, in order", () => {
    const error = new ApiError({
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: "Los datos enviados no son válidos.",
      details: [{ field: "days", messages: ["Primer mensaje", "Segundo mensaje"] }],
    });
    expect(validationMessagesFrom(error)).toEqual(["Primer mensaje", "Segundo mensaje"]);
  });

  it("falls back to the error message when there are no details", () => {
    const error = new ApiError({ statusCode: 400, code: "X", message: "Algo falló" });
    expect(validationMessagesFrom(error)).toEqual(["Algo falló"]);
  });

  it("returns nothing for errors that are not ApiError", () => {
    expect(validationMessagesFrom(new Error("red"))).toEqual([]);
  });
});

describe("bookingsCountText", () => {
  it("uses the singular for one booking", () => {
    expect(bookingsCountText(1)).toBe("1 reserva");
    expect(bookingsCountText(3)).toBe("3 reservas");
  });
});

const DAYS_RULE =
  "El último turno de cada día tiene que terminar justo a la hora de fin: no puede sobrar tiempo libre ni pasarse. Cambiá la hora de fin a una de las que te marcamos.";

function dayFitError(weekdays: number[]): ApiError {
  return new ApiError({
    statusCode: 400,
    code: "VALIDATION_FAILED",
    message: "Los datos enviados no son válidos.",
    details: weekdays.map((weekday) => ({
      field: `days.${weekday}`,
      messages: ["El último turno del día termina a las 19:35 y deja 25 min libres."],
      suggestions: ["19:35", "20:10"],
    })),
  });
}

describe("daySuggestionsFrom", () => {
  it("maps each failing weekday to its suggested end times", () => {
    expect(daySuggestionsFrom(dayFitError([1, 2]))).toEqual({ 1: ["19:35", "20:10"], 2: ["19:35", "20:10"] });
  });

  it("ignores details without suggestions and errors that are not API errors", () => {
    const plain = new ApiError({
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: "x",
      details: [
        { field: "days", messages: ["Lunes: 21:00"] },
        { field: "capacity", messages: ["El cupo tiene que ser al menos 1."] },
      ],
    });

    expect(daySuggestionsFrom(plain)).toEqual({});
    expect(daySuggestionsFrom(new Error("network"))).toEqual({});
  });
});

describe("saveErrorSnackbar", () => {
  it("turns day-fit errors into a short warning that says the rule once", () => {
    expect(saveErrorSnackbar(dayFitError([1, 2]), "Falló")).toEqual({
      tone: "warning",
      title: "Revisá 2 días",
      message: DAYS_RULE,
      persistent: true,
    });
  });

  it("counts a single day in the singular", () => {
    expect(saveErrorSnackbar(dayFitError([3]), "Falló")).toMatchObject({ title: "Revisá 1 día" });
  });

  it("titles a single validation message as the error itself", () => {
    const error = new ApiError({
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: "x",
      details: [{ field: "professionalId", messages: ["Rehab requiere un profesional."] }],
    });
    expect(saveErrorSnackbar(error, "Falló")).toEqual({ tone: "danger", title: "Rehab requiere un profesional." });
  });

  it("lists several validation messages under the fallback", () => {
    const error = new ApiError({
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: "x",
      details: [
        { field: "professionalId", messages: ["Rehab requiere un profesional."] },
        { field: "capacity", messages: ["El cupo tiene que ser al menos 1."] },
      ],
    });
    expect(saveErrorSnackbar(error, "Falló")).toEqual({
      tone: "danger",
      title: "Falló",
      items: ["Rehab requiere un profesional.", "El cupo tiene que ser al menos 1."],
    });
  });

  it("uses the fallback for errors that are not ApiError", () => {
    expect(saveErrorSnackbar(new Error("red"), "Falló")).toEqual({ tone: "danger", title: "Falló" });
  });
});

describe("commonSuggestions", () => {
  it("keeps the times every flagged day agrees on", () => {
    expect(commonSuggestions({ 1: ["19:35", "20:10"], 2: ["19:35", "20:10"] })).toEqual(["19:35", "20:10"]);
    expect(commonSuggestions({ 1: ["19:35", "20:10"], 2: ["19:35"] })).toEqual(["19:35"]);
  });

  it("has nothing in common when the days suggest different times", () => {
    expect(commonSuggestions({ 1: ["19:35", "20:10"], 2: ["19:40", "20:15"] })).toEqual([]);
  });

  it("needs at least two days to offer a shared time", () => {
    expect(commonSuggestions({ 1: ["19:35", "20:10"] })).toEqual([]);
    expect(commonSuggestions({})).toEqual([]);
  });
});

describe("withoutDay", () => {
  it("drops only that weekday", () => {
    expect(withoutDay({ 1: ["19:35"], 2: ["19:35"] }, 1)).toEqual({ 2: ["19:35"] });
  });
});
