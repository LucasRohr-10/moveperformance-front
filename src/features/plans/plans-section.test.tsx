import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanDto } from "@/lib/api/types";

vi.mock("./get-plans", () => ({ getPlans: vi.fn() }));

import { getPlans } from "./get-plans";
import { PlansList } from "./plans-section";

const getPlansMock = vi.mocked(getPlans);

const plan = (overrides: Partial<PlanDto>): PlanDto => ({
  id: "id",
  service: "performance",
  kind: "period_plan",
  slug: "slug",
  name: "Mensual",
  description: "",
  features: ["Reserva y cancelación online"],
  price: 3900,
  periodMonths: 1,
  periodDays: null,
  sessionsIncluded: null,
  durationMinutes: null,
  featured: false,
  autoDebitEnabled: false,
  ...overrides,
});

describe("PlansList", () => {
  beforeEach(() => {
    getPlansMock.mockReset();
  });

  it("shows each plan with a link to its checkout", async () => {
    getPlansMock.mockResolvedValue([
      plan({ id: "plan-mensual", name: "Mensual" }),
      plan({ id: "plan-trimestral", name: "Trimestral", periodMonths: 3, featured: true }),
    ]);

    render(await PlansList({ service: "performance" }));

    expect(getPlansMock).toHaveBeenCalledWith("performance");
    expect(screen.getByText("Plan Mensual")).toBeDefined();
    expect(screen.getByText("Plan Trimestral")).toBeDefined();
    expect(screen.getByText("Recomendado")).toBeDefined();
    const links = screen.getAllByRole("link", { name: "Contratar" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/checkout/plan/plan-mensual",
      "/checkout/plan/plan-trimestral",
    ]);
    expect(screen.queryByText("Próximamente")).toBeNull();
  });

  it("gives the featured card the primary button and the others the secondary one", async () => {
    getPlansMock.mockResolvedValue([
      plan({ id: "plan-mensual", name: "Mensual" }),
      plan({ id: "plan-trimestral", name: "Trimestral", periodMonths: 3, featured: true }),
    ]);

    render(await PlansList({ service: "performance" }));

    const [regular, featured] = screen.getAllByRole("link", { name: "Contratar" });
    expect(featured.className).toContain("bg-white");
    expect(regular.className).not.toContain("bg-white");
  });

  it("keeps the Coming Soon button for a kind it does not know yet", async () => {
    getPlansMock.mockResolvedValue([
      { ...plan({ id: "1" }), kind: "lifetime" } as unknown as PlanDto,
    ]);

    render(await PlansList({ service: "performance" }));

    expect(screen.getByRole("button", { name: "Contratar" })).toBeDefined();
    expect(screen.getByText("Próximamente")).toBeDefined();
  });

  it("uses the action label of each plan kind", async () => {
    getPlansMock.mockResolvedValue([
      plan({
        id: "1",
        service: "recovery",
        kind: "single_session",
        name: "Sesión individual",
        periodMonths: null,
        durationMinutes: 45,
      }),
    ]);

    render(await PlansList({ service: "recovery" }));

    expect(screen.getByRole("link", { name: "Reservar sesión" }).getAttribute("href")).toBe(
      "/reservar?service=recovery",
    );
  });

  it("says so when there are no plans", async () => {
    getPlansMock.mockResolvedValue([]);

    render(await PlansList({ service: "performance" }));

    expect(screen.getByText("Todavía no hay planes publicados.")).toBeDefined();
  });

  it("shows a message instead of breaking the page when the API is down", async () => {
    getPlansMock.mockRejectedValue(new TypeError("fetch failed"));

    render(await PlansList({ service: "performance" }));

    expect(screen.getByText(/No pudimos cargar los planes/)).toBeDefined();
  });
});
