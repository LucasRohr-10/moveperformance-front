import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/staff/clients",
}));

import { STAFF_LINKS, StaffSidebar } from "./staff-sidebar";

const EXPECTED_LABELS = [
  "Dashboard",
  "Clientes",
  "Reservar",
  "Asistencias",
  "Plantillas de turnos",
  "Profesionales",
  "Pagos",
  "Planes",
  "Seguimiento",
  "Comunicados",
  "Configuración",
];

describe("StaffSidebar", () => {
  it("renders every staff section and highlights the current one", () => {
    render(
      <StaffSidebar actions={null} mobileHeader={null}>
        <p>content</p>
      </StaffSidebar>,
    );

    EXPECTED_LABELS.forEach((label) => {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    });

    const activeClientesLinks = screen
      .getAllByRole("link", { name: "Clientes" })
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(activeClientesLinks.length).toBeGreaterThan(0);

    const activeDashboardLinks = screen
      .getAllByRole("link", { name: "Dashboard" })
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(activeDashboardLinks).toHaveLength(0);
  });

  it("lists Reservar after Clientes", () => {
    render(
      <StaffSidebar actions={null} mobileHeader={null}>
        <p>content</p>
      </StaffSidebar>,
    );

    const reservar = screen.getAllByRole("link", { name: "Reservar" })[0];
    expect(reservar.getAttribute("href")).toBe("/staff/book");
    const labels = STAFF_LINKS.map((link) => link.label);
    expect(labels.indexOf("Reservar")).toBe(labels.indexOf("Clientes") + 1);
  });

  it("renders the given mobileHeader next to the logo in the mobile header", () => {
    render(
      <StaffSidebar actions={null} mobileHeader={<button type="button">mobile header content</button>}>
        <p>content</p>
      </StaffSidebar>,
    );

    expect(screen.getByRole("button", { name: "mobile header content" })).toBeDefined();
  });
});
