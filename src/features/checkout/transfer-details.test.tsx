import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { COPIED_VISIBLE_MS, TransferDetails } from "./transfer-details";

const DETAILS = "BROU · Caja de ahorro 000000000-00001\nA nombre de MOVE Performance\nComprobante al WhatsApp 099 000 000";

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  vi.useRealTimers();
});

describe("TransferDetails", () => {
  it("shows the text staff wrote, keeping its lines", () => {
    renderWithSnackbar(<TransferDetails text={DETAILS} />);

    const block = screen.getByText(/BROU · Caja de ahorro/);
    expect(block.className).toContain("whitespace-pre-line");
    expect(block.textContent).toBe(DETAILS);
  });

  it("copies the exact text and says Copiado", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    renderWithSnackbar(<TransferDetails text={DETAILS} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar datos" }));

    expect(writeText).toHaveBeenCalledWith(DETAILS);
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeDefined();
  });

  it("goes back to Copiar datos after a few seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    renderWithSnackbar(<TransferDetails text={DETAILS} />);
    await userEvent.click(screen.getByRole("button", { name: "Copiar datos" }));
    await screen.findByRole("button", { name: "Copiado" });

    act(() => {
      vi.advanceTimersByTime(COPIED_VISIBLE_MS + 1);
    });

    expect(screen.getByRole("button", { name: "Copiar datos" })).toBeDefined();
  });

  it("warns to copy by hand when the clipboard fails, and the text stays visible", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    renderWithSnackbar(<TransferDetails text={DETAILS} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar datos" }));

    expect(await screen.findByText("No pudimos copiar. Copialo a mano.")).toBeDefined();
    expect(screen.getByText(/BROU · Caja de ahorro/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Copiar datos" })).toBeDefined();
  });

  it("warns too when the browser has no clipboard", async () => {
    renderWithSnackbar(<TransferDetails text={DETAILS} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar datos" }));

    expect(await screen.findByText("No pudimos copiar. Copialo a mano.")).toBeDefined();
  });
});
