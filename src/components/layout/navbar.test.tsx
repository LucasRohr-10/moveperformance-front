import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

import { Navbar } from "./navbar";

describe("Navbar", () => {
  it("marks itself as the anchor the snackbars sit under", () => {
    const { container } = render(<Navbar links={[]} actions={null} />);

    expect(container.querySelector("header")?.hasAttribute("data-snackbar-anchor")).toBe(true);
  });

  it("marks the link matching the current path as active", () => {
    render(
      <Navbar
        links={[
          { label: "Mi perfil", href: "/dashboard" },
          { label: "Reservar", href: "/bookings" },
        ]}
        actions={null}
      />,
    );

    const active = screen.getAllByRole("link", { name: "Mi perfil" })[0];
    const inactive = screen.getAllByRole("link", { name: "Reservar" })[0];

    expect(active.getAttribute("aria-current")).toBe("page");
    expect(inactive.getAttribute("aria-current")).toBeNull();
  });

  it("renders a custom mobileHeader instead of the default hamburger when provided, without touching the default (no-prop) rendering used by public pages", () => {
    const { container, rerender } = render(
      <Navbar links={[{ label: "Mi perfil", href: "/dashboard" }]} actions={null} />,
    );
    const defaultHeaderClassName = container.querySelector("header")?.className;
    expect(screen.getByLabelText("Open menu")).toBeDefined();

    rerender(
      <Navbar
        links={[{ label: "Mi perfil", href: "/dashboard" }]}
        actions={null}
        mobileHeader={<button type="button">custom mobile header</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "custom mobile header" })).toBeDefined();
    expect(screen.queryByLabelText("Open menu")).toBeNull();
    expect(container.querySelector("header")?.className).not.toBe(defaultHeaderClassName);
  });
});
