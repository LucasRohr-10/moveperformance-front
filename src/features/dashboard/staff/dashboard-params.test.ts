import { describe, expect, it } from "vitest";

import { dashboardHref, parseDashboardParams, toStatsQuery, type DashboardParams } from "./dashboard-params";

const DEFAULTS: DashboardParams = {
  view: "hoy",
  tab: "plata",
  period: "mes-pasado",
  from: null,
  to: null,
  compare: "anterior",
  service: "todos",
  granularity: null,
};

describe("parseDashboardParams", () => {
  it("defaults to hoy and omits defaults in the href", () => {
    expect(parseDashboardParams({})).toEqual(DEFAULTS);
    expect(dashboardHref(DEFAULTS)).toBe("/staff");
    expect(dashboardHref({ ...DEFAULTS, view: "negocio" })).toBe("/staff?vista=negocio");
  });

  it("builds the href back from everything that is not a default", () => {
    const params = parseDashboardParams({
      vista: "negocio",
      tab: "turnos",
      periodo: "este-anio",
      comparar: "anio-pasado",
      servicio: "rehab",
      agrupar: "semana",
    });

    expect(params).toEqual({
      view: "negocio",
      tab: "turnos",
      period: "este-anio",
      from: null,
      to: null,
      compare: "anio-pasado",
      service: "rehab",
      granularity: "semana",
    });
    expect(dashboardHref(params)).toBe(
      "/staff?vista=negocio&tab=turnos&periodo=este-anio&comparar=anio-pasado&servicio=rehab&agrupar=semana",
    );
  });

  it("keeps desde/hasta only with periodo=fechas", () => {
    const custom = parseDashboardParams({
      vista: "negocio",
      periodo: "fechas",
      desde: "2026-10-01",
      hasta: "2026-10-15",
    });
    expect(custom).toMatchObject({ period: "fechas", from: "2026-10-01", to: "2026-10-15" });
    expect(dashboardHref(custom)).toBe("/staff?vista=negocio&periodo=fechas&desde=2026-10-01&hasta=2026-10-15");

    const preset = parseDashboardParams({ periodo: "este-mes", desde: "2026-10-01", hasta: "2026-10-15" });
    expect(preset).toMatchObject({ period: "este-mes", from: null, to: null });
    expect(dashboardHref({ ...preset, view: "negocio" })).toBe("/staff?vista=negocio&periodo=este-mes");
  });

  it("falls back to the default period when periodo=fechas has no usable range", () => {
    for (const raw of [
      { periodo: "fechas" },
      { periodo: "fechas", desde: "2026-10-01" },
      { periodo: "fechas", desde: "ayer", hasta: "2026-10-15" },
      { periodo: "fechas", desde: "2026-10-20", hasta: "2026-10-15" },
    ]) {
      expect(parseDashboardParams(raw)).toMatchObject({ period: "mes-pasado", from: null, to: null });
    }
  });

  it("falls back on unknown values", () => {
    expect(
      parseDashboardParams({
        vista: "todo",
        tab: "x",
        periodo: "ayer",
        comparar: "siempre",
        servicio: "yoga",
        agrupar: "hora",
      }),
    ).toEqual(DEFAULTS);
  });

  it("takes the first value of a repeated param", () => {
    expect(parseDashboardParams({ vista: ["negocio", "hoy"], servicio: ["recovery"] })).toMatchObject({
      view: "negocio",
      service: "recovery",
    });
  });

  it("drops the Negocio filters from the href of the Hoy view", () => {
    expect(dashboardHref({ ...DEFAULTS, tab: "clientes", service: "rehab" })).toBe("/staff");
  });
});

describe("toStatsQuery", () => {
  it("maps to the API query names", () => {
    expect(toStatsQuery(DEFAULTS)).toBe("period=last_month&compare=previous&service=all");
    expect(
      toStatsQuery({
        ...DEFAULTS,
        period: "ultimos-12-meses",
        compare: "anio-pasado",
        service: "recovery",
        granularity: "dia",
      }),
    ).toBe("period=last_12_months&compare=last_year&service=recovery&granularity=day");
    expect(toStatsQuery({ ...DEFAULTS, period: "este-anio", compare: "no" })).toBe(
      "period=this_year&compare=none&service=all",
    );
    expect(toStatsQuery({ ...DEFAULTS, period: "esta-semana" })).toContain("period=this_week");
    expect(toStatsQuery({ ...DEFAULTS, period: "este-mes" })).toContain("period=this_month");
  });

  it("sends from and to with custom dates", () => {
    expect(toStatsQuery({ ...DEFAULTS, period: "fechas", from: "2026-10-01", to: "2026-10-15" })).toBe(
      "period=custom&from=2026-10-01&to=2026-10-15&compare=previous&service=all",
    );
  });
});
