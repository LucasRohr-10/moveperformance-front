// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";

import { parseDashboardParams } from "../../dashboard-params";
import { getSlotsStats } from "./get-slots-stats";
import { SLOTS_STATS } from "./slots-fixtures";

vi.mock("@/lib/api/server", () => ({ apiFetchServer: vi.fn() }));

const apiFetchServerMock = vi.mocked(apiFetchServer);

describe("getSlotsStats", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("asks the API with the URL period, comparison and service", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(SLOTS_STATS));
    const params = parseDashboardParams({
      vista: "negocio",
      tab: "turnos",
      periodo: "este-anio",
      comparar: "anio-pasado",
      servicio: "recovery",
    });

    await expect(getSlotsStats(params)).resolves.toEqual(SLOTS_STATS);

    expect(apiFetchServerMock).toHaveBeenCalledWith(
      "/api/v1/staff/dashboard/stats/slots?period=this_year&compare=last_year&service=recovery",
    );
  });

  it("throws on an API error", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json({ statusCode: 500, code: "INTERNAL" }, { status: 500 }));

    await expect(getSlotsStats(parseDashboardParams({}))).rejects.toBeInstanceOf(ApiError);
  });
});
