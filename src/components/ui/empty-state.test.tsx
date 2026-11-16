import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the title and the description", () => {
    render(
      <EmptyState
        title="No hay resultados"
        description="Probá con otro nombre o limpiá el filtro."
      />,
    );

    expect(screen.getByText("No hay resultados")).toBeDefined();
    expect(screen.getByText("Probá con otro nombre o limpiá el filtro.")).toBeDefined();
  });

  it("works with only a title", () => {
    const { container } = render(<EmptyState title="Todavía no hay planes." />);

    expect(screen.getByText("Todavía no hay planes.")).toBeDefined();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("renders the action when one is given", () => {
    render(
      <EmptyState
        title="No hay resultados"
        action={<Button size="sm">Limpiar filtro</Button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Limpiar filtro" })).toBeDefined();
  });

  it("renders no action slot without an action", () => {
    render(<EmptyState title="No hay resultados" />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
