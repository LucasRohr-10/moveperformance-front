import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { parseDashboardParams } from "../dashboard-params";
import { isUnsupportedCurrencyError, NegocioSectionError, NegocioUnsupportedCurrency } from "./negocio-section-error";

const PARAMS = parseDashboardParams({ vista: "negocio" });

describe("isUnsupportedCurrencyError", () => {
  it("is true only for the DASHBOARD_UNSUPPORTED_CURRENCY code of the API", () => {
    expect(isUnsupportedCurrencyError(new ApiError({ statusCode: 409, code: "DASHBOARD_UNSUPPORTED_CURRENCY", message: "x" }))).toBe(true);
    expect(isUnsupportedCurrencyError(new ApiError({ statusCode: 409, code: "CONFLICT", message: "x" }))).toBe(false);
    expect(isUnsupportedCurrencyError(new Error("DASHBOARD_UNSUPPORTED_CURRENCY"))).toBe(false);
  });
});

describe("NegocioUnsupportedCurrency", () => {
  it("shows Hay montos en otra moneda; avisale al equipo técnico, with no Reintentar", () => {
    render(<NegocioUnsupportedCurrency />);

    expect(screen.getByRole("alert").textContent).toContain("Hay montos en otra moneda; avisale al equipo técnico");
    expect(screen.queryByRole("link", { name: "Reintentar" })).toBeNull();
  });
});

describe("NegocioSectionError", () => {
  it("keeps the temporary-problem message with Reintentar", () => {
    render(<NegocioSectionError title="No pudimos cargar la plata" params={PARAMS} />);

    expect(screen.getByText("Puede ser un problema temporario del servidor.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reintentar" })).toBeDefined();
  });
});
