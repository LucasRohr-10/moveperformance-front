import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders its label", () => {
    render(<StatusBadge label="Activo" tone="success" />);

    expect(screen.getByText("Activo")).toBeDefined();
  });

  it("colors the danger tone with the danger token", () => {
    render(<StatusBadge label="Vencido" tone="danger" />);

    expect(screen.getByText("Vencido").className).toContain("text-danger");
  });

  it("colors the neutral tone with the muted token", () => {
    render(<StatusBadge label="1 semana sin asistir" tone="neutral" />);

    expect(screen.getByText("1 semana sin asistir").className).toContain("text-muted");
  });
});
