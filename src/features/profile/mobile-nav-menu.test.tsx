import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

import { MobileNavMenu } from "./mobile-nav-menu";

const links = [
  { label: "Mi perfil", href: "/dashboard" },
  { label: "Reservar", href: "/bookings" },
];

describe("MobileNavMenu", () => {
  it("renders nothing when closed", () => {
    render(<MobileNavMenu id="menu" links={links} isOpen={false} />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("marks the current route as active when open", () => {
    render(<MobileNavMenu id="menu" links={links} isOpen />);

    const active = screen.getByRole("link", { name: "Mi perfil" });
    const inactive = screen.getByRole("link", { name: "Reservar" });

    expect(active.getAttribute("aria-current")).toBe("page");
    expect(inactive.getAttribute("aria-current")).toBeNull();
  });
});
