import { describe, expect, it } from "vitest";

import type { MetricValueDto, StatsMetaDto } from "@/lib/api/types";

import { COMPARE_PARAMS, type CompareParam } from "../dashboard-params";
import { formatChange } from "./format-change";

const WITH_DATA: StatsMetaDto["comparison"] = { from: "2026-09-01", to: "2026-09-30", inProgress: false, hasData: true };
const NO_DATA: StatsMetaDto["comparison"] = { ...WITH_DATA!, hasData: false };

const metric = (overrides: Partial<MetricValueDto>): MetricValueDto => ({
  current: 100,
  previous: 90,
  change: 11,
  changeUnit: "percent",
  ...overrides,
});

const change = (
  m: MetricValueDto,
  comparison: StatsMetaDto["comparison"] = WITH_DATA,
  downIsGood = false,
  compare: CompareParam = COMPARE_PARAMS.PREVIOUS,
) => formatChange(m, comparison, downIsGood, compare);

describe("formatChange", () => {
  it("prints nothing when the person chose not to compare", () => {
    expect(change(metric({}), null)).toMatchObject({ text: "", figure: "", context: "", tone: "neutral" });
  });

  it("says sin datos para comparar when hasData is false", () => {
    expect(change(metric({ previous: null, change: null }), NO_DATA)).toMatchObject({
      text: "sin datos para comparar",
      figure: "",
      context: "sin datos para comparar",
      tone: "neutral",
    });
  });

  it("shows a dash when there is a comparison window but no change to print", () => {
    expect(change(metric({ previous: 0, change: null }))).toMatchObject({ text: "—", tone: "neutral" });
  });

  it("names the comparison the person chose", () => {
    expect(change(metric({ change: 12 }))).toEqual({
      text: "▲ 12% vs período anterior",
      figure: "▲ 12%",
      context: "vs período anterior",
      tone: "up",
    });
    expect(change(metric({ change: 12 }), WITH_DATA, false, COMPARE_PARAMS.LAST_YEAR).text).toBe(
      "▲ 12% vs mismo período del año pasado",
    );
  });

  it("uses the points unit for ratios", () => {
    expect(change(metric({ change: -3, changeUnit: "points" }), WITH_DATA, false, COMPARE_PARAMS.LAST_YEAR)).toMatchObject({
      text: "▼ 3 pts vs mismo período del año pasado",
      figure: "▼ 3 pts",
      tone: "down",
    });
  });

  it("down is green for cancellations", () => {
    expect(change(metric({ change: -20 }), WITH_DATA, true)).toMatchObject({ text: "▼ 20% vs período anterior", tone: "up" });
    expect(change(metric({ change: 20 }), WITH_DATA, true).tone).toBe("down");
  });

  it("is neutral when nothing changed", () => {
    expect(change(metric({ change: 0 }))).toMatchObject({ text: "= 0% vs período anterior", tone: "neutral" });
  });

  it("never prints NaN or 0% for null", () => {
    const outputs = [
      change(metric({ current: null, previous: null, change: null })).text,
      change(metric({ previous: null, change: null }), NO_DATA).text,
    ];
    for (const text of outputs) {
      expect(text).not.toMatch(/NaN|0%/);
    }
  });
});
