import { describe, expect, it } from "vitest";

import { discountedPrice } from "./offline-price";

describe("discountedPrice", () => {
  it("takes the percent off a whole price", () => {
    expect(discountedPrice(3000, 10)).toBe(2700);
  });

  it("rounds to the cent", () => {
    expect(discountedPrice(1234.56, 15)).toBe(1049.38);
  });

  it("works in whole cents, so an exact half cent never rounds down by float error", () => {
    expect(discountedPrice(0.29, 50)).toBe(0.15);
    expect(discountedPrice(0.35, 10)).toBe(0.32);
  });

  it("keeps the price when there is no discount", () => {
    expect(discountedPrice(800, null)).toBe(800);
  });

  it("is free at 100%", () => {
    expect(discountedPrice(800, 100)).toBe(0);
  });
});
