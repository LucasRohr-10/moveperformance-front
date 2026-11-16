import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { MobileDropdownPanel } from "./mobile-dropdown-panel";

describe("MobileDropdownPanel", () => {
  it("renders children inside a fixed, focusable panel at the given position", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <MobileDropdownPanel ref={ref} position="left-3 right-3" role="dialog" aria-label="Panel">
        <p>content</p>
      </MobileDropdownPanel>,
    );

    const panel = screen.getByRole("dialog", { name: "Panel" });
    expect(panel.className).toContain("fixed");
    expect(panel.className).toContain("left-3");
    expect(panel.className).toContain("right-3");
    expect(panel.getAttribute("tabIndex")).toBe("-1");
    expect(ref.current).toBe(panel);
  });
});
