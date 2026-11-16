// @vitest-environment node
import { describe, expect, it } from "vitest";

import { hasOnlyPhoneCharacters, toE164Phone } from "./phone";

describe("toE164Phone", () => {
  it.each([
    ["a mobile with the leading 0 and spaces", "099 123 456", "+59899123456"],
    ["a mobile without the leading 0", "99123456", "+59899123456"],
    ["another mobile prefix", "094 555 555", "+59894555555"],
    ["a Montevideo landline", "2901 2345", "+59829012345"],
    ["a Uruguayan number with its code", "+598 99 123 456", "+59899123456"],
    ["a foreign number with its code", "+5491123456789", "+5491123456789"],
  ])("converts %s", (_label, raw, expected) => {
    expect(toE164Phone(raw)).toBe(expected);
  });

  it.each([
    ["too few digits", "099 12 34"],
    ["letters", "abc"],
    ["an empty field", ""],
    // Valid by length only: rejected because it does not exist, like the API does.
    ["a number that does not exist", "+59812345678"],
    ["letters mixed with a valid number", "099 123 456abc"],
    ["an extension", "099 123 456 ext 2"],
    ["dashes", "099-123-456"],
    ["parentheses", "(099) 123456"],
    ["a + at the end", "099 123 456+"],
    ["a + between the digits", "099+123 456"],
    ["two + at the start", "++598 99 123 456"],
  ])("returns null for %s", (_label, raw) => {
    expect(toE164Phone(raw)).toBeNull();
  });

  it("reads a number without + as Uruguayan", () => {
    // An Argentine mobile typed without "+54 9" is not a Uruguayan number.
    expect(toE164Phone("11 2345 6789")).toBeNull();
  });
});

describe("hasOnlyPhoneCharacters", () => {
  it.each(["099 123 456", "+598 99 123 456", " 099123456 "])(
    "accepts %j",
    (raw) => {
      expect(hasOnlyPhoneCharacters(raw)).toBe(true);
    },
  );

  it.each(["099abc", "099-123", "(099)", "099+123", "099 123+", ""])(
    "rejects %j",
    (raw) => {
      expect(hasOnlyPhoneCharacters(raw)).toBe(false);
    },
  );
});
