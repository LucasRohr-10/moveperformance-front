import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ToCollectTodayDto } from "@/lib/api/types";

import { getToCollectToday } from "./get-to-collect-today";
import { nextRedirectError } from "./today-fixtures";
import { ToCollectTodaySection } from "./to-collect-today-section";

vi.mock("./get-to-collect-today");

const getToCollectTodayMock = vi.mocked(getToCollectToday);

// 12:00Z is 09:00 in Montevideo.
const DATA: ToCollectTodayDto = {
  items: [
    {
      chargeId: "ch1",
      client: { id: "c1", name: "Lucía Castro", initials: "LC" },
      service: "rehab",
      startsAt: "2026-11-03T12:00:00.000Z",
      amount: 1200,
      hasAttended: true,
      paysWith: null,
    },
    {
      chargeId: "ch2",
      client: { id: "c2", name: "Sofía Fernández", initials: "SF" },
      service: "recovery",
      startsAt: "2026-11-03T20:30:00.000Z",
      amount: null,
      hasAttended: false,
      paysWith: null,
    },
  ],
  total: 1200,
  withoutAmount: 1,
  clients: 2,
};

describe("ToCollectTodaySection", () => {
  beforeEach(() => {
    getToCollectTodayMock.mockReset();
  });

  it("the Cobrar hoy card links to view=to-collect&dia=hoy", async () => {
    getToCollectTodayMock.mockResolvedValue(DATA);

    render(await ToCollectTodaySection());

    expect(screen.getByRole("link", { name: "Cobrar hoy" }).getAttribute("href")).toBe(
      "/staff/payments?view=to-collect&dia=hoy",
    );
  });

  it("lists today's charges with total and amount dash", async () => {
    getToCollectTodayMock.mockResolvedValue(DATA);

    render(await ToCollectTodaySection());


    expect(screen.getByText("2 clientes · 1 todavía sin monto")).toBeDefined();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("link", { name: "Lucía Castro" }).getAttribute("href")).toBe("/staff/clients/c1");
    expect(rows[0].textContent).toContain("LC");
    expect(rows[0].textContent).toContain("Rehab · 09:00");
    expect(rows[0].textContent).toContain("$ 1.200");
    expect(rows[1].textContent).toContain("Recovery · 17:30");
    expect(within(rows[1]).getByText("—")).toBeDefined();
    // The big number is the total, shown with its exact cents.
    expect(screen.getAllByText("$ 1.200").length).toBeGreaterThanOrEqual(2);
  });

  it("says a turn is paid with the plan the client owes", async () => {
    getToCollectTodayMock.mockResolvedValue({
      ...DATA,
      items: [
        {
          chargeId: "ch-plan",
          client: { id: "c3", name: "Juan Pérez", initials: "JP" },
          service: "performance",
          startsAt: "2026-11-03T22:00:00.000Z",
          amount: 2700,
          hasAttended: false,
          paysWith: { itemName: "Mensual" },
        },
        DATA.items[1],
      ],
    });

    render(await ToCollectTodaySection());

    const rows = screen.getAllByRole("listitem");
    // As the mockup says it; on the narrow card it wraps instead of being cut.
    expect(rows[0].textContent).toContain("19:00 · Turno Performance · se paga con el plan Mensual");
    expect(within(rows[0]).getByText(/se paga con el plan Mensual/).className).not.toContain("truncate");
    expect(rows[0].textContent).toContain("$ 2.700");
    expect(rows[1].textContent).not.toContain("se paga con");
  });

  it("says a turn is paid with the paquete when the client owes a Recovery pack", async () => {
    getToCollectTodayMock.mockResolvedValue({
      ...DATA,
      items: [
        {
          chargeId: "ch-pack",
          client: { id: "c3", name: "Juan Pérez", initials: "JP" },
          service: "recovery",
          startsAt: "2026-11-03T13:00:00.000Z",
          amount: 3240,
          hasAttended: false,
          paysWith: { itemName: "Paquete 4 sesiones" },
        },
      ],
    });

    render(await ToCollectTodaySection());

    expect(screen.getByRole("listitem").textContent).toContain("10:00 · Turno Recovery · se paga con el paquete 4 sesiones");
  });

  it("titles the card with an h2", async () => {
    getToCollectTodayMock.mockResolvedValue(DATA);

    render(await ToCollectTodaySection());

    expect(screen.getByRole("heading", { level: 2, name: "Cobrar hoy" })).toBeDefined();
  });

  it("shows ya vino only for attended", async () => {
    getToCollectTodayMock.mockResolvedValue(DATA);

    render(await ToCollectTodaySection());

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("ya vino")).toBeDefined();
    expect(within(rows[1]).queryByText("ya vino")).toBeNull();
  });

  it("shows the exact cents of the total", async () => {
    getToCollectTodayMock.mockResolvedValue({ ...DATA, total: 1250.5, withoutAmount: 0 });

    render(await ToCollectTodaySection());

    expect(screen.getByText("$ 1.250,50")).toBeDefined();
    expect(screen.getByText("2 clientes")).toBeDefined();
  });

  it("shows the number of clients the API sends, without counting the rows itself", async () => {
    getToCollectTodayMock.mockResolvedValue({ ...DATA, withoutAmount: 0, clients: 1 });

    render(await ToCollectTodaySection());

    expect(screen.getByText("1 cliente")).toBeDefined();
  });

  it("shows a dash instead of $ 0 when no charge of today has a price", async () => {
    getToCollectTodayMock.mockResolvedValue({
      items: [{ ...DATA.items[1], client: DATA.items[0].client }],
      total: 0,
      withoutAmount: 1,
      clients: 1,
    });

    render(await ToCollectTodaySection());

    expect(screen.queryByText("$ 0")).toBeNull();
    const big = screen.getByText("—", { selector: "p.font-display.font-extrabold" });
    expect(big.className).toContain("text-muted");
    expect(screen.getByText("1 cliente · 1 todavía sin monto")).toBeDefined();
  });

  it("shows a row without a client as Cliente sin datos, with no link and no initials", async () => {
    getToCollectTodayMock.mockResolvedValue({
      items: [{ ...DATA.items[0], client: null }],
      total: 1200,
      withoutAmount: 0,
      clients: 1,
    });

    render(await ToCollectTodaySection());

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Cliente sin datos")).toBeDefined();
    expect(within(row).queryByRole("link")).toBeNull();
    expect(row.textContent).not.toContain("LC");
  });

  it("dims the zero and says there is nothing to collect on an empty day", async () => {
    getToCollectTodayMock.mockResolvedValue({ items: [], total: 0, withoutAmount: 0, clients: 0 });

    render(await ToCollectTodaySection());

    expect(screen.getByText("0").className).toContain("text-muted");
    expect(screen.getByText("No hay nada para cobrar hoy ✓")).toBeDefined();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("shows an alert with Reintentar when the API fails", async () => {
    getToCollectTodayMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    render(await ToCollectTodaySection());

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar lo que hay para cobrar hoy");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/staff");
  });

  it("lets a Next error such as a redirect through instead of swallowing it", async () => {
    const redirectError = nextRedirectError();
    getToCollectTodayMock.mockRejectedValue(redirectError);

    await expect(ToCollectTodaySection()).rejects.toBe(redirectError);
  });
});
