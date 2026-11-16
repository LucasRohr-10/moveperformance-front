import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { MyAttendancePageDto } from "@/lib/api/types";

import { AttendanceHistorySection, AttendanceHistorySkeleton } from "./attendance-history-section";
import { getMyAttendance } from "./get-my-attendance";

vi.mock("./get-my-attendance");
vi.mock("./attendance-history-list", () => ({
  AttendanceHistoryList: ({ page }: { page: MyAttendancePageDto }) => <div>list of {page.items.length}</div>,
}));

const getMock = vi.mocked(getMyAttendance);
const hrefForPage = (page: number) => `/history?page=${page}`;

describe("AttendanceHistorySection", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("asks for the page it was given and hands the result to the list", async () => {
    getMock.mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 20, months: [] });

    render(await AttendanceHistorySection({ page: 2, hrefForPage }));

    expect(getMock).toHaveBeenCalledWith(2);
    expect(screen.getByText("list of 0")).toBeDefined();
  });

  it("shows an alert with a retry link to the same page when the API fails", async () => {
    getMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    render(await AttendanceHistorySection({ page: 3, hrefForPage }));

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar tu asistencia.");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/history?page=3");
  });
});

describe("AttendanceHistorySkeleton", () => {
  it("says it is loading and marks itself busy", () => {
    render(<AttendanceHistorySkeleton />);

    expect(screen.getByText("Cargando tu asistencia…")).toBeDefined();
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
  });
});
