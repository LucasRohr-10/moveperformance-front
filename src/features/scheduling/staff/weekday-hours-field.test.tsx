import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import type { TemplateDay } from "@/lib/api/types";

import { WeekdayHoursField } from "./weekday-hours-field";

function Harness({ onChange }: { onChange: (days: TemplateDay[]) => void }) {
  const [days, setDays] = useState<TemplateDay[]>([]);
  return (
    <WeekdayHoursField
      value={days}
      onChange={(next) => {
        setDays(next);
        onChange(next);
      }}
    />
  );
}

describe("WeekdayHoursField", () => {
  it("adds checked days in weekday order with the default hours", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithSnackbar(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Sábado" }));
    await user.click(screen.getByRole("button", { name: "Lunes" }));

    expect(onChange).toHaveBeenLastCalledWith([
      { weekday: 1, startTime: "08:00", endTime: "20:00" },
      { weekday: 6, startTime: "08:00", endTime: "20:00" },
    ]);
  });

  it("changes only the edited day", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithSnackbar(<Harness onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.click(screen.getByRole("button", { name: "Martes" }));

    fireEvent.change(screen.getByLabelText("Fin del lunes"), { target: { value: "19:35" } });

    expect(onChange).toHaveBeenLastCalledWith([
      { weekday: 1, startTime: "08:00", endTime: "19:35" },
      { weekday: 2, startTime: "08:00", endTime: "20:00" },
    ]);
  });

  it("brings a day back with the default hours after unchecking it", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithSnackbar(<Harness onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Lunes" }));
    fireEvent.change(screen.getByLabelText("Inicio del lunes"), { target: { value: "10:00" } });

    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.click(screen.getByRole("button", { name: "Lunes" }));

    expect(onChange).toHaveBeenLastCalledWith([
      { weekday: 1, startTime: "08:00", endTime: "20:00" },
    ]);
  });

  it("exposes the pressed state and the day names", async () => {
    const user = userEvent.setup();
    renderWithSnackbar(<Harness onChange={() => undefined} />);
    expect(screen.getByRole("group", { name: "Días habilitados" })).toBeDefined();
    expect(screen.getAllByRole("button")).toHaveLength(7);

    const monday = screen.getByRole("button", { name: "Lunes" });
    expect(monday.getAttribute("aria-pressed")).toBe("false");
    await user.click(monday);
    expect(monday.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Inicio del lunes")).toBeDefined();
  });

  it("shows the error of a day under its row", () => {
    renderWithSnackbar(
      <WeekdayHoursField
        value={[{ weekday: 2, startTime: "08:00", endTime: "" }]}
        onChange={() => undefined}
        errors={{ 2: "Completá la hora" }}
      />,
    );
    expect(screen.getByText("Completá la hora")).toBeDefined();
  });

  describe("suggestions", () => {
    const MON: TemplateDay = { weekday: 1, startTime: "08:00", endTime: "20:00" };
    const TUE: TemplateDay = { weekday: 2, startTime: "08:00", endTime: "20:00" };
    const SAME = { 1: ["19:35", "20:10"], 2: ["19:35", "20:10"] };

    function renderField(days: TemplateDay[], suggestions: Record<number, string[]>) {
      const onChange = vi.fn();
      const onSuggestionsChange = vi.fn();
      renderWithSnackbar(
        <WeekdayHoursField
          value={days}
          onChange={onChange}
          suggestions={suggestions}
          onSuggestionsChange={onSuggestionsChange}
        />,
      );
      return { onChange, onSuggestionsChange };
    }

    it("offers each suggested end time on the day, and applying one clears that day's help", async () => {
      const { onChange, onSuggestionsChange } = renderField([MON], { 1: ["19:35", "20:10"] });
      const user = userEvent.setup();

      expect(screen.getByText("Terminá a las")).toBeDefined();
      await user.click(screen.getByRole("button", { name: "Terminar el lunes a las 19:35" }));

      expect(onChange).toHaveBeenCalledWith([{ ...MON, endTime: "19:35" }]);
      expect(onSuggestionsChange).toHaveBeenCalledWith({});
    });

    it("offers one button per common time to apply it to every flagged day", async () => {
      const { onChange, onSuggestionsChange } = renderField([MON, TUE], SAME);
      const user = userEvent.setup();

      expect(screen.getByRole("button", { name: "Usar 20:10 en los 2 días" })).toBeDefined();
      await user.click(screen.getByRole("button", { name: "Usar 19:35 en los 2 días" }));

      expect(onChange).toHaveBeenCalledWith([
        { ...MON, endTime: "19:35" },
        { ...TUE, endTime: "19:35" },
      ]);
      expect(onSuggestionsChange).toHaveBeenCalledWith({});
    });

    it("shows no shared button when the days suggest different times", () => {
      renderField([MON, TUE], { 1: ["19:35", "20:10"], 2: ["19:40", "20:15"] });

      expect(screen.queryByRole("button", { name: /^Usar .* en los/ })).toBeNull();
      expect(screen.getByRole("button", { name: "Terminar el martes a las 19:40" })).toBeDefined();
    });

    it("clears only the help of the day whose end time is typed by hand", () => {
      const { onSuggestionsChange } = renderField([MON, TUE], SAME);

      fireEvent.change(screen.getByLabelText("Fin del lunes"), { target: { value: "19:35" } });

      expect(onSuggestionsChange).toHaveBeenCalledWith({ 2: ["19:35", "20:10"] });
    });

    it("marks only the flagged end time in yellow", () => {
      renderField([MON, TUE], { 1: ["19:35", "20:10"] });

      const flagged = screen.getByLabelText("Fin del lunes");
      expect(flagged.getAttribute("aria-invalid")).toBe("true");
      expect(flagged.className).toContain("border-warning");
      expect(screen.getByLabelText("Fin del martes").className).not.toContain("border-warning");
    });
  });
});
