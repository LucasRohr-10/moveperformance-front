import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComingSoonSection } from "./coming-soon-section";

describe("ComingSoonSection", () => {
  it("renders the title, the Próximamente tag and the description", () => {
    render(
      <ComingSoonSection
        title="Reservar"
        description="Las reservas están en construcción."
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Reservar" }),
    ).toBeDefined();
    expect(screen.getByText("Próximamente")).toBeDefined();
    expect(
      screen.getByText("Las reservas están en construcción."),
    ).toBeDefined();
  });
});
