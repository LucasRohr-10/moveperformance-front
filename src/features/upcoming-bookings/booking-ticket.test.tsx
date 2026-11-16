import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingTicket } from "./booking-ticket";
import { rowOf } from "./test-rows";

describe("BookingTicket", () => {
  it("summarises the booking by date, service, time and duration, without its label", () => {
    render(<BookingTicket row={rowOf()} />);

    expect(screen.getByText("SÁB")).toBeDefined();
    expect(screen.getByText("24")).toBeDefined();
    expect(screen.getByText("OCT")).toBeDefined();
    expect(screen.getByText("Recovery")).toBeDefined();
    expect(screen.getByText("10:30")).toBeDefined();
    expect(screen.getByText("45 min")).toBeDefined();
    expect(screen.queryByText("Sesión Recovery · 45 min")).toBeNull();
  });
});
