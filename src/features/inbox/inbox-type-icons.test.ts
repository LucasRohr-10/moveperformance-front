import { describe, expect, it } from "vitest";

import { inboxIconFor } from "./inbox-type-icons";

describe("inboxIconFor", () => {
  it("icon follows the type tone, with a warning ! for a staff cancellation", () => {
    expect(inboxIconFor("booking_cancelled_by_staff")).toEqual({ tone: "warning", glyph: "!" });
    expect(inboxIconFor("booking_hold_expired")).toEqual({ tone: "warning", glyph: "!" });
    expect(inboxIconFor("auto_debit_cancelled")).toEqual({ tone: "warning", glyph: "!" });
    expect(inboxIconFor("payment_declined")).toEqual({ tone: "danger", glyph: "!" });
    expect(inboxIconFor("payment_approved_later")).toEqual({ tone: "success", glyph: "✓" });
    expect(inboxIconFor("auto_debit_charged")).toEqual({ tone: "success", glyph: "✓" });
    expect(inboxIconFor("announcement")).toEqual({ tone: "info", glyph: "i" });
  });

  it("unknown type falls back to info", () => {
    expect(inboxIconFor("something_new")).toEqual({ tone: "info", glyph: "i" });
  });
});
