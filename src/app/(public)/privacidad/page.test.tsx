import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CONTACT } from "@/features/location";

import PrivacyPage, { metadata } from "./page";

const SECTION_HEADINGS = [
  "Quiénes somos y cómo contactarnos",
  "Qué datos recolectamos",
  "Para qué usamos tus datos",
  "Datos de Google",
  "Datos de seguimiento y salud",
  "Con quién compartimos tus datos",
  "Transferencia internacional de datos",
  "Cuánto tiempo guardamos tus datos",
  "Seguridad",
  "Tus derechos",
  "Cómo hacer un reclamo",
  "Cookies y sesión",
  "Cambios a esta política",
];

describe("PrivacyPage", () => {
  it("sets the page title", () => {
    expect(metadata.title).toBe("Política de privacidad · MOVE");
  });

  it("renders the page heading", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Política de privacidad");
  });

  it("renders every section of the policy, in order", () => {
    render(<PrivacyPage />);

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

    expect(headings).toEqual(SECTION_HEADINGS);
  });

  it("gives the address and WhatsApp published on the site as the way to reach the controller", () => {
    render(<PrivacyPage />);

    expect(screen.getAllByText(new RegExp(CONTACT.address)).length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: CONTACT.whatsapp.label })
        .every((link) => link.getAttribute("href") === CONTACT.whatsapp.href),
    ).toBe(true);
  });

  it("states that Google Calendar is used only by Staff and that the client name reaches it", () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/solo la persona de Staff que conecta su calendario/i)).toBeDefined();
    expect(screen.getByText(/el nombre del cliente/i)).toBeDefined();
  });

  it("states compliance with the Google API Services User Data Policy, including Limited Use", () => {
    render(<PrivacyPage />);

    const link = screen.getByRole("link", {
      name: "Política de datos de usuario de los servicios de las APIs de Google",
    });

    expect(link.getAttribute("href")).toBe("https://developers.google.com/terms/api-services-user-data-policy");
    expect(screen.getByText(/requisitos de uso limitado/i)).toBeDefined();
  });

  it("says that data is not sold or used for advertising", () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/no vendemos tus datos ni los usamos para publicidad/i)).toBeDefined();
  });

  it("points to the URCDP complaint form", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("link", { name: "formulario de denuncias de la URCDP" }).getAttribute("href"),
    ).toBe("https://www.gub.uy/tramites/denuncias-unidad-reguladora-control-datos-personales-urcdp");
  });
});
