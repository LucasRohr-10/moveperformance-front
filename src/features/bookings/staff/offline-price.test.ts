// @vitest-environment node
import { describe, expect, it } from "vitest";

import { type OfflinePrices, offlinePriceFor, toOfflinePrices } from "./offline-price";

const PRICES: OfflinePrices = {
  rehabEvaluation: 1800,
  rehabFollowup: 1200,
  recoverySession: 900,
  performanceClass: 700,
};

describe("offlinePriceFor", () => {
  it("takes Rehab's price from its kind", () => {
    expect(offlinePriceFor(PRICES, "rehab", "evaluation")).toBe(1800);
    expect(offlinePriceFor(PRICES, "rehab", "followup")).toBe(1200);
  });

  it("takes Recovery's and Performance's price without a kind", () => {
    expect(offlinePriceFor(PRICES, "recovery", null)).toBe(900);
    expect(offlinePriceFor(PRICES, "performance", null)).toBe(700);
  });

  it("ignores a kind outside Rehab", () => {
    expect(offlinePriceFor(PRICES, "recovery", "followup")).toBe(900);
  });

  it("treats Rehab without a kind as an evaluation", () => {
    expect(offlinePriceFor(PRICES, "rehab", null)).toBe(1800);
  });

  it("gives null when Configuración has no price for it", () => {
    const empty: OfflinePrices = { rehabEvaluation: null, rehabFollowup: null, recoverySession: null, performanceClass: null };

    expect(offlinePriceFor(empty, "rehab", "evaluation")).toBeNull();
    expect(offlinePriceFor(empty, "recovery", null)).toBeNull();
    expect(offlinePriceFor(empty, "performance", null)).toBeNull();
  });
});

describe("toOfflinePrices", () => {
  it("builds the four prices from the settings", () => {
    expect(
      toOfflinePrices({
        offlinePriceRehabEvaluation: 1800,
        offlinePriceRehabFollowup: 1200,
        offlinePriceRecoverySession: null,
        offlinePricePerformanceClass: 700,
      }),
    ).toEqual({ rehabEvaluation: 1800, rehabFollowup: 1200, recoverySession: null, performanceClass: 700 });
  });

  it("gives every price as null without settings", () => {
    expect(toOfflinePrices(null)).toEqual({
      rehabEvaluation: null,
      rehabFollowup: null,
      recoverySession: null,
      performanceClass: null,
    });
  });
});
