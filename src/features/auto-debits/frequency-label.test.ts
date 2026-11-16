import { describe, expect, it } from "vitest";

import { frequencyLabel } from "./frequency-label";

describe("frequencyLabel", () => {
  it.each([
    [1, "months", "cada mes"],
    [3, "months", "cada 3 meses"],
    [30, "days", "cada 30 días"],
  ] as const)("says %i %s as %s", (frequency, type, label) => {
    expect(frequencyLabel(frequency, type)).toBe(label);
  });
});
