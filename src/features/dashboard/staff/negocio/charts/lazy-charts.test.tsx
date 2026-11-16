import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LazyDonutChart, LazyLineWithBarsChart, LazyStackedColumnsChart } from "./lazy-charts";

vi.mock("recharts", () => import("./fixed-size-recharts").then((module) => module.fixedSizeRecharts()));

describe("lazy charts", () => {
  it("LazyStackedColumnsChart holds the h-56 place with a skeleton and then draws the chart", async () => {
    const { container } = render(
      <LazyStackedColumnsChart
        label="Cobrado por semana"
        valueFormat="money"
        previousName={null}
        series={[{ key: "performance", name: "Performance", color: "var(--color-performance)" }]}
        buckets={[{ label: "1 oct", range: "1 oct – 7 oct", inProgress: false, values: { performance: 1000 }, total: 1000, previous: null }]}
      />,
    );

    expect(container.querySelector(".h-56")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();

    const chart = await screen.findByRole("img", { name: "Cobrado por semana" });
    expect(chart.querySelector(".recharts-bar-rectangle")).not.toBeNull();
  });

  it("LazyDonutChart shows a round skeleton and then draws the chart", async () => {
    const { container } = render(
      <LazyDonutChart
        label="Cobrado por servicio: Performance 100%"
        valueFormat="money"
        parts={[{ name: "Performance", value: 1000, share: 1, color: "var(--color-performance)" }]}
      />,
    );

    expect(container.querySelector(".rounded-full")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();

    const chart = await screen.findByRole("img", { name: "Cobrado por servicio: Performance 100%" });
    expect(chart.querySelector(".recharts-pie-sector")).not.toBeNull();
  });

  it("LazyLineWithBarsChart holds the h-64 place with a skeleton and then draws the chart", async () => {
    const { container } = render(
      <LazyLineWithBarsChart
        label="Activos por mes"
        previousName={null}
        points={[{ label: "oct", inProgress: false, line: 80, previousLine: null, up: 6, down: 2 }]}
      />,
    );

    expect(container.querySelector(".h-64")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();

    const chart = await screen.findByRole("img", { name: "Activos por mes" });
    expect(chart.querySelectorAll("svg")).toHaveLength(2);
  });
});
