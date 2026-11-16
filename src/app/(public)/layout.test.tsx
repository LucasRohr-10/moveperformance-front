import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

import PublicLayout from "./layout";

describe("PublicLayout", () => {
  it("links Ingresar to the login page for a signed-out visitor", async () => {
    render(
      <PublicLayout>
        <p>content</p>
      </PublicLayout>,
    );

    expect(
      (await screen.findByRole("link", { name: "Ingresar" })).getAttribute("href"),
    ).toBe("/login");
  });

  it("links the header Reservar action to the public booking page", async () => {
    render(
      <PublicLayout>
        <p>content</p>
      </PublicLayout>,
    );

    const reservarLinks = (await screen.findAllByRole("link", { name: "Reservar" })).map(
      (link) => link.getAttribute("href"),
    );
    expect(reservarLinks).toContain("/reservar");
  });

  it("wires every nav link to a real page, including the Planes anchor", () => {
    render(
      <PublicLayout>
        <p>content</p>
      </PublicLayout>,
    );

    const expected: Record<string, string> = {
      Inicio: "/",
      Performance: "/performance",
      Rehab: "/rehab",
      Recovery: "/recovery",
      Planes: "/planes",
    };

    Object.entries(expected).forEach(([label, href]) => {
      const links = screen
        .getAllByRole("link", { name: label })
        .map((link) => link.getAttribute("href"));
      expect(links).toContain(href);
    });
  });
});
