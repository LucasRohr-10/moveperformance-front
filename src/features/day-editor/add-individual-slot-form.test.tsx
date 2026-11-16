import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AddIndividualSlotForm } from "./add-individual-slot-form";

const professionals = [
  { id: "p-ana", name: "Ana Pérez" },
  { id: "p-juan", name: "Juan Gómez" },
];

function form(service: "recovery" | "rehab", onAdd = vi.fn(), onClose = vi.fn()) {
  return <AddIndividualSlotForm service={service} professionals={professionals} onAdd={onAdd} onClose={onClose} />;
}

describe("AddIndividualSlotForm", () => {
  it("adds a recovery slot with the typed values and no professional", async () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(form("recovery", onAdd, onClose));

    fireEvent.change(screen.getByLabelText("Hora de inicio"), { target: { value: "12:30" } });
    fireEvent.change(screen.getByLabelText("Duración (min)"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Cupo"), { target: { value: "2" } });
    expect(screen.getByText("Termina 13:30.")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onAdd).toHaveBeenCalledWith({
      service: "recovery",
      startTime: "12:30",
      durationMinutes: 60,
      capacity: 2,
      professionalId: null,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("rehab add form forces capacity 1 and requires a professional", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(form("rehab", onAdd));

    const capacity = screen.getByLabelText("Cupo") as HTMLInputElement;
    expect(capacity.value).toBe("1");
    expect(capacity.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Hora de inicio"), { target: { value: "14:00" } });
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByText("Elegí un profesional.")).toBeDefined();
    expect(onAdd).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText("Profesional"), "p-ana");
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ service: "rehab", capacity: 1, professionalId: "p-ana", startTime: "14:00" }),
    );
  });

  it("asks for the start time and a valid duration and capacity", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(form("recovery", onAdd));

    await user.click(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByText("Elegí la hora de inicio.")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Hora de inicio"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Duración (min)"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Cupo"), { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByText("La duración va de 5 a 480 minutos.")).toBeDefined();
    expect(screen.getByText("El cupo va de 1 a 100.")).toBeDefined();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("closes without adding", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(form("recovery", vi.fn(), onClose));

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
