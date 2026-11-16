import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MyAttendanceItemDto, MyAttendancePageDto } from "@/lib/api/types";

import { AttendanceHistoryList } from "./attendance-history-list";

const hrefForPage = (page: number) => (page > 1 ? `/history?page=${page}` : "/history");

const item = (startsAt: string): MyAttendanceItemDto => ({
  bookingId: `b-${startsAt}`,
  service: "performance",
  startsAt,
  endsAt: startsAt,
  label: "Entrenamiento semi personalizado",
  state: "present",
});

const page = (over: Partial<MyAttendancePageDto>): MyAttendancePageDto => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  months: [],
  ...over,
});

describe("AttendanceHistoryList", () => {
  it("draws one heading per month with its attended count", () => {
    render(
      <AttendanceHistoryList
        page={page({
          items: [item("2026-10-26T21:00:00Z"), item("2026-09-30T21:00:00Z")],
          total: 2,
          months: [
            { month: "2026-10", attended: 8 },
            { month: "2026-09", attended: 11 },
          ],
        })}
        hrefForPage={hrefForPage}
      />,
    );

    expect(screen.getByText("OCTUBRE 2026")).toBeDefined();
    expect(screen.getByText("8 asistencias")).toBeDefined();
    expect(screen.getByText("SEPTIEMBRE 2026")).toBeDefined();
    expect(screen.getByText("11 asistencias")).toBeDefined();
  });

  it("invites a client with no past sessions to book", () => {
    render(<AttendanceHistoryList page={page({})} hrefForPage={hrefForPage} />);

    expect(screen.getByText("Todavía no tenés turnos pasados.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reservar" }).getAttribute("href")).toBe("/bookings");
    expect(screen.getByRole("link", { name: "Reservar" }).className).toContain("min-h-11");
  });

  it("sends a page past the end back to the first one", () => {
    render(<AttendanceHistoryList page={page({ total: 3, page: 5 })} hrefForPage={hrefForPage} />);

    expect(screen.getByText("No hay turnos en esta página.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Volver al principio" }).getAttribute("href")).toBe("/history");
    expect(screen.getByRole("link", { name: "Volver al principio" }).className).toContain("min-h-11");
  });

  it("pages with the links the page gave it", () => {
    render(
      <AttendanceHistoryList
        page={page({ items: [item("2026-10-26T21:00:00Z")], total: 45, page: 2, months: [{ month: "2026-10", attended: 1 }] })}
        hrefForPage={hrefForPage}
      />,
    );

    expect(screen.getByText("Página 2 de 3")).toBeDefined();
    expect(screen.getByRole("link", { name: "Anterior" }).getAttribute("href")).toBe("/history");
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toBe("/history?page=3");
  });

  it("shows no paging when everything fits in one page", () => {
    render(
      <AttendanceHistoryList
        page={page({ items: [item("2026-10-26T21:00:00Z")], total: 1, months: [{ month: "2026-10", attended: 1 }] })}
        hrefForPage={hrefForPage}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Páginas de asistencia" })).toBeNull();
  });
});
