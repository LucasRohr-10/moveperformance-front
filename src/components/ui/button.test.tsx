import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("defaults to the primary medium button", () => {
    render(<Button>Nuevo plan</Button>);

    const button = screen.getByRole("button", { name: "Nuevo plan" });

    expect(button.className).toContain("bg-white");
    expect(button.className).toContain("px-5");
  });

  it("tells a destructive action apart with the danger token", () => {
    render(
      <>
        <Button variant="ghost" size="sm">
          Editar
        </Button>
        <Button variant="destructive" size="sm">
          Eliminar
        </Button>
      </>,
    );

    const edit = screen.getByRole("button", { name: "Editar" });
    const remove = screen.getByRole("button", { name: "Eliminar" });

    expect(remove.className).toContain("text-danger");
    expect(remove.className).not.toBe(edit.className);
  });

  it("uses the semantic token, never a raw palette colour", () => {
    render(<Button variant="destructive">Eliminar</Button>);

    expect(screen.getByRole("button", { name: "Eliminar" }).className).not.toMatch(
      /red-\d{3}/,
    );
  });

  it("reaches the 44px touch minimum on mobile when asked", () => {
    render(
      <Button size="sm" touchTarget>
        Presente
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Presente" });

    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("sm:min-h-0");
  });

  it("leaves the height alone by default", () => {
    render(<Button size="sm">Presente</Button>);

    expect(screen.getByRole("button", { name: "Presente" }).className).not.toContain(
      "min-h-11",
    );
  });
});
