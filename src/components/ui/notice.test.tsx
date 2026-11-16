import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Notice } from "./notice";

describe("Notice", () => {
  it("has an info tone", () => {
    render(<Notice tone="info">Dato</Notice>);

    expect(screen.getByRole("status").className).toContain("border-info/30");
    expect(screen.getByRole("status").className).toContain("bg-info/10");
    expect(screen.getByRole("status").className).toContain("text-info");
  });

  it("shows a spinner instead of the tone icon while waiting", () => {
    render(
      <Notice tone="info" busy>
        Estamos esperando la confirmación de Mercado Pago.
      </Notice>,
    );

    const notice = screen.getByRole("status");
    expect(screen.getByTestId("notice-spinner")).toBeDefined();
    expect(notice.querySelector("svg")).toBeNull();
    expect(notice.getAttribute("aria-busy")).toBe("true");
  });

  it("is not busy by default", () => {
    render(<Notice tone="warning">Aviso</Notice>);

    expect(screen.queryByTestId("notice-spinner")).toBeNull();
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBeNull();
  });
});
