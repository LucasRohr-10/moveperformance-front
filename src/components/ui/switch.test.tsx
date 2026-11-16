import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("is a switch named by its label, with its state", () => {
    render(<Switch id="s" checked label="Aceptar transferencias" onChange={() => {}} />);

    const control = screen.getByRole("switch", { name: "Aceptar transferencias" });
    expect(control.getAttribute("aria-checked")).toBe("true");
  });

  it("reports the new state when it is clicked", async () => {
    const onChange = vi.fn();
    render(<Switch id="s" checked={false} label="Aceptar transferencias" onChange={onChange} />);

    const control = screen.getByRole("switch", { name: "Aceptar transferencias" });
    expect(control.getAttribute("aria-checked")).toBe("false");
    await userEvent.setup().click(control);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("also toggles when the visible track is clicked, not only the hidden input", async () => {
    const onChange = vi.fn();
    render(<Switch id="s" checked={false} label="Aceptar transferencias" onChange={onChange} />);

    const track = screen.getByRole("switch").closest("label");
    expect(track).not.toBeNull();
    await userEvent.setup().click(track as HTMLElement);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("points to its help and marks an error", () => {
    render(<Switch id="s" checked={false} label="X" onChange={() => {}} describedBy="s-help" hasError />);

    const control = screen.getByRole("switch", { name: "X" });
    expect(control.getAttribute("aria-describedby")).toBe("s-help");
    expect(control.getAttribute("aria-invalid")).toBe("true");
  });
});
