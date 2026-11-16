import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";
import { Select } from "./select";

function ServiceSelect({ error }: { error?: string }) {
  return (
    <Select label="Servicio" name="service" error={error}>
      <option value="performance">Performance</option>
      <option value="rehab">Rehab</option>
    </Select>
  );
}

describe("Select", () => {
  it("labels the control, which is the defect it exists to prevent", () => {
    render(<ServiceSelect />);

    const select = screen.getByRole("combobox", { name: "Servicio" });

    expect(select.tagName).toBe("SELECT");
    expect(screen.getByLabelText("Servicio")).toBe(select);
  });

  it("reports an error to assistive technology the way Field does", () => {
    render(<ServiceSelect error="Elegí un servicio." />);

    const select = screen.getByRole("combobox", { name: "Servicio" });
    const alert = screen.getByRole("alert");

    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(select.getAttribute("aria-describedby")).toBe(alert.id);
    expect(alert.textContent).toBe("Elegí un servicio.");
    expect(select.className).toContain("border-danger");
  });

  it("is valid and undescribed without an error", () => {
    render(<ServiceSelect />);

    const select = screen.getByRole("combobox", { name: "Servicio" });

    expect(select.getAttribute("aria-invalid")).toBe("false");
    expect(select.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shares the Input control style, plus its own chevron", () => {
    render(
      <>
        <ServiceSelect />
        <Input label="Cupo" />
      </>,
    );

    const select = screen.getByRole("combobox", { name: "Servicio" });
    const input = screen.getByLabelText("Cupo");

    // Same border/background/padding/focus treatment as any other control…
    for (const sharedClass of ["rounded", "border-line", "bg-soft", "px-3.5", "py-2.5", "text-sm"]) {
      expect(select.className).toContain(sharedClass);
      expect(input.className).toContain(sharedClass);
    }
    // …but the native arrow renders inconsistently across browsers, so the
    // select draws its own instead — an Input has no reason to.
    expect(select.className).toContain("appearance-none");
    expect(input.className).not.toContain("appearance-none");
    expect((select as HTMLSelectElement).style.backgroundImage).toContain("data:image/svg+xml");
  });

  it("reports the chosen option", async () => {
    const onChange = vi.fn();
    render(
      <Select label="Servicio" onChange={onChange}>
        <option value="performance">Performance</option>
        <option value="rehab">Rehab</option>
      </Select>,
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Servicio" }), "rehab");

    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Servicio" })).toHaveProperty("value", "rehab");
  });
});
