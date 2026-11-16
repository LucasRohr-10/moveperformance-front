import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/plans", () => ({
  PlanPriceRows: ({ service }: { service: string }) => (
    <div data-testid="plan-price-rows" data-service={service} />
  ),
}));

import RecoveryPage from "./page";

describe("RecoveryPage", () => {
  it("links to the public booking page for recovery", () => {
    render(<RecoveryPage />);

    expect(screen.getByRole("link", { name: "Ver horarios y reservar" }).getAttribute("href")).toBe(
      "/reservar?service=recovery",
    );
  });

  it("renders the hero heading", () => {
    render(<RecoveryPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Recuperámás rápido.");
  });

  it("shows the Recovery plans from the catalog", () => {
    render(<RecoveryPage />);

    expect(screen.getByTestId("plan-price-rows").getAttribute("data-service")).toBe("recovery");
  });
});
