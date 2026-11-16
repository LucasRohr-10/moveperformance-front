import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/plans", () => ({
  PlansTeaserSection: () => (
    <div data-testid="plans-teaser-section">
      <h2>Elegí tu plan.</h2>
      <a href="/planes">Ver todos los planes</a>
    </div>
  ),
}));

// jsdom has no WebGL2 context, which maplibre-gl requires to mount.
vi.mock("@/features/location/location-map", () => ({
  LocationMap: () => <div data-testid="location-map" />,
}));

import { CONTACT } from "@/features/location/constants";

import HomePage from "./page";

describe("HomePage", () => {
  it("renders the hero heading", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Movete mejor.Recuperámás rápido.",
    );
  });

  it("links each service card to its own page", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Ver planes" }).getAttribute("href")).toBe("/planes");

    const moreInfoLinks = screen
      .getAllByRole("link", { name: /Más información/ })
      .map((link) => link.getAttribute("href"));
    expect(moreInfoLinks).toEqual(expect.arrayContaining(["/performance", "/rehab", "/recovery"]));
  });

  it("introduces the team between the services and the plans", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 2, name: "El equipo detrás de MOVE." })).toBeTruthy();
    // Rendered once for the desktop grid and once for the mobile accordion.
    expect(screen.getAllByRole("heading", { level: 3, name: "Pierina Paladini" }).length).toBeGreaterThan(0);
  });

  it("closes with where the gym is and a Google Maps link", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 2, name: "Dónde estamos." })).toBeTruthy();
    expect(screen.getByText(CONTACT.address).closest("a")?.getAttribute("href")).toBe(CONTACT.mapsUrl);
  });

  it("shows the Performance and Recovery plans from the catalog", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 2, name: "Elegí tu plan." })).toBeTruthy();
    expect(screen.getByTestId("plans-teaser-section")).toBeTruthy();
  });

  it("links to the full plans catalog", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("link", { name: "Ver todos los planes" }).getAttribute("href"),
    ).toBe("/planes");
  });
});
