import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "./table";

function PlanRows() {
  return (
    <>
      <TableHeader>
        <TableHeaderCell>Plan</TableHeaderCell>
        <TableHeaderCell>Precio</TableHeaderCell>
        <TableHeaderCell align="right">Acciones</TableHeaderCell>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Performance mensual</TableCell>
          <TableCell>$ 4.500</TableCell>
          <TableCell align="right">
            <button type="button">Eliminar</button>
          </TableCell>
        </TableRow>
      </TableBody>
    </>
  );
}

describe("Table", () => {
  it("names the table with aria-label", () => {
    render(
      <Table aria-label="Planes">
        <PlanRows />
      </Table>,
    );

    expect(screen.getByRole("table", { name: "Planes" })).toBeDefined();
  });

  it("names the table with a visually hidden caption", () => {
    render(
      <Table caption="Planes publicados">
        <PlanRows />
      </Table>,
    );

    const table = screen.getByRole("table", { name: "Planes publicados" });

    expect(table.querySelector("caption")?.className).toContain("sr-only");
  });

  it("exposes its columns and cells as a real table", () => {
    render(
      <Table aria-label="Planes">
        <PlanRows />
      </Table>,
    );

    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Plan",
      "Precio",
      "Acciones",
    ]);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("cell", { name: "Performance mensual" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDefined();
  });

  it("scopes the header cells to their column", () => {
    render(
      <Table aria-label="Planes">
        <PlanRows />
      </Table>,
    );

    for (const header of screen.getAllByRole("columnheader")) {
      expect(header.getAttribute("scope")).toBe("col");
    }
  });

  it("right-aligns the actions column", () => {
    render(
      <Table aria-label="Planes">
        <PlanRows />
      </Table>,
    );

    const actionsHeader = screen.getByRole("columnheader", { name: "Acciones" });
    const actionsCell = screen.getByRole("button", { name: "Eliminar" }).closest("td");

    expect(actionsHeader.className).toContain("text-right");
    expect(actionsCell?.className).toContain("text-right");
  });

  it("centers a column when asked", () => {
    render(
      <Table aria-label="Pagos">
        <TableHeader>
          <TableHeaderCell align="center">Pago</TableHeaderCell>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell align="center">Falta pagar</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("columnheader", { name: "Pago" }).className).toContain("text-center");
    expect(screen.getByRole("cell", { name: "Falta pagar" }).className).toContain("text-center");
  });

  it("scrolls horizontally instead of overflowing on mobile", () => {
    render(
      <Table aria-label="Planes">
        <PlanRows />
      </Table>,
    );

    expect(screen.getByRole("table").parentElement?.className).toContain("overflow-x-auto");
  });

  it("keeps its visually hidden text inside the scroll area", () => {
    render(
      <Table aria-label="Planes">
        <TableHeader>
          <TableHeaderCell>
            <span className="sr-only">Acciones</span>
          </TableHeaderCell>
        </TableHeader>
      </Table>,
    );

    // `sr-only` is absolute: unless the wrapper is its containing block it escapes the clip and widens the page.
    expect(screen.getByRole("table").parentElement?.className).toContain("relative");
  });

  it("rules every row but the last one", () => {
    render(
      <Table aria-label="Profesionales">
        <TableBody>
          <TableRow>
            <TableCell>Ana</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const row = screen.getByRole("row");

    expect(row.className).toContain("border-b");
    expect(row.className).toContain("last:border-b-0");
  });
});
