import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BirthdayPreviews } from "./birthday-previews";

describe("BirthdayPreviews", () => {
  it("previews the mail and the WhatsApp with the placeholder name", () => {
    render(<BirthdayPreviews message="Hoy queremos celebrarte." />);

    expect(screen.getByText("¡Feliz cumple, Nombre!")).toBeDefined();
    expect(screen.getByText("— El equipo de MOVE")).toBeDefined();
    expect(screen.getByTestId("whatsapp-preview").textContent).toBe(
      "¡Feliz cumple, Nombre! 🎉\nHoy queremos celebrarte.",
    );
  });

  it("previews keep the line breaks", () => {
    render(<BirthdayPreviews message={"Hola\nChau"} />);

    const mailBody = screen.getByTestId("mail-preview-message");
    expect(mailBody.textContent).toBe("Hola\nChau");
    expect(mailBody.className).toContain("whitespace-pre-line");
    expect(screen.getByTestId("whatsapp-preview").className).toContain("whitespace-pre-line");
  });
});
