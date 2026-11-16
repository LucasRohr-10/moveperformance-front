import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ServiceTabs } from "./service-tabs";

describe("ServiceTabs", () => {
  it("shows each service and marks the selected one", () => {
    render(<ServiceTabs selected="rehab" onSelect={vi.fn()} variant="desktop" />);

    expect(screen.getByRole("tablist", { name: "Servicio" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Rehab" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Recovery" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.getByRole("tab", { name: "Performance" })).toBeDefined();
  });

  it("selects the tab that is clicked, in either layout", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ServiceTabs selected="recovery" onSelect={onSelect} variant="mobile" />);

    await user.click(screen.getByRole("tab", { name: "Performance" }));

    expect(onSelect).toHaveBeenCalledWith("performance");
  });

  it("moves with the arrow keys, wrapping around, and Home and End", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ServiceTabs selected="performance" onSelect={onSelect} variant="desktop" />);

    screen.getByRole("tab", { name: "Performance" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenLastCalledWith("recovery");

    await user.keyboard("{ArrowLeft}");
    expect(onSelect).toHaveBeenLastCalledWith("performance");

    await user.keyboard("{Home}");
    expect(onSelect).toHaveBeenLastCalledWith("recovery");

    await user.keyboard("{End}");
    expect(onSelect).toHaveBeenLastCalledWith("performance");
  });
});
