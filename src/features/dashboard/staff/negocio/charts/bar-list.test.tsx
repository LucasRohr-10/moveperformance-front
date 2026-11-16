import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarList } from "./bar-list";

const widthOf = (name: string) => {
  const item = screen.getByText(name).closest("li");
  return (item?.querySelector("[data-fill]") as HTMLElement).style.width;
};

describe("BarList", () => {
  it("bar widths are proportional to the max", () => {
    render(
      <BarList
        items={[
          { label: "Cliente", value: 40 },
          { label: "Staff", value: 10 },
          { label: "Estudio", value: 0 },
        ]}
        format={(value) => `${value}`}
      />,
    );

    expect(widthOf("Cliente")).toBe("100%");
    expect(widthOf("Staff")).toBe("25%");
    expect(widthOf("Estudio")).toBe("0%");
  });

  it("writes every value, so the bars are never the only way to read them", () => {
    render(<BarList items={[{ label: "Cliente", value: 40 }]} format={(value) => `${value} reservas`} />);

    expect(screen.getByText("40 reservas")).toBeDefined();
  });

  it("does not divide by zero when every value is 0", () => {
    render(<BarList items={[{ label: "Cliente", value: 0 }]} format={(value) => `${value}`} />);

    expect(widthOf("Cliente")).toBe("0%");
  });

  it("takes any node as label", () => {
    render(<BarList items={[{ label: <span>Rehab</span>, value: 1, color: "var(--color-rehab)" }]} format={String} />);

    expect(screen.getByText("Rehab")).toBeDefined();
  });

  it("draws a bar with the fill the item brings (0 to 1, from the API) and writes the text it was given", () => {
    render(
      <BarList
        items={[
          { label: "Performance", value: 11, fill: 0.79, text: "79%" },
          { label: "Recovery", value: 6, fill: 0.55, text: "55%" },
        ]}
        format={String}
      />,
    );

    expect(widthOf("Performance")).toBe("79%");
    expect(widthOf("Recovery")).toBe("55%");
    expect(screen.getByText("79%")).toBeDefined();
  });

  it("draws an empty bar when the fill is null: no data, not a full or a zero bar", () => {
    render(<BarList items={[{ label: "Recovery", value: 0, fill: null, text: "—" }]} format={String} />);

    expect(widthOf("Recovery")).toBe("0%");
    expect(screen.getByText("—")).toBeDefined();
  });

  it("writes a note under the row", () => {
    render(<BarList items={[{ label: "Cliente", value: 15, note: "6 el mismo día" }]} format={String} />);

    expect(screen.getByText("6 el mismo día")).toBeDefined();
  });
});
