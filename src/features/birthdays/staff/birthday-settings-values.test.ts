// @vitest-environment node
import { describe, expect, it } from "vitest";

import { validateBirthdaySettings } from "./birthday-settings-values";

const VALID = { message: "Hola", emailEnabled: true, whatsappEnabled: true, sendHour: 9 };

describe("validateBirthdaySettings", () => {
  it("accepts a message up to 500 characters", () => {
    expect(validateBirthdaySettings(VALID)).toEqual({});
    expect(validateBirthdaySettings({ ...VALID, message: "a".repeat(500) })).toEqual({});
  });

  it.each(["", "   "])("asks for the message when it is %j", (message) => {
    expect(validateBirthdaySettings({ ...VALID, message })).toEqual({ message: "Escribí el mensaje." });
  });

  it("refuses more than 500 characters", () => {
    expect(validateBirthdaySettings({ ...VALID, message: "a".repeat(501) })).toEqual({
      message: "Máximo 500 caracteres.",
    });
  });
});
