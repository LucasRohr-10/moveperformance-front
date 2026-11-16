import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InfoToggle } from "./info-toggle";

describe("InfoToggle", () => {
  it("the info button toggles the definition with aria-expanded", () => {
    render(<InfoToggle label="Vencen pronto" text="Clientes con un plan que vence en los próximos 10 días." />);

    const button = screen.getByRole("button", { name: "Qué significa Vencen pronto" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/próximos 10 días/)).toBeNull();

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    const definition = screen.getByText(/próximos 10 días/);
    expect(button.getAttribute("aria-controls")).toBe(definition.id);

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/próximos 10 días/)).toBeNull();
  });
});
