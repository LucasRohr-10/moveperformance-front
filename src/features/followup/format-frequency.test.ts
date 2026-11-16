import { describe, expect, it } from "vitest";

import { formatFrequency } from "./format-frequency";

describe("formatFrequency", () => {
  it("writes the decimal with a comma", () => {
    expect(formatFrequency(2.5)).toBe("2,5");
  });

  it("keeps whole numbers whole", () => {
    expect(formatFrequency(3)).toBe("3");
    expect(formatFrequency(0)).toBe("0");
  });

  it("rounds to one decimal", () => {
    expect(formatFrequency(2.333)).toBe("2,3");
  });
});
