import { describe, expect, it } from "vitest";

import { parseServiceType } from "./types";

describe("parseServiceType", () => {
  it("accepts a valid service type", () => {
    expect(parseServiceType("rehab")).toBe("rehab");
  });

  it("rejects anything else, including undefined and garbage input", () => {
    expect(parseServiceType(undefined)).toBeUndefined();
    expect(parseServiceType("")).toBeUndefined();
    expect(parseServiceType("<script>alert(1)</script>")).toBeUndefined();
  });
});
