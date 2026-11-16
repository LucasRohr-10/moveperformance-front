import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { apiErrorMessage, apiFieldErrors } from "./api-error-message";

const FALLBACK = "No pudimos completar la acción.";

describe("apiErrorMessage", () => {
  it("shows the message of the API as it comes", () => {
    const error = new ApiError({ statusCode: 409, code: "ALERT_ALREADY_HANDLED", message: "Ya la gestionó otra persona." });

    expect(apiErrorMessage(error, FALLBACK)).toBe("Ya la gestionó otra persona.");
  });

  it("uses the fallback for a network failure", () => {
    expect(apiErrorMessage(new TypeError("Failed to fetch"), FALLBACK)).toBe(FALLBACK);
  });

  it("uses the fallback when the body of the error was not JSON", () => {
    const error = new ApiError({ statusCode: 502, code: "UNKNOWN", message: "Bad Gateway" });

    expect(apiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });
});

describe("apiFieldErrors", () => {
  it("gives the first message of each field the API named", () => {
    const error = new ApiError({
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: "Los datos enviados no son válidos.",
      details: [
        { field: "note", messages: ["La nota no es válida.", "Otra cosa."] },
        { field: "recontactOn", messages: ["La fecha no es válida."] },
      ],
    });

    expect(apiFieldErrors(error)).toEqual({ note: "La nota no es válida.", recontactOn: "La fecha no es válida." });
  });

  it("gives nothing for an error without details or for something that is not from the API", () => {
    expect(apiFieldErrors(new ApiError({ statusCode: 404, code: "X", message: "x" }))).toEqual({});
    expect(apiFieldErrors(new TypeError("Failed to fetch"))).toEqual({});
  });
});
