import { describe, expect, it } from "vitest";

import { whatsappLink } from "./whatsapp-link";

describe("whatsappLink", () => {
  it("keeps only the digits of the phone", () => {
    expect(whatsappLink("+598 99 123 456")).toBe("https://wa.me/59899123456");
  });

  it("adds the message encoded", () => {
    expect(whatsappLink("+59899123456", "Hola Ana")).toBe("https://wa.me/59899123456?text=Hola%20Ana");
  });

  it("leaves out the text when the message is empty", () => {
    expect(whatsappLink("+59899123456", "")).toBe("https://wa.me/59899123456");
  });
});
