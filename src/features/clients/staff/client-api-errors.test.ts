import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { clientErrorCode, clientErrorMessage, clientFieldErrors } from "./client-api-errors";

const apiError = (code: string, message: string, details?: ApiError["body"]["details"]) =>
  new ApiError({ statusCode: 409, code, message, details });

describe("client API errors", () => {
  it("reads the code and the message of an ApiError", () => {
    const error = apiError("CLIENT_EMAIL_TAKEN", "Ya hay un cliente con ese email.");

    expect(clientErrorCode(error)).toBe("CLIENT_EMAIL_TAKEN");
    expect(clientErrorMessage(error, "Fallback")).toBe("Ya hay un cliente con ese email.");
  });

  it("falls back for a plain Error and for the UNKNOWN code", () => {
    expect(clientErrorCode(new Error("boom"))).toBeNull();
    expect(clientErrorMessage(new Error("boom"), "Fallback")).toBe("Fallback");
    expect(clientErrorMessage(apiError("UNKNOWN", "Bad Gateway"), "Fallback")).toBe("Fallback");
  });

  it("takes the first message of each field", () => {
    const error = apiError("VALIDATION_FAILED", "Datos inválidos.", [
      { field: "phone", messages: ["x", "y"] },
      { field: "name", messages: ["z"] },
    ]);

    expect(clientFieldErrors(error)).toEqual({ phone: "x", name: "z" });
    expect(clientFieldErrors(new Error("boom"))).toEqual({});
  });
});
