import { describe, expect, it } from "vitest";

import { parseHistoryParams } from "./history-params";

describe("parseHistoryParams", () => {
  it("defaults to the attendance tab, every payment and the first page", () => {
    expect(parseHistoryParams({})).toEqual({ tab: "asistencia", origin: undefined, page: 1 });
  });

  it("opens the payments tab only for tab=pagos, and any other value falls back to attendance", () => {
    expect(parseHistoryParams({ tab: "pagos" }).tab).toBe("pagos");
    expect(parseHistoryParams({ tab: "algo-raro" }).tab).toBe("asistencia");
    expect(parseHistoryParams({ tab: "" }).tab).toBe("asistencia");
  });

  it("keeps a known origin and a valid page", () => {
    expect(parseHistoryParams({ origin: "auto_debit", page: "3" })).toEqual({ tab: "asistencia", origin: "auto_debit", page: 3 });
    expect(parseHistoryParams({ origin: "one_time" }).origin).toBe("one_time");
  });

  it("ignores an origin that does not exist", () => {
    expect(parseHistoryParams({ origin: "foo" }).origin).toBeUndefined();
  });

  it.each(["abc", "0", "-2", "1.5", ""])("falls back to page 1 for the page %j", (page) => {
    expect(parseHistoryParams({ page }).page).toBe(1);
  });
});
