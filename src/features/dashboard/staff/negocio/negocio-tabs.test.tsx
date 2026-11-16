import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseDashboardParams } from "../dashboard-params";
import { NegocioTabs } from "./negocio-tabs";

describe("NegocioTabs", () => {
  it("the active tab has aria-current and each tab keeps the filters", () => {
    render(<NegocioTabs params={parseDashboardParams({ vista: "negocio", tab: "turnos", servicio: "rehab", comparar: "no" })} />);

    expect(screen.getByRole("navigation", { name: "Secciones de Negocio" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Turnos" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Plata" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Plata" }).getAttribute("href")).toBe(
      "/staff?vista=negocio&comparar=no&servicio=rehab",
    );
    expect(screen.getByRole("link", { name: "Clientes" }).getAttribute("href")).toBe(
      "/staff?vista=negocio&tab=clientes&comparar=no&servicio=rehab",
    );
  });
});
