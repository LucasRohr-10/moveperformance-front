import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  it("shows the description and links it to the dialog when there is one", () => {
    render(
      <ConfirmDialog
        title="¿Eliminar?"
        description="No se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("No se puede deshacer.")).toBeDefined();
    expect(screen.getByRole("dialog").getAttribute("aria-describedby")).toBeTruthy();
  });

  it("renders custom content between the title and the buttons, with no description", () => {
    render(
      <ConfirmDialog title="¿Querés cancelar?" confirmLabel="Sí, cancelar" onConfirm={vi.fn()} onCancel={vi.fn()}>
        <p>ticket</p>
      </ConfirmDialog>,
    );

    expect(screen.getByText("ticket")).toBeDefined();
    expect(screen.getByRole("dialog").getAttribute("aria-describedby")).toBeNull();
  });

  it("closes with Escape", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog title="¿Eliminar?" confirmLabel="Eliminar" onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape and the backdrop while busy, and closes with the backdrop otherwise", () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmDialog title="¿Eliminar?" confirmLabel="Eliminar" isBusy onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    const backdrop = screen.getByRole("dialog").parentElement as HTMLElement;

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(backdrop);
    expect(onCancel).not.toHaveBeenCalled();

    rerender(<ConfirmDialog title="¿Eliminar?" confirmLabel="Eliminar" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.pointerDown(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables only the confirm button with isConfirmDisabled, so the person can still go back", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="¿Eliminar?"
        confirmLabel="Eliminar"
        cancelLabel="Volver"
        isConfirmDisabled
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Eliminar" }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Volver" }).disabled).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("scrolls inside the screen when its content is taller than the viewport", () => {
    render(<ConfirmDialog title="¿Eliminar?" confirmLabel="Eliminar" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const panel = screen.getByRole("dialog");
    expect(panel.className).toContain("overflow-y-auto");
    expect(panel.className).toContain("max-h-");
  });
});
