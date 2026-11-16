import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OwesBadge } from "./owes-badge";

describe("OwesBadge", () => {
  it("says Falta pagar and links to the given href", () => {
    render(<OwesBadge href="/staff/payments/offline-charges/ch1" />);

    const link = screen.getByRole("link", { name: "Falta pagar" });
    expect(link.getAttribute("href")).toBe("/staff/payments/offline-charges/ch1");
    expect(link.innerHTML).toContain("text-danger");
  });

  it("is a 44px touch target on mobile", () => {
    render(<OwesBadge href="/staff/payments/offline-charges/ch1" />);

    const classes = screen.getByRole("link", { name: "Falta pagar" }).className.split(" ");
    expect(classes).toEqual(expect.arrayContaining(["inline-flex", "min-h-11", "items-center", "md:min-h-0"]));
  });
});
