import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./footer";

describe("Footer", () => {
  it("links Ubicación to the contact section of the home page", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "Ubicación" }).getAttribute("href")).toBe("/#contacto");
  });

  it("links Privacidad to the privacy policy, as Google requires from the home page", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "Privacidad" }).getAttribute("href")).toBe("/privacidad");
  });
});
