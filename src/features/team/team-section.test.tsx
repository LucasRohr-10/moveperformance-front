import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TEAM_MEMBERS } from "./team-data";
import { TeamSection } from "./team-section";

describe("TeamSection", () => {
  it("shows the section label and heading", () => {
    render(<TeamSection label="02 — Equipo" />);

    expect(screen.getByText("02 — Equipo")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("El equipo detrás de MOVE.");
  });

  it("lists every member's name, role, photo and specialties", () => {
    render(<TeamSection label="02 — Equipo" />);

    for (const member of TEAM_MEMBERS) {
      expect(screen.getAllByRole("heading", { level: 3, name: member.name }).length).toBeGreaterThan(0);
      expect(screen.getAllByText(member.role).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("img", { name: member.photo.alt }).length).toBeGreaterThan(0);
      for (const specialty of member.specialties) {
        expect(screen.getAllByText(specialty).length).toBeGreaterThan(0);
      }
    }
  });

  it("starts with every row collapsed in the mobile accordion", () => {
    render(<TeamSection label="02 — Equipo" />);

    for (const member of TEAM_MEMBERS) {
      const button = screen.getByRole("button", { name: new RegExp(member.name, "i") });
      expect(button.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("expands one row at a time on click", async () => {
    const user = userEvent.setup();
    render(<TeamSection label="02 — Equipo" />);
    const [first, second] = TEAM_MEMBERS;

    const firstButton = screen.getByRole("button", { name: new RegExp(first.name, "i") });
    const secondButton = screen.getByRole("button", { name: new RegExp(second.name, "i") });

    await user.click(firstButton);
    expect(firstButton.getAttribute("aria-expanded")).toBe("true");

    await user.click(secondButton);
    expect(secondButton.getAttribute("aria-expanded")).toBe("true");
    expect(firstButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("truncates each card's bio behind a 'Ver más' toggle that expands it", async () => {
    const user = userEvent.setup();
    render(<TeamSection label="02 — Equipo" />);
    const [first] = TEAM_MEMBERS;

    const toggles = screen.getAllByRole("button", { name: "Ver más" });
    expect(toggles.length).toBe(TEAM_MEMBERS.length);

    const firstToggle = toggles[0];
    expect(firstToggle.getAttribute("aria-expanded")).toBe("false");

    await user.click(firstToggle);
    expect(screen.getAllByRole("button", { name: "Ver menos" })[0].getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByText(first.bio).length).toBeGreaterThan(0);
  });
});
