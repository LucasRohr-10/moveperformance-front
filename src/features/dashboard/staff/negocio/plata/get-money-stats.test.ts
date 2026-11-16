// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { apiFetchServer } from "@/lib/api/server";

import { parseDashboardParams } from "../../dashboard-params";
import { getMoneyStats } from "./get-money-stats";
import { MONEY_STATS } from "./money-fixtures";

vi.mock("@/lib/api/server", () => ({ apiFetchServer: vi.fn() }));

const apiFetchServerMock = vi.mocked(apiFetchServer);

describe("getMoneyStats", () => {
  beforeEach(() => {
    apiFetchServerMock.mockReset();
  });

  it("asks the API with the URL period, comparison and service", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(MONEY_STATS));
    const params = parseDashboardParams({
      vista: "negocio",
      periodo: "fechas",
      desde: "2026-10-05",
      hasta: "2026-10-19",
      comparar: "anio-pasado",
      servicio: "rehab",
      agrupar: "dia",
    });

    await expect(getMoneyStats(params)).resolves.toEqual(MONEY_STATS);

    expect(apiFetchServerMock).toHaveBeenCalledWith(
      "/api/v1/staff/dashboard/stats/money?period=custom&from=2026-10-05&to=2026-10-19&compare=last_year&service=rehab&granularity=day",
    );
  });

  it("asks for the defaults when the URL has none", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json(MONEY_STATS));

    await getMoneyStats(parseDashboardParams({ vista: "negocio" }));

    expect(apiFetchServerMock).toHaveBeenCalledWith(
      "/api/v1/staff/dashboard/stats/money?period=last_month&compare=previous&service=all",
    );
  });

  it("throws on an API error", async () => {
    apiFetchServerMock.mockResolvedValue(Response.json({ statusCode: 500, code: "INTERNAL" }, { status: 500 }));

    await expect(getMoneyStats(parseDashboardParams({}))).rejects.toBeInstanceOf(ApiError);
  });
});
