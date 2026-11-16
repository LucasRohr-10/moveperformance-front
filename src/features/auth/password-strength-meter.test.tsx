import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordStrengthMeter } from "./password-strength-meter";

const bars = (container: HTMLElement) => Array.from(container.querySelectorAll("[aria-hidden='true'] > div"));

describe("PasswordStrengthMeter", () => {
  it("is white by default, as in the public forms", () => {
    const { container } = render(<PasswordStrengthMeter password="Abc12345" />);

    expect(bars(container).filter((bar) => bar.className.includes("bg-white"))).toHaveLength(3);
    expect(container.querySelector(".bg-success")).toBeNull();
    expect(container.querySelector(".text-success")).toBeNull();
  });

  it("is green with tone success, as in the staff screens", () => {
    const { container } = render(<PasswordStrengthMeter password="Abc12345" tone="success" />);

    expect(bars(container).filter((bar) => bar.className.includes("bg-success"))).toHaveLength(3);
    expect(screen.getByText("Un número").closest("li")?.className).toContain("text-success");
    expect(screen.getByText("Un símbolo").closest("li")?.className).toContain("text-muted");
    expect(container.querySelector(".bg-white")).toBeNull();
  });

  it("marks the hints the password meets", () => {
    render(<PasswordStrengthMeter password="Abc12345" />);

    const hint = (label: string) => screen.getByText(label).closest("li");

    expect(hint("8+ caracteres")?.textContent).toContain("✓");
    expect(hint("Una mayúscula")?.textContent).toContain("✓");
    expect(hint("Un número")?.textContent).toContain("✓");
    expect(hint("Un símbolo")?.textContent).not.toContain("✓");
  });
});
