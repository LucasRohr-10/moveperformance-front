// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatBirthday, isBirthdayOn, isValidBirthDate } from "./birth-date";

describe("isValidBirthDate", () => {
  it("accepts a real past day", () => {
    expect(isValidBirthDate("1990-03-12", "2026-11-02")).toBe(true);
  });

  it.each(["2026-11-03", "1899-12-31", "1990-02-30", "", "12/03/1990"])(
    "refuses %j",
    (value) => {
      expect(isValidBirthDate(value, "2026-11-02")).toBe(false);
    },
  );

  it("accepts today and the minimum", () => {
    expect(isValidBirthDate("2026-11-02", "2026-11-02")).toBe(true);
    expect(isValidBirthDate("1900-01-01", "2026-11-02")).toBe(true);
  });
});

describe("isBirthdayOn", () => {
  it.each([
    ["1990-11-04", "2026-11-04", true],
    ["1990-11-04", "2026-11-05", false],
    ["2000-02-29", "2027-02-28", true],
    ["2000-02-29", "2028-02-28", false],
    ["2000-02-29", "2028-02-29", true],
  ])("%s on %s → %s", (birthDate, today, expected) => {
    expect(isBirthdayOn(birthDate, today)).toBe(expected);
  });
});

describe("formatBirthday", () => {
  it("writes the day and the month, never a day off", () => {
    expect(formatBirthday("1990-03-12")).toBe("12 de marzo");
    expect(formatBirthday("2000-02-29")).toBe("29 de febrero");
    expect(formatBirthday("1985-01-01")).toBe("1 de enero");
  });
});
