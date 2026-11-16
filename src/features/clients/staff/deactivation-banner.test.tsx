import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeactivationBanner } from "./deactivation-banner";

const AT = "2026-11-02T13:00:00.000Z";

describe("DeactivationBanner", () => {
  it("shows the date, who did it and the reason", () => {
    render(
      <DeactivationBanner
        deactivation={{ deactivatedAt: AT, deactivatedByName: "Valentina Velásquez", reason: "Se mudó" }}
      />,
    );

    expect(screen.getByText("Dado de baja el 02/11/2026 por Valentina Velásquez · Se mudó")).toBeDefined();
  });

  it("leaves out the author when the back does not know it", () => {
    render(<DeactivationBanner deactivation={{ deactivatedAt: AT, deactivatedByName: null, reason: "Se mudó" }} />);

    expect(screen.getByText("Dado de baja el 02/11/2026 · Se mudó")).toBeDefined();
  });

  it("leaves out the reason when there is none", () => {
    render(
      <DeactivationBanner
        deactivation={{ deactivatedAt: AT, deactivatedByName: "Valentina Velásquez", reason: null }}
      />,
    );

    expect(screen.getByText("Dado de baja el 02/11/2026 por Valentina Velásquez")).toBeDefined();
  });
});
