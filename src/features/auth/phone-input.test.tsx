import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { PhoneInput } from "./phone-input";

function UncontrolledForm({ onSubmit }: { onSubmit: (formData: FormData) => void }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      <PhoneInput />
      <button type="submit">Enviar</button>
    </form>
  );
}

function ControlledField({ initialValue = "" }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return <PhoneInput value={value} onChange={setValue} />;
}

describe("PhoneInput", () => {
  it("defaults to Uruguay (+598) with an empty national number", () => {
    render(<ControlledField />);

    expect(screen.getByRole("button", { name: "Elegir país" }).textContent).toContain("+598");
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("");
  });

  it("detects the country from an already-saved E.164 phone", () => {
    render(<ControlledField initialValue="+34612345678" />);

    expect(screen.getByRole("button", { name: "Elegir país" }).textContent).toContain("+34");
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value.replace(/\D/g, "")).toBe("612345678");
  });

  it("switches the dial code when another country is picked from the dropdown", async () => {
    const user = userEvent.setup();
    render(<ControlledField />);

    await user.click(screen.getByRole("button", { name: "Elegir país" }));
    await user.type(screen.getByPlaceholderText("Buscar país o prefijo"), "argentina");
    await user.click(screen.getByRole("option", { name: /Argentina/ }));

    expect(screen.getByRole("button", { name: "Elegir país" }).textContent).toContain("+54");
  });

  it("filters the country list by dial code", async () => {
    const user = userEvent.setup();
    render(<ControlledField />);

    await user.click(screen.getByRole("button", { name: "Elegir país" }));
    await user.type(screen.getByPlaceholderText("Buscar país o prefijo"), "+54");

    expect(screen.getByRole("option", { name: /Argentina/ })).toBeDefined();
    expect(screen.queryByRole("option", { name: /Uruguay/ })).toBeNull();
  });

  it("does not duplicate the dial code when the national number is edited", async () => {
    const user = userEvent.setup();
    render(<ControlledField />);

    await user.type(screen.getByLabelText("Teléfono"), "099123456");
    await user.type(screen.getByLabelText("Teléfono"), "{backspace}7");

    expect(screen.getByRole("button", { name: "Elegir país" }).textContent).toContain("+598");
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value.replace(/\D/g, "")).toBe("099123457");
  });

  it("submits the combined E.164 value under a hidden 'phone' field when uncontrolled", async () => {
    const user = userEvent.setup();
    const submitted: { value: FormData | null } = { value: null };
    render(<UncontrolledForm onSubmit={(formData) => (submitted.value = formData)} />);

    await user.type(screen.getByLabelText("Teléfono"), "099 123 456");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(submitted.value?.get("phone")).toBe("+59899123456");
  });

  it("shows the error message under the field", () => {
    render(<PhoneInput error="Ingresá un teléfono válido." />);

    expect(screen.getByRole("alert").textContent).toBe("Ingresá un teléfono válido.");
  });
});
