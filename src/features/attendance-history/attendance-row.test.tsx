import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AttendanceRowView } from "./attendance-row";
import type { AttendanceRow } from "./present-attendance";

const row = (state: AttendanceRow["state"]): AttendanceRow => ({
  id: "b1",
  title: "Performance — 18:00",
  description: "Entrenamiento semi personalizado",
  dow: "LUN",
  dayNumber: 26,
  state,
});

describe("AttendanceRowView", () => {
  it("shows the day, the title, the description and the state badge", () => {
    render(<AttendanceRowView row={row("present")} />);

    expect(screen.getByText("LUN")).toBeDefined();
    expect(screen.getByText("26")).toBeDefined();
    expect(screen.getByText("Performance — 18:00")).toBeDefined();
    expect(screen.getByText("Entrenamiento semi personalizado")).toBeDefined();
    expect(screen.getByText("Presente")).toBeDefined();
  });

  it("tells the client the staff has not marked a past session yet", () => {
    render(<AttendanceRowView row={row("unmarked")} />);

    expect(screen.getByText("Sin marcar")).toBeDefined();
    expect(screen.getByText("El staff todavía no marcó tu asistencia.")).toBeDefined();
  });

  it("strikes the title of a cancelled booking", () => {
    render(<AttendanceRowView row={row("cancelled")} />);

    expect(screen.getByText("Cancelada")).toBeDefined();
    expect(screen.getByText("Performance — 18:00").closest("s")).not.toBeNull();
  });

  it("does not add the hint to the other states", () => {
    render(<AttendanceRowView row={row("absent")} />);

    expect(screen.getByText("Ausente")).toBeDefined();
    expect(screen.queryByText("El staff todavía no marcó tu asistencia.")).toBeNull();
  });
});
