import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RehabPage from "./page";

describe("RehabPage", () => {
  it("links Agendar evaluación to the public booking page for rehab", () => {
    render(<RehabPage />);

    expect(screen.getByRole("link", { name: "Agendar evaluación" }).getAttribute("href")).toBe(
      "/reservar?service=rehab",
    );
  });

  it("renders the hero heading", () => {
    render(<RehabPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Evaluación ydiagnóstico.",
    );
  });

  it("describes what happens after the evaluation", () => {
    render(<RehabPage />);

    expect(screen.getByText("Entrenamiento terapéutico")).toBeDefined();
    expect(screen.getByText("Tratamiento en consultorio")).toBeDefined();
    expect(screen.getByText("Seguimiento fisioterapéutico")).toBeDefined();
  });
});
