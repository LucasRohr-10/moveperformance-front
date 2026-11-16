import { describe, expect, it } from "vitest";

import { firstParam } from "./first-param";

describe("firstParam", () => {
  it("returns a plain value as it is", () => {
    expect(firstParam("ref-1")).toBe("ref-1");
  });

  it("reads a repeated parameter as its first element", () => {
    expect(firstParam(["ref-1", "ref-2"])).toBe("ref-1");
  });

  it("returns undefined for a missing parameter or an empty list", () => {
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam([])).toBeUndefined();
  });
});
