import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SnackbarProvider } from "@/components/ui/snackbar";
import { recordWhatsappOpened } from "@/features/birthdays";
import type { TodayBirthdayDto } from "@/lib/api/types";

import { BirthdayWhatsappLink } from "./birthday-whatsapp-link";

vi.mock("@/features/birthdays", () => ({ recordWhatsappOpened: vi.fn() }));

const recordMock = vi.mocked(recordWhatsappOpened);

const RECORDED: TodayBirthdayDto = {
  clientId: "c1",
  name: "Martina",
  lastName: "Pérez",
  phone: "+59899123456",
  age: 29,
  mailSentAt: null,
  whatsappOpenedAt: "2026-11-03T21:14:00.000Z",
};

const renderLink = (opened: string | null = null) =>
  render(<BirthdayWhatsappLink clientId="c1" href="https://wa.me/59899123456" openedAt={opened} />, {
    wrapper: SnackbarProvider,
  });

describe("BirthdayWhatsappLink", () => {
  beforeEach(() => {
    recordMock.mockReset();
  });

  it("records the WhatsApp click", async () => {
    recordMock.mockResolvedValue(RECORDED);
    renderLink();

    const link = screen.getByRole("link", { name: "Saludar por WhatsApp" });
    expect(link.getAttribute("target")).toBe("_blank");
    fireEvent.click(link);

    expect(recordMock).toHaveBeenCalledWith("c1");
    // 21:14Z is 18:14 in Montevideo.
    await waitFor(() => expect(screen.getByRole("link", { name: "WhatsApp abierto 18:14" })).toBeDefined());
  });

  it("shows when it was already opened", () => {
    renderLink("2026-11-03T21:14:00.000Z");

    expect(screen.getByRole("link", { name: "WhatsApp abierto 18:14" })).toBeDefined();
  });

  it("never blocks the chat when the record fails, and says so", async () => {
    recordMock.mockRejectedValue(new Error("boom"));
    renderLink();

    // fireEvent.click returns false when a handler called preventDefault, which would stop the link.
    const notStopped = fireEvent.click(screen.getByRole("link", { name: "Saludar por WhatsApp" }));

    expect(notStopped).toBe(true);
    await waitFor(() => expect(screen.getByText("No pudimos registrar el saludo.")).toBeDefined());
  });
});
