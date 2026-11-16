import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { z } from "zod";

import { fieldErrorFor, INVALID_FIELDS_MESSAGE, invalidFieldsTitle, useInvalidFieldsFeedback } from "./form-feedback";
import { SnackbarProvider } from "./snackbar";

function Form({ errors }: { errors: Record<string, string | undefined> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const reportInvalid = useInvalidFieldsFeedback();
  return (
    <form ref={formRef}>
      <input aria-label="Nombre" />
      <input aria-label="Teléfono" aria-invalid={Boolean(errors.phone)} />
      <input aria-label="Contraseña" aria-invalid={Boolean(errors.password)} />
      <button type="button" onClick={() => reportInvalid(formRef.current, errors)}>
        Crear cuenta
      </button>
    </form>
  );
}

function renderForm(errors: Record<string, string | undefined>) {
  render(
    <SnackbarProvider>
      <Form errors={errors} />
    </SnackbarProvider>,
  );
}

describe("invalidFieldsTitle", () => {
  it("counts the fields to fix", () => {
    expect(invalidFieldsTitle(1)).toBe("Revisá 1 campo");
    expect(invalidFieldsTitle(2)).toBe("Revisá 2 campos");
  });
});

describe("useInvalidFieldsFeedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const ERRORS = { name: undefined, phone: "Ingresá un teléfono válido.", password: "Mínimo 8 caracteres." };

  it("says how many fields to fix and moves the focus to the first one", () => {
    renderForm(ERRORS);

    act(() => screen.getByRole("button", { name: "Crear cuenta" }).click());
    act(() => vi.advanceTimersToNextFrame());

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Revisá 2 campos");
    expect(alert.textContent).toContain(INVALID_FIELDS_MESSAGE);
    expect(document.activeElement).toBe(screen.getByLabelText("Teléfono"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  });

  it("does nothing without errors", () => {
    renderForm({ name: undefined });

    act(() => screen.getByRole("button", { name: "Crear cuenta" }).click());

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps a single snackbar when submitted twice", () => {
    renderForm(ERRORS);

    act(() => screen.getByRole("button", { name: "Crear cuenta" }).click());
    act(() => screen.getByRole("button", { name: "Crear cuenta" }).click());

    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});

describe("fieldErrorFor", () => {
  const schema = z
    .object({ phone: z.string().min(8, { error: "Teléfono corto." }), password: z.string().min(8, { error: "Contraseña corta." }) });

  it("returns the field's current error", () => {
    expect(fieldErrorFor(schema, { phone: "12", password: "1234" }, "phone")).toBe("Teléfono corto.");
  });

  it("returns undefined once the field is valid, whatever the others say", () => {
    expect(fieldErrorFor(schema, { phone: "099123456", password: "1234" }, "phone")).toBeUndefined();
  });
});
