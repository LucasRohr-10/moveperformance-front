import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeatmapTable } from "./heatmap-table";
import { SLOTS_STATS } from "./slots-fixtures";

describe("HeatmapTable", () => {
  it("heatmap cells carry the number for screen readers", () => {
    render(<HeatmapTable cells={SLOTS_STATS.heatmap} />);

    const table = screen.getByRole("table", { name: "Ocupación por día y hora" });
    const monday = within(table).getByRole("row", { name: /Lun/ });
    // The seats as the API sent them: the table does not turn them into a percentage.
    expect(within(monday).getByText("6 de 8 cupos")).toBeDefined();
    expect(within(monday).getByText("10 de 10 cupos")).toBeDefined();
  });

  it("names a day and an hour in the headers, and lists only days and hours that have turnos", () => {
    render(<HeatmapTable cells={SLOTS_STATS.heatmap} />);

    const table = screen.getByRole("table", { name: "Ocupación por día y hora" });
    expect(within(table).getByRole("columnheader", { name: "08" })).toBeDefined();
    expect(within(table).getByRole("columnheader", { name: "18" })).toBeDefined();
    expect(within(table).getByRole("rowheader", { name: "Lun" })).toBeDefined();
    expect(within(table).getByRole("rowheader", { name: "Mié" })).toBeDefined();
    expect(within(table).queryByRole("rowheader", { name: "Mar" })).toBeNull();
  });

  it("says there were no turnos in a striped cell: an hour with nothing offered, or missing", () => {
    render(<HeatmapTable cells={SLOTS_STATS.heatmap} />);

    const wednesday = within(screen.getByRole("table")).getByRole("row", { name: /Mié/ });
    // Hours 08 to 18 are columns: only 08:00 had turnos on Wednesday. 18:00 offered 0 and the rest have no cell.
    expect(within(wednesday).getAllByText("sin turnos")).toHaveLength(10);
    expect(within(wednesday).getByText("4 de 8 cupos")).toBeDefined();
    // Offered but nobody booked is not "sin turnos".
    expect(within(screen.getByRole("row", { name: /Lun/ })).getByText("0 de 8 cupos")).toBeDefined();
  });

  it("paints each cell from the rate the API sent, not from its own seats", () => {
    const cell = { isoWeekday: 1, hour: 8, offered: 10, booked: 10 };
    render(
      <HeatmapTable
        cells={[
          { ...cell, rate: 1 },
          { ...cell, hour: 9, rate: 0.2 },
          { ...cell, hour: 10, rate: 0 },
        ]}
      />,
    );

    const [full, low, empty] = within(screen.getByRole("row", { name: /Lun/ })).getAllByRole("cell");
    // Same seats in the three cells: only the rate tells them apart.
    expect(full.style.background).toContain("93%");
    expect(low.style.background).toContain("25%");
    expect(empty.style.background).toContain("8%");
  });

  it("stripes a cell whose rate is null, and prints no NaN", () => {
    render(<HeatmapTable cells={[{ isoWeekday: 1, hour: 8, offered: 0, booked: 0, rate: null }]} />);

    const [cell] = within(screen.getByRole("row", { name: /Lun/ })).getAllByRole("cell");
    expect(cell.style.background).toContain("repeating-linear-gradient");
    expect(screen.getByText("sin turnos")).toBeDefined();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it("keeps the hidden seat texts inside the box that scrolls, so they do not widen the page on a phone", () => {
    render(<HeatmapTable cells={SLOTS_STATS.heatmap} />);

    // `sr-only` is absolutely positioned: unless the scrolling box is its containing block, it escapes the box's
    // overflow and the page gets a horizontal scroll that no card shows.
    const scroller = screen.getByRole("table", { name: "Ocupación por día y hora" }).parentElement;
    expect(scroller?.className).toContain("overflow-x-auto");
    expect(scroller?.className).toContain("relative");
  });

  it("says so when there is nothing to draw", () => {
    render(<HeatmapTable cells={[]} />);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("No hubo turnos en el período.")).toBeDefined();
  });

  it("explains the shading", () => {
    render(<HeatmapTable cells={SLOTS_STATS.heatmap} />);

    expect(screen.getByText(/Más claro = más lleno/)).toBeDefined();
  });
});
