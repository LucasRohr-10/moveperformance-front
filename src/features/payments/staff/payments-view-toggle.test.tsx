import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaymentsViewToggle } from "./payments-view-toggle";

describe("PaymentsViewToggle", () => {
  it("marks the current view with aria-pressed", () => {
    const { rerender } = render(<PaymentsViewToggle view="all" toCollectCount={2} />);

    expect(screen.getByRole("group", { name: "Vista de pagos" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Todos" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("link", { name: "Por cobrar · 2" }).getAttribute("aria-pressed")).toBe("false");

    rerender(<PaymentsViewToggle view="to-collect" toCollectCount={2} />);

    expect(screen.getByRole("link", { name: "Todos" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("link", { name: "Por cobrar · 2" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("also marks the current view with aria-current", () => {
    render(<PaymentsViewToggle view="to-collect" toCollectCount={2} />);

    expect(screen.getByRole("link", { name: "Por cobrar · 2" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Todos" }).getAttribute("aria-current")).toBeNull();
  });

  it("links each view to its URL", () => {
    render(<PaymentsViewToggle view="all" toCollectCount={2} />);

    expect(screen.getByRole("link", { name: "Todos" }).getAttribute("href")).toBe("/staff/payments");
    expect(screen.getByRole("link", { name: "Por cobrar · 2" }).getAttribute("href")).toBe(
      "/staff/payments?view=to-collect",
    );
  });

  it("shows the count when known", () => {
    const { rerender } = render(<PaymentsViewToggle view="all" toCollectCount={0} />);
    expect(screen.getByRole("link", { name: "Por cobrar · 0" })).toBeDefined();

    rerender(<PaymentsViewToggle view="all" toCollectCount={null} />);
    expect(screen.getByRole("link", { name: "Por cobrar" })).toBeDefined();
    expect(screen.queryByText(/·/)).toBeNull();
  });
});
