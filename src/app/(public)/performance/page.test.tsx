import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/plans", () => ({
  PlanPriceRows: ({ service }: { service: string }) => (
    <div data-testid="plan-price-rows" data-service={service} />
  ),
}));

import PerformancePage from "./page";

describe("PerformancePage", () => {
  it("links to the public booking page for performance", () => {
    render(<PerformancePage />);

    expect(screen.getByRole("link", { name: "Ver horarios y reservar" }).getAttribute("href")).toBe(
      "/reservar?service=performance",
    );
  });

  it("renders the hero heading", () => {
    render(<PerformancePage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Entrenamientosemi personalizado.",
    );
  });

  it("shows the Performance plans from the catalog", () => {
    render(<PerformancePage />);

    expect(screen.getByTestId("plan-price-rows").getAttribute("data-service")).toBe("performance");
  });
});
