import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CONTROL_CLASS, Field, FieldError, controlClass, fieldErrorId } from "./field";

describe("Field", () => {
  it("labels the control it wraps and announces its error", () => {
    render(
      <Field id="note" label="Nota" error="Muy larga.">
        <textarea id="note" aria-describedby={fieldErrorId("note")} />
      </Field>,
    );

    const control = screen.getByLabelText("Nota");
    const alert = screen.getByRole("alert");

    expect(control.tagName).toBe("TEXTAREA");
    expect(alert.id).toBe("note-error");
    expect(control.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("renders no error paragraph when the field is valid", () => {
    render(
      <Field id="note" label="Nota">
        <textarea id="note" />
      </Field>,
    );

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("FieldError", () => {
  it("announces itself with the danger token", () => {
    render(<FieldError id="note-error">No pudimos guardar.</FieldError>);

    const alert = screen.getByRole("alert");

    expect(alert.textContent).toBe("No pudimos guardar.");
    expect(alert.className).toContain("text-danger");
  });
});

describe("controlClass", () => {
  it("reddens the border only when the field is in error", () => {
    expect(controlClass("Requerido.")).toContain("border-danger");
    expect(controlClass()).not.toContain("border-danger");
  });

  it("rings and shakes a field in error, once", () => {
    for (const token of ["ring-3", "ring-danger/20", "motion-safe:animate-field-shake"]) {
      expect(controlClass("Requerido.")).toContain(token);
      expect(controlClass()).not.toContain(token);
    }
  });

  it("lets the caller override the class", () => {
    expect(controlClass(undefined, "mt-0")).toContain("mt-0");
    expect(controlClass(undefined, "mt-0")).not.toContain("mt-2");
  });

  it("styles the disabled state, so a disabled control needs no extra string", () => {
    expect(CONTROL_CLASS).toContain("disabled:cursor-not-allowed");
    expect(CONTROL_CLASS).toContain("disabled:opacity-50");
  });

  it("keeps the placeholder above the WCAG AA contrast minimum", () => {
    // text-muted at 60% over bg-soft is ~3.2:1; at 80% it is ~4.8:1.
    expect(CONTROL_CLASS).toContain("placeholder:text-muted/80");
    expect(CONTROL_CLASS).not.toContain("placeholder:text-muted/60");
  });
});
