import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardViewSwitch } from "./dashboard-view-switch";
import { parseDashboardParams } from "./dashboard-params";

describe("DashboardViewSwitch", () => {
  it("marks the current view with aria-current and shows the pending badge", () => {
    render(<DashboardViewSwitch params={parseDashboardParams({})} pendingCount={3} />);

    const nav = screen.getByRole("navigation", { name: "Vista del panel" });
    const hoy = screen.getByRole("link", { name: /^Hoy/ });
    const negocio = screen.getByRole("link", { name: /^Negocio/ });

    expect(nav).toBeDefined();
    expect(hoy.getAttribute("aria-current")).toBe("page");
    expect(negocio.getAttribute("aria-current")).toBeNull();
    expect(hoy.getAttribute("href")).toBe("/staff");
    expect(negocio.getAttribute("href")).toBe("/staff?vista=negocio");
    expect(screen.getByText("3").textContent).toBe("3 pendientes");
    // A screen reader hears what the number counts.
    expect(hoy.textContent).toContain("3 pendientes");
    expect(hoy.textContent).toContain("Lo que hay que hacer hoy");
    expect(negocio.textContent).toContain("Estadísticas para entender y decidir");
  });

  it("keeps the badge visible from Negocio and the filters when going there", () => {
    render(
      <DashboardViewSwitch
        params={parseDashboardParams({ vista: "negocio", tab: "clientes", servicio: "rehab" })}
        pendingCount={2}
      />,
    );

    expect(screen.getByRole("link", { name: /^Negocio/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /^Negocio/ }).getAttribute("href")).toBe(
      "/staff?vista=negocio&tab=clientes&servicio=rehab",
    );
    expect(screen.getByRole("link", { name: /^Hoy/ }).getAttribute("href")).toBe("/staff");
    expect(screen.getByText("2")).toBeDefined();
  });

  it("shows no badge when nothing is pending or the count is unknown", () => {
    const { rerender } = render(<DashboardViewSwitch params={parseDashboardParams({})} pendingCount={0} />);
    expect(screen.queryByText("0")).toBeNull();

    rerender(<DashboardViewSwitch params={parseDashboardParams({})} pendingCount={null} />);
    expect(screen.getByRole("link", { name: /^Hoy/ }).textContent).toBe("HoyLo que hay que hacer hoy");
  });
});
