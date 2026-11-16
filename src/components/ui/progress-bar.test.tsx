import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it("exposes its value to assistive technology and fills the track", () => {
    render(
      <ProgressBar percent={63} label="Progreso del período" valueText="34 días restantes" />,
    );

    const bar = screen.getByRole("progressbar", { name: "Progreso del período" });

    expect(bar.getAttribute("aria-valuenow")).toBe("63");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe("34 días restantes");
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("63%");
  });
});
