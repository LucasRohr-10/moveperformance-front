import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectedClientBar } from "./selected-client-bar";

describe("SelectedClientBar", () => {
  it("shows only the client's name and Cambiar cliente", () => {
    render(<SelectedClientBar name="Sofía Pérez" onChange={vi.fn()} />);

    const bar = screen.getByLabelText("Cliente elegido");
    expect(bar.textContent).toBe("Sofía PérezCambiar cliente");
    expect(screen.queryByText(/sesiones/)).toBeNull();
    expect(screen.queryByText(/reservas por fuera en uso/)).toBeNull();
  });

  it("is a region, so its label is announced", () => {
    render(<SelectedClientBar name="Sofía Pérez" onChange={vi.fn()} />);

    expect(screen.getByRole("region", { name: "Cliente elegido" })).toBeDefined();
  });

  it("calls onChange from Cambiar cliente", async () => {
    const onChange = vi.fn();
    render(<SelectedClientBar name="Sofía Pérez" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Cambiar cliente" }));

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
