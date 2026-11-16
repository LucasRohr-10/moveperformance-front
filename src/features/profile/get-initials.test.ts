import { describe, expect, it } from "vitest";

import { getInitials } from "./get-initials";

describe("getInitials", () => {
  it("takes the first letter of the first and last word", () => {
    expect(getInitials("Ana Perez")).toBe("AP");
  });

  it("collapses extra whitespace and still uses first + last word", () => {
    expect(getInitials("  Ana   Maria   Perez  ")).toBe("AP");
  });

  it("falls back to a single initial for a one-word name", () => {
    expect(getInitials("Ana")).toBe("A");
  });

  it("returns an empty string for an empty name", () => {
    expect(getInitials("")).toBe("");
  });

  it("uppercases lowercase names", () => {
    expect(getInitials("ana perez")).toBe("AP");
  });
});
