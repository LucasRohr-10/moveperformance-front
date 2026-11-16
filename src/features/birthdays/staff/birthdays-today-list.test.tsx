import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { whatsappLink } from "@/features/followup";
import type { TodayBirthdayDto, TodayBirthdaysDto } from "@/lib/api/types";
import { renderWithSnackbar } from "@/test/render-with-snackbar";

import { birthdayWhatsappText } from "../birthday-text";
import { BirthdaysTodayList } from "./birthdays-today-list";
import { recordWhatsappOpened } from "./staff-birthdays-api";

vi.mock("./staff-birthdays-api");

const recordMock = vi.mocked(recordWhatsappOpened);

const MESSAGE = "Hoy queremos celebrarte.\nGracias.";

const ANA: TodayBirthdayDto = {
  clientId: "c1",
  name: "Ana",
  lastName: "Pérez",
  phone: "+59899123456",
  age: 36,
  mailSentAt: "2026-11-04T12:00:00.000Z",
  whatsappOpenedAt: null,
};

const BRUNO: TodayBirthdayDto = {
  clientId: "c2",
  name: "Bruno",
  lastName: null,
  phone: null,
  age: 27,
  mailSentAt: null,
  whatsappOpenedAt: null,
};

const TODAY: TodayBirthdaysDto = { date: "2026-11-04", items: [ANA, BRUNO] };

function renderList(props: Partial<{ today: TodayBirthdaysDto; whatsappEnabled: boolean }> = {}) {
  const onRecorded = vi.fn();
  renderWithSnackbar(
    <BirthdaysTodayList
      today={props.today ?? TODAY}
      message={MESSAGE}
      whatsappEnabled={props.whatsappEnabled ?? true}
      onRecorded={onRecorded}
    />,
  );
  return { onRecorded };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("BirthdaysTodayList", () => {
  it("lists today's clients", () => {
    renderList();

    expect(screen.getByText("Cumpleaños de hoy · miércoles 4 de noviembre")).toBeDefined();
    expect(screen.getByText("2 clientes")).toBeDefined();
    expect(screen.getByText("AP")).toBeDefined();
    expect(screen.getByText("Ana Pérez · 36 años")).toBeDefined();
    expect(screen.getByText("+59899123456 · Mail enviado 09:00")).toBeDefined();
  });

  it("opens wa.me with the greeting and the message", () => {
    renderList();

    const link = screen.getByRole("link", { name: "Saludar por WhatsApp" });
    expect(link.getAttribute("href")).toBe(whatsappLink("+59899123456", birthdayWhatsappText("Ana", MESSAGE)));
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });

  it("records the greeting and shows WhatsApp abierto", async () => {
    const opened = { ...ANA, whatsappOpenedAt: "2026-11-04T12:14:00.000Z" };
    recordMock.mockResolvedValue(opened);
    const { onRecorded } = renderList();
    const user = userEvent.setup();

    await user.click(screen.getByRole("link", { name: "Saludar por WhatsApp" }));

    expect(recordMock).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(onRecorded).toHaveBeenCalledWith(opened));
  });

  it("shows WhatsApp abierto and lets staff tap it again", () => {
    renderList({ today: { ...TODAY, items: [{ ...ANA, whatsappOpenedAt: "2026-11-04T12:14:00.000Z" }] } });

    const link = screen.getByRole("link", { name: "WhatsApp abierto 09:14" });
    expect(link.getAttribute("href")).toContain("https://wa.me/59899123456");
  });

  it("keeps the WhatsApp link working when recording fails", async () => {
    recordMock.mockRejectedValue(new Error("down"));
    const { onRecorded } = renderList();
    const user = userEvent.setup();

    await user.click(screen.getByRole("link", { name: "Saludar por WhatsApp" }));

    expect(await screen.findByText("No pudimos registrar el saludo.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Saludar por WhatsApp" })).toBeDefined();
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it("hides the button without a phone or with WhatsApp off", () => {
    renderList();
    expect(screen.getByText("Sin teléfono")).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Saludar por WhatsApp" })).toHaveLength(1);
  });

  it("hides every button with WhatsApp off", () => {
    renderList({ whatsappEnabled: false });

    expect(screen.queryByRole("link", { name: "Saludar por WhatsApp" })).toBeNull();
  });

  it("shows Hoy no cumple nadie.", () => {
    renderList({ today: { date: "2026-11-04", items: [] } });

    expect(screen.getByText("Hoy no cumple nadie.")).toBeDefined();
  });
});
