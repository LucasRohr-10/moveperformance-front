import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { StatsMetaDto } from "@/lib/api/types";

import { COMPARE_PARAMS } from "../dashboard-params";
import { KpiTile } from "./kpi-tile";

const COMPARISON: StatsMetaDto["comparison"] = { from: "2026-09-01", to: "2026-09-30", inProgress: false, hasData: true };
const METRIC = { current: 1000, previous: 900, change: 11, changeUnit: "percent" } as const;

describe("KpiTile", () => {
  it("shows the label, the value and the comparison", () => {
    render(
      <KpiTile label="Cobrado" info="Lo que entró." value="$ 1.000" metric={METRIC} comparison={COMPARISON} compare={COMPARE_PARAMS.PREVIOUS} />,
    );

    expect(screen.getByRole("heading", { name: "Cobrado" })).toBeDefined();
    expect(screen.getByText("$ 1.000")).toBeDefined();
    // Only the figure carries the color, as in the mockup; "vs período anterior" stays gray.
    expect(screen.getByText("▲ 11%").className).toContain("text-success");
    expect(screen.getByText(/vs período anterior/).className).not.toContain("text-success");
  });

  it("puts the note before the comparison and opens the definition from the i", async () => {
    render(
      <KpiTile
        label="Cancelaciones"
        info="Reservas canceladas."
        value="12"
        note="3 el mismo día"
        downIsGood
        metric={{ ...METRIC, change: 20 }}
        comparison={COMPARISON}
        compare={COMPARE_PARAMS.PREVIOUS}
      />,
    );

    expect(screen.getByText("3 el mismo día")).toBeDefined();
    // More cancellations is bad news: red, even though the number went up.
    expect(screen.getByText("▲ 20%").className).toContain("text-danger");

    await userEvent.click(screen.getByRole("button", { name: "Qué significa Cancelaciones" }));
    expect(screen.getByText("Reservas canceladas.")).toBeDefined();
  });

  it("says sin datos para comparar instead of a percentage", () => {
    render(
      <KpiTile
        label="Cobrado"
        info="x"
        value="$ 0"
        metric={{ current: 0, previous: null, change: null, changeUnit: "percent" }}
        comparison={{ ...COMPARISON!, hasData: false }}
        compare={COMPARE_PARAMS.LAST_YEAR}
      />,
    );

    expect(screen.getByText("sin datos para comparar")).toBeDefined();
    expect(screen.queryByText(/NaN|%/)).toBeNull();
  });
});
