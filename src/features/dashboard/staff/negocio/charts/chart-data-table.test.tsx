import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartDataTable } from "./chart-data-table";

describe("ChartDataTable", () => {
  it("renders a labelled table inside details", () => {
    render(
      <ChartDataTable
        caption="Cobrado por semana"
        columns={["Semana", "Performance", "Rehab"]}
        rows={[
          ["1 oct", "$ 1.000", "$ 500"],
          ["8 oct", "$ 300", "$ 0"],
        ]}
      />,
    );

    const details = screen.getByText("Ver datos").closest("details");
    expect(details).not.toBeNull();
    const table = within(details!).getByRole("table", { name: "Cobrado por semana" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Semana",
      "Performance",
      "Rehab",
    ]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("$ 300")).toBeDefined();
  });

  it("is closed until someone asks for the data", () => {
    render(<ChartDataTable caption="x" columns={["a"]} rows={[["1"]]} />);

    expect(screen.getByText("Ver datos").closest("details")?.hasAttribute("open")).toBe(false);
  });

  it("names each Ver datos after its chart, so two of them are not the same button", () => {
    render(
      <>
        <ChartDataTable caption="Cobrado por servicio" columns={["a"]} rows={[["1"]]} />
        <ChartDataTable caption="Cobrado por semana" columns={["a"]} rows={[["1"]]} />
      </>,
    );

    const names = screen.getAllByText("Ver datos").map((summary) => summary.getAttribute("aria-label"));
    expect(names).toEqual(["Ver datos: Cobrado por servicio", "Ver datos: Cobrado por semana"]);
  });
});
