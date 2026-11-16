import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("labels the control through its own label row", () => {
    render(<Input label="Nombre" />);

    const input = screen.getByRole("textbox", { name: "Nombre" });

    expect(screen.getByLabelText("Nombre")).toBe(input);
  });

  it("reports an error to assistive technology the way Field/Select do", () => {
    render(<Input label="Nombre" error="Es obligatorio." />);

    const input = screen.getByRole("textbox", { name: "Nombre" });
    const alert = screen.getByRole("alert");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
    expect(alert.textContent).toBe("Es obligatorio.");
    expect(input.className).toContain("border-danger");
  });

  it("is valid and undescribed without an error", () => {
    render(<Input label="Nombre" />);

    const input = screen.getByRole("textbox", { name: "Nombre" });

    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("composes the caller's own aria-describedby instead of silencing it", () => {
    render(
      <>
        <Input label="Nombre" aria-describedby="hint" />
        <p id="hint">Como figura en el DNI.</p>
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Nombre" }).getAttribute("aria-describedby")).toBe(
      "hint",
    );
  });

  it("keeps the caller's hint announced alongside the error", () => {
    render(
      <>
        <Input label="Nombre" error="Es obligatorio." aria-describedby="hint" />
        <p id="hint">Como figura en el DNI.</p>
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Nombre" });
    const alert = screen.getByRole("alert");

    expect(input.getAttribute("aria-describedby")).toBe(`hint ${alert.id}`);
  });
});
