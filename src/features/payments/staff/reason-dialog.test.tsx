import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { REASON_MAX_LENGTH, ReasonDialog } from "./reason-dialog";

const onSubmit = vi.fn<(reason: string) => Promise<void>>();
const onClose = vi.fn();

function renderDialog(props: Partial<Parameters<typeof ReasonDialog>[0]> = {}) {
  render(
    <ReasonDialog
      title="¿Marcar que no se cobra?"
      description="El cobro se cierra."
      placeholder="Ej.: cortesía, no va a pagar"
      confirmLabel="No se cobra"
      tone="primary"
      onSubmit={onSubmit}
      onClose={onClose}
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  onSubmit.mockResolvedValue(undefined);
});

describe("ReasonDialog", () => {
  it("shows the title, the text and the placeholder", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "¿Marcar que no se cobra?" })).toBeDefined();
    expect(screen.getByText("El cobro se cierra.")).toBeDefined();
    expect(screen.getByPlaceholderText("Ej.: cortesía, no va a pagar")).toBeDefined();
  });

  it("requires a reason", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Motivo"), "   ");
    await user.click(screen.getByRole("button", { name: "No se cobra" }));

    expect(screen.getByText("Escribí el motivo.")).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("trims it", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Motivo"), "  Cortesía  ");
    await user.click(screen.getByRole("button", { name: "No se cobra" }));

    expect(onSubmit).toHaveBeenCalledWith("Cortesía");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("limits it to 240", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Motivo"));
    await user.paste("a".repeat(REASON_MAX_LENGTH + 1));
    await user.click(screen.getByRole("button", { name: "No se cobra" }));

    expect(screen.getByText("Máximo 240 caracteres.")).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Motivo"));
    await user.paste("a".repeat(REASON_MAX_LENGTH));
    await user.click(screen.getByRole("button", { name: "No se cobra" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("stays open when submitting fails", async () => {
    onSubmit.mockRejectedValue(new Error("boom"));
    renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Motivo"), "Cortesía");
    await user.click(screen.getByRole("button", { name: "No se cobra" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "No se cobra" }).hasAttribute("disabled")).toBe(false));
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Motivo") as HTMLTextAreaElement).value).toBe("Cortesía");
  });

  it("is busy while waiting and sends once on a double click", async () => {
    let resolveSubmit: () => void = () => {};
    onSubmit.mockReturnValue(new Promise<void>((resolve) => (resolveSubmit = resolve)));
    renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Motivo"), "Cortesía");
    await user.dblClick(screen.getByRole("button", { name: "No se cobra" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "No se cobra" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")).toBe(true);
    resolveSubmit();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("closes with Cancelar", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
