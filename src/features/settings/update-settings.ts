import { env } from "@/config/env";
import type { ApiErrorBody } from "@/lib/api/errors";
import type { SettingsValues } from "@/lib/api/types";

import { SETTING_KEYS, type SettingKey, type SettingsPatch } from "./settings-fields";

export type SettingsFieldErrors = Partial<Record<SettingKey, string>>;

export type UpdateSettingsResult =
  | { ok: true; values: SettingsValues }
  | { ok: false; fieldErrors: SettingsFieldErrors; message: string | null };

const UNAVAILABLE_MESSAGE =
  "No pudimos guardar los cambios. Probá de nuevo en unos minutos.";

// The API names each wrong field in `details`; keep only the ones this screen shows.
async function readFieldErrors(response: Response): Promise<SettingsFieldErrors> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const errors: SettingsFieldErrors = {};
    for (const { field, messages } of body.details ?? []) {
      const key = SETTING_KEYS.find((settingKey) => settingKey === field);
      if (key && messages[0]) errors[key] = messages[0];
    }
    return errors;
  } catch {
    return {};
  }
}

// Runs in the browser: the session cookie travels with `credentials: "include"`.
export async function updateSettings(
  patch: SettingsPatch,
): Promise<UpdateSettingsResult> {
  const url = new URL("/api/v1/staff/settings", env.NEXT_PUBLIC_API_URL).toString();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      credentials: "include",
    });
  } catch {
    return { ok: false, fieldErrors: {}, message: UNAVAILABLE_MESSAGE };
  }

  if (response.ok) {
    return { ok: true, values: (await response.json()) as SettingsValues };
  }

  const fieldErrors = await readFieldErrors(response);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  return {
    ok: false,
    fieldErrors,
    message: hasFieldErrors ? null : UNAVAILABLE_MESSAGE,
  };
}
