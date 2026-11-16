import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { nextRedirectError, SUMMARY } from "./today-fixtures";
import { getTodaySummary } from "./get-today-summary";
import { HoyTilesSection } from "./hoy-tiles-section";

vi.mock("./get-today-summary");

const getTodaySummaryMock = vi.mocked(getTodaySummary);

describe("HoyTilesSection", () => {
  beforeEach(() => {
    getTodaySummaryMock.mockReset();
  });

  it("renders the five tiles in order with links to their pages", async () => {
    getTodaySummaryMock.mockResolvedValue(SUMMARY);

    render(await HoyTilesSection());

    const links = screen.getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Asistencia sin marcar", "/staff/schedule"],
      ["Pagos para revisar", "/staff/payments?needsAttention=true"],
      ["Vencen pronto", "/staff/clients?vence=pronto"],
      ["Cobros atrasados", "/staff/payments?view=to-collect&atrasados=true"],
      ["Clientes en riesgo", "/staff/follow-up?riesgo=true"],
    ]);
    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.getByText("23")).toBeDefined();
  });

  it("shows an alert with Reintentar when the API fails", async () => {
    getTodaySummaryMock.mockRejectedValue(new ApiError({ statusCode: 500, code: "INTERNAL", message: "x" }));

    render(await HoyTilesSection());

    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar el resumen de hoy");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/staff");
  });

  it("lets a Next error such as a redirect through instead of swallowing it", async () => {
    const redirectError = nextRedirectError();
    getTodaySummaryMock.mockRejectedValue(redirectError);

    await expect(HoyTilesSection()).rejects.toBe(redirectError);
  });
});
