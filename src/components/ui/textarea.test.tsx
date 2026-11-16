import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("is labelled and reports an error the way Input does", () => {
    render(<Textarea label="Motivo *" error="Escribí el motivo." />);

    const field = screen.getByLabelText("Motivo *");
    const alert = screen.getByRole("alert");

    expect(field.tagName).toBe("TEXTAREA");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")).toBe(alert.id);
    expect(alert.textContent).toBe("Escribí el motivo.");
  });

  it("is valid and undescribed without an error", () => {
    render(<Textarea label="Motivo *" />);

    const field = screen.getByLabelText("Motivo *");

    expect(field.getAttribute("aria-invalid")).toBe("false");
    expect(field.getAttribute("aria-describedby")).toBeNull();
  });
});
