import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseDashboardParams } from "../dashboard-params";
import { ServiceFilter } from "./service-filter";

describe("ServiceFilter", () => {
  it("marks the current service with aria-current and keeps the rest of the URL", () => {
    render(<ServiceFilter params={parseDashboardParams({ vista: "negocio", periodo: "este-mes", servicio: "rehab" })} />);

    expect(screen.getByRole("group", { name: "Servicio" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Rehab" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Todos" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Todos" }).getAttribute("href")).toBe("/staff?vista=negocio&periodo=este-mes");
    expect(screen.getByRole("link", { name: "Recovery" }).getAttribute("href")).toBe(
      "/staff?vista=negocio&periodo=este-mes&servicio=recovery",
    );
  });

  it("lists Todos, Performance, Rehab and Recovery in that order", () => {
    render(<ServiceFilter params={parseDashboardParams({ vista: "negocio" })} />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Todos", "Performance", "Rehab", "Recovery"]);
    expect(screen.getByRole("link", { name: "Todos" }).getAttribute("aria-current")).toBe("page");
  });
});
