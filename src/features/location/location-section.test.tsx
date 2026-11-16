import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// jsdom has no WebGL2 context, which maplibre-gl requires to mount; these tests cover the
// surrounding section content, not the map itself.
vi.mock("./location-map", () => ({
  LocationMap: () => <div data-testid="location-map" />,
}));

import { CONTACT, LOCATION_SECTION_ID } from "./constants";
import { LocationSection } from "./location-section";

describe("LocationSection", () => {
  it("shows the address and the opening hours", () => {
    render(<LocationSection label="04 — Contacto" />);

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Dónde estamos.");
    expect(screen.getByText(CONTACT.address)).toBeTruthy();
    expect(screen.getByText(CONTACT.hours.days)).toBeTruthy();
    expect(screen.getByText(CONTACT.hours.morning)).toBeTruthy();
    expect(screen.getByText(CONTACT.hours.afternoon)).toBeTruthy();
  });

  it("opens Google Maps in a new tab", () => {
    render(<LocationSection label="04 — Contacto" />);

    const link = screen.getByText(CONTACT.address).closest("a");
    expect(link?.getAttribute("href")).toBe(CONTACT.mapsUrl);
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("links WhatsApp and Instagram", () => {
    render(<LocationSection label="04 — Contacto" />);

    expect(
      screen.getByText(CONTACT.whatsapp.label).closest("a")?.getAttribute("href"),
    ).toBe(CONTACT.whatsapp.href);
    expect(
      screen.getByText(CONTACT.instagram.label).closest("a")?.getAttribute("href"),
    ).toBe(CONTACT.instagram.href);
  });

  it("can be reached from the footer through its anchor", () => {
    const { container } = render(<LocationSection label="04 — Contacto" />);

    expect(container.querySelector(`section#${LOCATION_SECTION_ID}`)).toBeTruthy();
  });
});
