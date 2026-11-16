import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("pulses and stays out of the accessibility tree", () => {
    const { container } = render(<Skeleton />);
    const block = container.firstElementChild as HTMLElement;

    expect(block.className).toContain("animate-pulse");
    expect(block.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes the shape of the content it replaces", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const block = container.firstElementChild as HTMLElement;

    expect(block.className).toContain("h-4");
    expect(block.className).toContain("w-32");
  });

  it("builds a table-shaped loading state announced by its container", () => {
    render(
      <div role="status" aria-label="Cargando planes">
        {[0, 1, 2].map((row) => (
          <div key={row}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>,
    );

    const status = screen.getByRole("status", { name: "Cargando planes" });

    expect(status.querySelectorAll("[aria-hidden='true']")).toHaveLength(6);
  });
});
