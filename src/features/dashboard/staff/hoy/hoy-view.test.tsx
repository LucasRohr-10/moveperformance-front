import { render, screen } from "@testing-library/react";
import { use } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HoyView } from "./hoy-view";

// Each section is a stub that can be told to stay loading, to see that the others do not wait for it.
const loading = new Set<string>();

function Section({ name }: { name: string }) {
  if (loading.has(name)) use(new Promise<never>(() => {}));
  return <div>{name}</div>;
}

vi.mock("./birthday-today-card", () => ({ BirthdayTodayCard: () => <Section name="birthday" /> }));
vi.mock("./hoy-tiles-section", () => ({ HoyTilesSection: () => <Section name="tiles" /> }));
vi.mock("./to-collect-today-section", () => ({ ToCollectTodaySection: () => <Section name="collect" /> }));

const SECTIONS = ["birthday", "tiles", "collect"] as const;

describe("HoyView", () => {
  beforeEach(() => {
    loading.clear();
  });

  it.each(SECTIONS)("renders birthday, tiles and Cobrar hoy each in its own boundary: %s still loading", (slow) => {
    loading.add(slow);

    render(<HoyView />);

    for (const section of SECTIONS) {
      if (section === slow) expect(screen.queryByText(section)).toBeNull();
      else expect(screen.getByText(section)).toBeDefined();
    }
  });

  it("announces the loading once for the whole view, not once per part", () => {
    for (const section of SECTIONS) loading.add(section);

    render(<HoyView />);

    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("announces nothing once everything has loaded", () => {
    render(<HoyView />);

    expect(screen.queryByRole("status")).toBeNull();
    for (const section of SECTIONS) expect(screen.getByText(section)).toBeDefined();
  });
});
