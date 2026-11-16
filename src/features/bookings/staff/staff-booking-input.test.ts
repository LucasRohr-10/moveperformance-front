// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { BookableSlot, RehabKind, ServiceType } from "@/lib/api/types";

import { toStaffBookingsInput } from "./staff-booking-input";

function slotOf(id: string, service: ServiceType): BookableSlot {
  return {
    id,
    service,
    startsAt: "2026-11-03T11:00:00.000Z",
    endsAt: "2026-11-03T12:00:00.000Z",
    durationMinutes: 60,
    capacity: 10,
    available: 5,
    isFull: false,
    alreadyBooked: false,
  };
}

describe("toStaffBookingsInput", () => {
  it("sends rehab kind only for Rehab and never an amount", () => {
    const kinds: Record<string, RehabKind> = { r1: "followup" };

    const input = toStaffBookingsInput(
      [slotOf("p1", "performance"), slotOf("r1", "rehab"), slotOf("c1", "recovery")],
      { paymentMethod: "cash" },
      (id) => kinds[id] ?? "evaluation",
    );

    expect(input).toEqual({
      paymentMethod: "cash",
      items: [{ timeSlotId: "p1" }, { timeSlotId: "r1", rehabKind: "followup" }, { timeSlotId: "c1" }],
    });
    expect(JSON.stringify(input)).not.toContain("amount");
  });

  it("keeps the order of the batch and the chosen method", () => {
    const input = toStaffBookingsInput(
      [slotOf("b", "recovery"), slotOf("a", "recovery")],
      { paymentMethod: "undecided" },
      () => "evaluation",
    );

    expect(input.paymentMethod).toBe("undecided");
    expect(input.items.map((item) => item.timeSlotId)).toEqual(["b", "a"]);
  });
});
