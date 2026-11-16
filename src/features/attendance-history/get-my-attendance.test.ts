import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";
import type { MyAttendancePageDto } from "@/lib/api/types";

import { getMyAttendance } from "./get-my-attendance";

vi.mock("@/lib/api/server");

const apiFetchServerMock = vi.mocked(apiFetchServer);

const emptyPage: MyAttendancePageDto = { items: [], total: 0, page: 1, pageSize: 20, months: [] };

describe("getMyAttendance", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("asks the API for the page it was given", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(emptyPage));

    await getMyAttendance(2);

    expect(apiFetchServerMock).toHaveBeenCalledWith("/api/v1/me/attendance-history?page=2");
  });

  it("returns the parsed page", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(emptyPage));

    await expect(getMyAttendance(1)).resolves.toEqual(emptyPage);
  });

  it("throws the API's error when the request fails", async () => {
    apiFetchServerMock.mockResolvedValue(
      Response.json({ statusCode: 500, code: "INTERNAL", message: "x" }, { status: 500 }),
    );

    await expect(getMyAttendance(1)).rejects.toBeInstanceOf(ApiError);
  });
});
