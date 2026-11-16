import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { ClientPasswordField } from "./client-password-field";

function Harness({ initial = "", onChange }: { initial?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <ClientPasswordField
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
});

describe("ClientPasswordField", () => {
  it("fills a generated password in clear text", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithSnackbar(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Generar" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(12);
    const input = screen.getByLabelText<HTMLInputElement>("Clave");
    expect(input.type).toBe("text");
    expect(input.value).toBe(onChange.mock.calls[0][0]);
  });

  it("copies the password and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    stubClipboard(writeText);
    renderWithSnackbar(<Harness initial="Rk7#mPq2xW9a" />);

    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(writeText).toHaveBeenCalledWith("Rk7#mPq2xW9a");
    expect(await screen.findByText("Clave copiada.")).toBeDefined();
  });

  it("tells staff to copy by hand when the clipboard fails", async () => {
    const user = userEvent.setup();
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    renderWithSnackbar(<Harness initial="Rk7#mPq2xW9a" />);

    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(await screen.findByText("No pudimos copiar la clave. Copiala a mano.")).toBeDefined();
  });

  it("tells staff to copy by hand when there is no clipboard", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<Harness initial="Rk7#mPq2xW9a" />);
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });

    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(await screen.findByText("No pudimos copiar la clave. Copiala a mano.")).toBeDefined();
  });

  it("disables Copiar while the field is empty", () => {
    renderWithSnackbar(<Harness />);

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Copiar" }).disabled).toBe(true);
  });

  it("shows the strength meter for the typed password", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<Harness />);

    await user.type(screen.getByLabelText("Clave"), "Abc12345");

    expect(screen.getByText("Un número").closest("li")?.textContent).toContain("✓");
    expect(screen.getByText("Un símbolo").closest("li")?.textContent).not.toContain("✓");
  });

  it("shows the strength meter in green", () => {
    const { container } = renderWithSnackbar(<Harness initial="Abc12345" />);

    expect(container.querySelector(".bg-success")).not.toBeNull();
    expect(container.querySelector(".bg-white")).toBeNull();
  });

  it("shows the error under the field", () => {
    renderWithSnackbar(<ClientPasswordField value="" onChange={vi.fn()} error="La clave necesita al menos 8 caracteres." />);

    expect(screen.getByRole("alert").textContent).toBe("La clave necesita al menos 8 caracteres.");
    expect(screen.getByLabelText("Clave").getAttribute("aria-invalid")).toBe("true");
  });
});
