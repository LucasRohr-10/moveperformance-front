import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { parseDashboardParams } from "../../dashboard-params";
import { nextRedirectError } from "../../hoy/today-fixtures";
import { getSlotsStats } from "./get-slots-stats";
import { SLOTS_STATS } from "./slots-fixtures";
import { TurnosSection } from "./turnos-section";

vi.mock("./get-slots-stats");

vi.mock("recharts", () => import("../charts/fixed-size-recharts").then((module) => module.fixedSizeRecharts()));

const getSlotsStatsMock = vi.mocked(getSlotsStats);
const PARAMS = parseDashboardParams({ vista: "negocio", tab: "turnos" });

beforeEach(() => {
  getSlotsStatsMock.mockReset();
});

describe("TurnosSection", () => {
  it("asks the API with what the URL says", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);
    const params = parseDashboardParams({ vista: "negocio", tab: "turnos", periodo: "este-anio", servicio: "rehab" });

    render(await TurnosSection({ params }));

    expect(getSlotsStatsMock).toHaveBeenCalledWith(params);
  });

  it("opens with the period note and the question", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    expect(screen.getByText("1 oct – 31 oct · comparado con 1 sep – 30 sep · Datos de turnos desde 12 mar 2026 (el primer turno)")).toBeDefined();
    expect(screen.getByRole("heading", { name: "¿Usamos bien los turnos que abrimos?" })).toBeDefined();
  });

  it("names the service in the question when the filter is on", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: parseDashboardParams({ vista: "negocio", tab: "turnos", servicio: "rehab" }) }));

    expect(screen.getByRole("heading", { name: "¿Usamos bien los turnos que abrimos? · Rehab" })).toBeDefined();
  });

  it("shows occupancy and attendance as the percentage the API sent, with how they moved in points", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const occupancy = screen.getByRole("heading", { name: "Ocupación" }).closest("article")!;
    expect(within(occupancy).getByText("74%")).toBeDefined();
    expect(within(occupancy).getByText("▼ 1 pts")).toBeDefined();
    const attendance = screen.getByRole("heading", { name: "Asistencia" }).closest("article")!;
    expect(within(attendance).getByText("90%")).toBeDefined();
    expect(within(attendance).getByText("▲ 1 pts")).toBeDefined();
  });

  it("the info of Asistencia says only marked bookings count", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));
    await userEvent.click(screen.getByRole("button", { name: "Qué significa Asistencia" }));

    expect(screen.getByText(/reservas ya marcadas \(presente o ausente\) de turnos que ya empezaron/)).toBeDefined();
  });

  it("occupancy says how many seats were booked of how many were offered, as the API counted them", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const occupancy = screen.getByRole("heading", { name: "Ocupación" }).closest("article")!;
    expect(within(occupancy).getByText("280 de 380 cupos")).toBeDefined();
  });

  it("cancellations are good news when they go down, and warn about the same-day ones", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const cancellations = screen.getByRole("heading", { name: "Cancelaciones" }).closest("article")!;
    expect(within(cancellations).getByText("23")).toBeDefined();
    expect(within(cancellations).getByText("8 el mismo día").className).toContain("text-warning");
    expect(within(cancellations).getByText("▼ 15%").className).toContain("text-success");
  });

  it("says sin datos para comparar and never prints NaN when the comparison has no data", async () => {
    getSlotsStatsMock.mockResolvedValue({
      ...SLOTS_STATS,
      meta: { ...SLOTS_STATS.meta, comparison: { ...SLOTS_STATS.meta.comparison!, hasData: false } },
      occupancy: { ...SLOTS_STATS.occupancy, previous: null, change: null },
      attendance: { current: 0.9, previous: null, change: null, changeUnit: "points" },
      cancellations: { current: 23, previous: null, change: null, changeUnit: "percent" },
    });

    render(await TurnosSection({ params: PARAMS }));

    expect(screen.getAllByText("sin datos para comparar")).toHaveLength(3);
    expect(screen.queryByText(/NaN|Infinity/)).toBeNull();
  });

  it("shows a dash, not 0%, for a ratio with nothing offered", async () => {
    getSlotsStatsMock.mockResolvedValue({
      ...SLOTS_STATS,
      occupancy: { current: null, previous: null, change: null, changeUnit: "points", booked: 0, offered: 0 },
    });

    render(await TurnosSection({ params: PARAMS }));

    const occupancy = screen.getByRole("heading", { name: "Ocupación" }).closest("article")!;
    expect(within(occupancy).getAllByText("—").length).toBeGreaterThan(0);
    expect(within(occupancy).getByText("0 de 0 cupos")).toBeDefined();
    expect(within(occupancy).queryByText(/NaN|Infinity|^0%$/)).toBeNull();
  });

  it("cancellations card lists reasons with same-day counts", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const card = screen.getByRole("heading", { name: "Quién cancela" }).closest("section")!;
    for (const label of [
      "Las canceló el cliente",
      "Las canceló el staff",
      "El estudio cerró el turno",
      "Baja del cliente",
      "Staff (sin detalle)",
    ]) {
      expect(within(card).getByText(label)).toBeDefined();
    }
    const client = within(card).getByText("Las canceló el cliente").closest("li")!;
    expect(within(client).getByText("15")).toBeDefined();
    expect(within(client).getByText("6 el mismo día")).toBeDefined();
    const unknown = within(card).getByText("Staff (sin detalle)").closest("li")!;
    expect(within(unknown).getByText("1 el mismo día")).toBeDefined();
  });

  it("Qué pasó con los cupos shows, per service, what the API counted and lists a legend", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const card = screen.getByRole("heading", { name: "Qué pasó con los cupos" }).closest("section")!;
    const performance = within(card).getByRole("img", {
      name: "Performance, de 200 cupos: 120 vinieron, 12 no vinieron, 6 sin marcar, 0 por venir y 62 libres",
    });
    expect(performance).toBeDefined();
    const legend = within(card).getByRole("list", { name: "Referencias del gráfico" });
    for (const word of ["Vinieron", "No vinieron", "Sin marcar", "Por venir", "Libres"]) expect(legend.textContent).toContain(word);
    expect(within(card).getAllByText("Rehab").length).toBeGreaterThan(0);
    expect(within(card).getAllByText("Recovery").length).toBeGreaterThan(0);
    // The table with the same counts, for whoever cannot read the bar.
    expect(within(card).getByRole("table", { name: "Qué pasó con los cupos" })).toBeDefined();
  });

  it("the bar has a Por venir part with the API count", async () => {
    getSlotsStatsMock.mockResolvedValue({
      ...SLOTS_STATS,
      seats: SLOTS_STATS.seats.map((row) => (row.service === "performance" ? { ...row, booked: 146, upcoming: 8, free: 54 } : row)),
    });

    render(await TurnosSection({ params: PARAMS }));

    const card = screen.getByRole("heading", { name: "Qué pasó con los cupos" }).closest("section")!;
    const performance = within(card).getByRole("img", { name: /^Performance, de 200 cupos/ });
    expect(within(performance).getByTitle("Por venir: 8 cupos")).toBeDefined();
    const legend = within(card).getByRole("list", { name: "Referencias del gráfico" });
    expect(legend.textContent).toContain("Por venir");
    const table = within(card).getByRole("table", { name: "Qué pasó con los cupos" });
    expect(within(table).getByRole("columnheader", { name: "Por venir" })).toBeDefined();
  });

  it("the written line adds up with the API numbers: 120 vinieron · 12 no vinieron · 6 sin marcar · 8 por venir · 54 libres", async () => {
    getSlotsStatsMock.mockResolvedValue({
      ...SLOTS_STATS,
      seats: SLOTS_STATS.seats.map((row) => (row.service === "performance" ? { ...row, booked: 146, upcoming: 8, free: 54 } : row)),
    });

    render(await TurnosSection({ params: PARAMS }));

    const performance = screen.getByRole("img", {
      name: "Performance, de 200 cupos: 120 vinieron, 12 no vinieron, 6 sin marcar, 8 por venir y 54 libres",
    });
    expect(within(performance.parentElement!).getByText("120 vinieron · 12 no vinieron · 6 sin marcar · 8 por venir · 54 libres")).toBeDefined();
  });

  it("a row with upcoming 0 draws no Por venir part", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const performance = screen.getByRole("img", { name: /^Performance, de 200 cupos/ });
    expect(within(performance).queryByTitle(/Por venir/)).toBeNull();
  });

  it("Qué pasó con los cupos writes the occupancy the API sent next to each service, and how many seats were booked", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const performance = screen.getByRole("img", { name: /^Performance, de 200 cupos/ }).parentElement!;
    expect(within(performance).getByText("75%")).toBeDefined();
    expect(within(performance).getByText("150 de 200 cupos")).toBeDefined();
    const recovery = screen.getByRole("img", { name: /^Recovery, de 80 cupos/ }).parentElement!;
    expect(within(recovery).getByText("69%")).toBeDefined();
  });

  it("Qué pasó con los cupos shows a dash, not 0%, for a service with nothing offered", async () => {
    getSlotsStatsMock.mockResolvedValue({
      ...SLOTS_STATS,
      seats: SLOTS_STATS.seats.map((row) =>
        row.service === "recovery" ? { ...row, offered: 0, booked: 0, occupancy: null, attended: 0, notAttended: 0, unmarked: 0, upcoming: 0, free: 0 } : row,
      ),
    });

    render(await TurnosSection({ params: PARAMS }));

    const card = screen.getByRole("heading", { name: "Qué pasó con los cupos" }).closest("section")!;
    const recovery = screen.getByRole("img", { name: /^Recovery, de 0 cupos/ }).parentElement!;
    expect(within(recovery).getByText("—")).toBeDefined();
    expect(within(recovery).getByText("0 de 0 cupos")).toBeDefined();
    expect(card.textContent).not.toMatch(/NaN|Infinity/);
  });

  it("draws no sliver for a part with 0 seats", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const rehab = screen.getByRole("img", { name: /^Rehab, de 100 cupos/ });
    // Rehab has 0 sin marcar: three segments, not four.
    expect(rehab.children).toHaveLength(3);
    expect(screen.getByRole("img", { name: /^Performance, de 200 cupos/ }).children).toHaveLength(4);
  });

  it("keeps only the service of the filter in the seats", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: parseDashboardParams({ vista: "negocio", tab: "turnos", servicio: "rehab" }) }));

    const card = screen.getByRole("heading", { name: "Qué pasó con los cupos" }).closest("section")!;
    expect(within(card).queryByText("Performance")).toBeNull();
    expect(within(card).getAllByText("Rehab").length).toBeGreaterThan(0);
  });

  it("Horarios más concurridos starts by hour with its data table, and switches to the heatmap", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));
    const card = screen.getByRole("heading", { name: "Horarios más concurridos" }).closest("section")!;

    expect(within(card).getByRole("radio", { name: "Por hora" }).getAttribute("aria-checked")).toBe("true");
    expect(await within(card).findByRole("img", { name: /Reservas por hora/ })).toBeDefined();
    const byHour = within(card).getByRole("table", { name: "Reservas por hora" });
    expect(within(byHour).queryByText("07:00")).toBeNull();
    expect(within(byHour).getByText("18:00")).toBeDefined();
    expect(within(card).queryByRole("table", { name: "Ocupación por día y hora" })).toBeNull();

    await userEvent.click(within(card).getByRole("radio", { name: "Día y hora" }));

    expect(within(card).getByRole("table", { name: "Ocupación por día y hora" })).toBeDefined();
  });

  it("the table of hours has the total the API sent for each hour, and no total when one service is drawn", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    const { unmount } = render(await TurnosSection({ params: PARAMS }));

    const byHour = screen.getByRole("table", { name: "Reservas por hora" });
    expect(within(byHour).getByRole("columnheader", { name: "Total" })).toBeDefined();
    expect(within(within(byHour).getByText("08:00").closest("tr")!).getByText("40")).toBeDefined();
    expect(within(within(byHour).getByText("18:00").closest("tr")!).getByText("70")).toBeDefined();
    unmount();

    render(await TurnosSection({ params: parseDashboardParams({ vista: "negocio", tab: "turnos", servicio: "recovery" }) }));
    expect(within(screen.getByRole("table", { name: "Reservas por hora" })).queryByRole("columnheader", { name: "Total" })).toBeNull();
  });

  it("leaves a service out of the hours when the filter picks another", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: parseDashboardParams({ vista: "negocio", tab: "turnos", servicio: "recovery" }) }));

    const byHour = screen.getByRole("table", { name: "Reservas por hora" });
    expect(within(byHour).getByRole("columnheader", { name: "Recovery" })).toBeDefined();
    expect(within(byHour).queryByRole("columnheader", { name: "Performance" })).toBeNull();
  });

  it("keeps its cards inside the phone width: one shrinkable column, so the wide heatmap scrolls in its card", async () => {
    getSlotsStatsMock.mockResolvedValue(SLOTS_STATS);

    render(await TurnosSection({ params: PARAMS }));

    const cards = screen.getByRole("heading", { name: "Horarios más concurridos" }).closest("section")!.parentElement!;
    expect(cards.className).toContain("min-w-0");
    expect(cards.parentElement!.className).toContain("grid-cols-1");
  });

  it("shows an alert with Reintentar when the stats fail, and the range error without it", async () => {
    getSlotsStatsMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    const { unmount } = render(await TurnosSection({ params: PARAMS }));
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("No pudimos cargar los turnos")).toBeDefined();
    expect(within(alert).getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/staff?vista=negocio&tab=turnos");
    unmount();

    getSlotsStatsMock.mockRejectedValue(new ApiError({ statusCode: 400, code: "DASHBOARD_INVALID_RANGE", message: "x" }));
    render(await TurnosSection({ params: PARAMS }));
    expect(screen.queryByRole("link", { name: "Reintentar" })).toBeNull();
    expect(screen.getByText("Ese rango de fechas no es válido.")).toBeDefined();
  });

  it("rethrows Next control-flow errors instead of showing the alert", async () => {
    getSlotsStatsMock.mockRejectedValue(nextRedirectError());

    await expect(TurnosSection({ params: PARAMS })).rejects.toBeDefined();
  });
});
