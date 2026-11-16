// @vitest-environment node
import { describe, expect, it } from "vitest";

import { BIRTHDAY_SEND_HOURS, birthdayWhatsappText, formatTimeOfDay, formatTodayHeading } from "./birthday-text";

describe("birthday text", () => {
  it("builds the WhatsApp greeting with the message below", () => {
    expect(birthdayWhatsappText("Ana", "Hola\nChau")).toBe("¡Feliz cumple, Ana! 🎉\nHola\nChau");
  });

  it("formats an instant as HH:MM in Montevideo", () => {
    expect(formatTimeOfDay("2026-11-04T12:14:00Z")).toBe("09:14");
  });

  it("formats today's date for the heading", () => {
    expect(formatTodayHeading("2026-11-04")).toBe("miércoles 4 de noviembre");
  });

  it("offers whole hours from 6 to 22", () => {
    expect(BIRTHDAY_SEND_HOURS[0]).toBe(6);
    expect(BIRTHDAY_SEND_HOURS.at(-1)).toBe(22);
    expect(BIRTHDAY_SEND_HOURS).toHaveLength(17);
  });
});
