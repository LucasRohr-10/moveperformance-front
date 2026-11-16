import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { attendanceHref, HistoryTabs } from "./history-tabs";

describe("attendanceHref", () => {
  it("is the bare URL on the first page and carries the page after that", () => {
    expect(attendanceHref(1)).toBe("/history");
    expect(attendanceHref(3)).toBe("/history?page=3");
  });
});

describe("HistoryTabs", () => {
  it("links Asistencia to the bare URL and Pagos to ?tab=pagos, never carrying a page or a filter", () => {
    render(<HistoryTabs active="asistencia" />);

    expect(screen.getByRole("link", { name: "Asistencia" }).getAttribute("href")).toBe("/history");
    expect(screen.getByRole("link", { name: "Pagos" }).getAttribute("href")).toBe("/history?tab=pagos");
  });

  it.each([
    ["asistencia", "Asistencia", "Pagos"],
    ["pagos", "Pagos", "Asistencia"],
  ] as const)("marks only the active tab (%s) as the current one", (active, current, other) => {
    render(<HistoryTabs active={active} />);

    expect(screen.getByRole("link", { name: current }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: other }).getAttribute("aria-current")).toBeNull();
  });
});
