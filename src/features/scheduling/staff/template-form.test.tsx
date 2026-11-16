import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { ScheduleTemplate } from "@/lib/api/types";

import { TemplateForm } from "./template-form";

const professionals = [{ id: "p1", name: "Ana", active: true }];

const existing: ScheduleTemplate = {
  id: "t1",
  service: "rehab",
  days: [
    { weekday: 1, startTime: "09:00", endTime: "13:00" },
    { weekday: 3, startTime: "09:00", endTime: "13:00" },
  ],
  durationMinutes: 45,
  gapMinutes: 5,
  capacity: 1,
  professionalId: "p1",
  professionalName: "Ana",
  active: true,
};

function renderForm(props: Partial<React.ComponentProps<typeof TemplateForm>> = {}) {
  const onSubmit = vi.fn();
  const onInvalid = vi.fn();
  renderWithSnackbar(
    <TemplateForm
      professionals={professionals}
      isSubmitting={false}
      onSubmit={onSubmit}
      onInvalid={onInvalid}
      onCancel={() => undefined}
      {...props}
    />,
  );
  return { onSubmit, onInvalid };
}

describe("TemplateForm", () => {
  it("reports a zero duration, a missing quota and a rehab without professional instead of submitting", async () => {
    const user = userEvent.setup();
    const { onSubmit, onInvalid } = renderForm();

    await user.selectOptions(screen.getByLabelText("Servicio"), "rehab");
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.clear(screen.getByLabelText("Duración (min)"));
    await user.type(screen.getByLabelText("Duración (min)"), "0");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith([
      "La duración tiene que ser de al menos 1 minuto.",
      "El cupo tiene que ser al menos 1.",
      "Rehab necesita un profesional asignado.",
    ]);
  });

  it("submits a new template with the defaults for the untouched fields", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.selectOptions(screen.getByLabelText("Servicio"), "performance");
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.click(screen.getByRole("button", { name: "Martes" }));
    await user.clear(screen.getByLabelText("Duración (min)"));
    await user.type(screen.getByLabelText("Duración (min)"), "45");
    await user.type(screen.getByLabelText("Cupo"), "8");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(onSubmit).toHaveBeenCalledWith({
      service: "performance",
      days: [
        { weekday: 1, startTime: "08:00", endTime: "20:00" },
        { weekday: 2, startTime: "08:00", endTime: "20:00" },
      ],
      durationMinutes: 45,
      gapMinutes: 5,
      capacity: 8,
      professionalId: null,
    });
  });

  it("preloads the template when editing and locks the service", () => {
    renderForm({ initial: existing });

    expect((screen.getByLabelText("Servicio") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("Servicio") as HTMLSelectElement).value).toBe("rehab");
    expect(screen.getByRole("button", { name: "Lunes" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Miércoles" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDefined();
  });

  it("submits the edited template with the original service", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: existing });

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSubmit).toHaveBeenCalledWith({
      service: "rehab",
      days: existing.days,
      durationMinutes: 45,
      gapMinutes: 5,
      capacity: 1,
      professionalId: "p1",
    });
  });

  it("does not submit without days", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText("Cupo"), "8");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Elegí al menos un día")).toBeDefined();
  });

  it("does not submit a checked day with an empty time", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText("Cupo"), "8");
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    fireEvent.change(screen.getByLabelText("Fin del lunes"), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Completá la hora")).toBeDefined();
  });

  it("renders every field label through the shared controls", () => {
    renderForm();
    for (const label of ["Servicio", "Profesional", "Duración (min)", "Margen entre turnos (min)", "Cupo"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
    expect(document.querySelector("fieldset")).toBeNull();
  });

  describe("end time suggestions from a failed save", () => {
    const SUGGESTIONS = { 1: ["19:35", "20:10"], 2: ["19:35", "20:10"] };

    async function submitWithSuggestions(answer: unknown) {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(answer);
      renderForm({ onSubmit });
      await user.selectOptions(screen.getByLabelText("Servicio"), "performance");
      await user.click(screen.getByRole("button", { name: "Lunes" }));
      await user.click(screen.getByRole("button", { name: "Martes" }));
      await user.type(screen.getByLabelText("Cupo"), "8");
      await user.click(screen.getByRole("button", { name: "Crear" }));
      return user;
    }

    it("shows the help the save returned, on the flagged days, and moves focus to the first one", async () => {
      await submitWithSuggestions(SUGGESTIONS);

      expect(await screen.findByRole("button", { name: "Terminar el lunes a las 19:35" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Terminar el martes a las 20:10" })).toBeDefined();
      expect(document.activeElement).toBe(screen.getByLabelText("Fin del lunes"));
    });

    it("keeps focus where the staff is typing when a manual fix clears one day's help", async () => {
      await submitWithSuggestions(SUGGESTIONS);
      await screen.findByRole("button", { name: "Terminar el lunes a las 19:35" });
      const tuesdayEnd = screen.getByLabelText("Fin del martes");
      tuesdayEnd.focus();

      fireEvent.change(tuesdayEnd, { target: { value: "19:35" } });

      expect(document.activeElement).toBe(tuesdayEnd);
    });

    it("shows nothing when the save returned no suggestions", async () => {
      await submitWithSuggestions(undefined);

      await screen.findByRole("button", { name: "Crear" });
      expect(screen.queryByText("Terminá a las")).toBeNull();
    });

    it("keeps the help of the other days when one day is fixed", async () => {
      const user = await submitWithSuggestions(SUGGESTIONS);

      await user.click(await screen.findByRole("button", { name: "Terminar el lunes a las 19:35" }));

      expect(screen.queryByRole("button", { name: "Terminar el lunes a las 20:10" })).toBeNull();
      expect(screen.getByRole("button", { name: "Terminar el martes a las 19:35" })).toBeDefined();
    });

    it("clears all the help when the days change", async () => {
      const user = await submitWithSuggestions(SUGGESTIONS);

      await user.click(await screen.findByRole("button", { name: "Miércoles" }));

      expect(screen.queryByText("Terminá a las")).toBeNull();
    });
  });
});
