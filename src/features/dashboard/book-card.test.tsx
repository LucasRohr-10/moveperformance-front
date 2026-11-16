import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookCard } from "./book-card";

describe("BookCard", () => {
  it("links each service to the private bookings page with that service selected", () => {
    render(<BookCard />);

    expect(screen.getByText("Reservar")).toBeDefined();
    expect(screen.getByRole("link", { name: /Performance/ }).getAttribute("href")).toBe("/bookings?service=performance");
    expect(screen.getByRole("link", { name: /Recovery/ }).getAttribute("href")).toBe("/bookings?service=recovery");
    expect(screen.getByRole("link", { name: /Fisioterapia/ }).getAttribute("href")).toBe("/bookings?service=rehab");
  });
});
