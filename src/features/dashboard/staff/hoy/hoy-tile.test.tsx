import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HoyTile } from "./hoy-tile";
import { HOY_TILES, type HoyTileDef } from "./hoy-tiles";
import { EMPTY_SUMMARY, SUMMARY } from "./today-fixtures";

const tile = (key: HoyTileDef["key"]): HoyTileDef => {
  const found = HOY_TILES.find((def) => def.key === key);
  if (!found) throw new Error(`no tile ${key}`);
  return found;
};

describe("HoyTile", () => {
  it("shows the number and its line when there is something", () => {
    render(<HoyTile def={tile("attendance")} summary={SUMMARY} />);

    expect(screen.getByText("6").className).not.toContain("text-muted");
    expect(screen.getByText("en 2 turnos ya empezados")).toBeDefined();
    expect(screen.queryByText("Todo marcado ✓")).toBeNull();
  });

  it("dims the number and shows the zero note when a tile is 0", () => {
    render(<HoyTile def={tile("attendance")} summary={EMPTY_SUMMARY} />);

    expect(screen.getByText("0").className).toContain("text-muted");
    expect(screen.getByText("Todo marcado ✓")).toBeDefined();
  });

  it("titles the tile with an h2, under the page's h1", () => {
    render(<HoyTile def={tile("review")} summary={SUMMARY} />);

    expect(screen.getByRole("heading", { level: 2, name: "Pagos para revisar" })).toBeDefined();
  });

  it("no interactive element is inside the tile link", () => {
    render(<HoyTile def={tile("review")} summary={SUMMARY} />);

    const link = screen.getByRole("link", { name: "Pagos para revisar" });
    expect(link.getAttribute("href")).toBe("/staff/payments?needsAttention=true");
    expect(link.querySelector("button, a, input, select")).toBeNull();
    expect(screen.getByRole("button", { name: "Qué significa Pagos para revisar" })).toBeDefined();
  });

  it("the i of Vencen pronto says the window of the summary, not a fixed one", () => {
    const summary = { ...SUMMARY, expiringSoon: { ...SUMMARY.expiringSoon, windowDays: 7 } };
    render(<HoyTile def={tile("expiring")} summary={summary} />);

    fireEvent.click(screen.getByRole("button", { name: "Qué significa Vencen pronto" }));

    expect(screen.getByText(/en los próximos 7 días/)).toBeDefined();
    expect(screen.queryByText(/10 días/)).toBeNull();
  });
});
