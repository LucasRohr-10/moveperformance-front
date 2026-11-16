import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { BirthdaySettingsDto, TodayBirthdayDto, TodayBirthdaysDto } from "@/lib/api/types";

const BIRTHDAYS_PATH = "/api/v1/staff/birthdays";
const SETTINGS_PATH = `${BIRTHDAYS_PATH}/settings`;
const TODAY_PATH = `${BIRTHDAYS_PATH}/today`;
const JSON_HEADERS = { "Content-Type": "application/json" };

export function getBirthdaySettings(): Promise<BirthdaySettingsDto> {
  return apiFetchClient(SETTINGS_PATH).then(parseJsonOrThrow<BirthdaySettingsDto>);
}

export function saveBirthdaySettings(settings: BirthdaySettingsDto): Promise<BirthdaySettingsDto> {
  return apiFetchClient(SETTINGS_PATH, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(settings),
  }).then(parseJsonOrThrow<BirthdaySettingsDto>);
}

export function listTodayBirthdays(): Promise<TodayBirthdaysDto> {
  return apiFetchClient(TODAY_PATH).then(parseJsonOrThrow<TodayBirthdaysDto>);
}

// Staff tapped "Saludar por WhatsApp"; the API records when.
export function recordWhatsappOpened(clientId: string): Promise<TodayBirthdayDto> {
  return apiFetchClient(`${TODAY_PATH}/${encodeURIComponent(clientId)}/whatsapp`, { method: "POST" }).then(
    parseJsonOrThrow<TodayBirthdayDto>,
  );
}
