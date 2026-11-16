import { type AuthActionResult, requestAuth } from "./auth-request";
import { INVALID_PROFILE_INPUT_CODE } from "./constants";

const UPDATE_USER_PATH = "/api/auth/update-user";

export const UPDATE_PROFILE_ERRORS = {
  INVALID_PROFILE: "INVALID_PROFILE",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type UpdateProfileError =
  (typeof UPDATE_PROFILE_ERRORS)[keyof typeof UPDATE_PROFILE_ERRORS];

export interface ProfileUpdate {
  // E.164.
  phone?: string;
  // YYYY-MM-DD.
  birthDate?: string;
}

async function toUpdateProfileError(
  response: Response,
): Promise<UpdateProfileError> {
  if (response.status === 400) {
    try {
      const body = (await response.json()) as { code?: string };
      if (body.code === INVALID_PROFILE_INPUT_CODE) {
        return UPDATE_PROFILE_ERRORS.INVALID_PROFILE;
      }
    } catch {
      // not a JSON body we recognize — falls through to UNAVAILABLE below
    }
  }
  return UPDATE_PROFILE_ERRORS.UNAVAILABLE;
}

// Saves the missing profile fields of the signed-in user in one request.
export function updateProfile(
  input: ProfileUpdate,
): Promise<AuthActionResult<UpdateProfileError>> {
  return requestAuth(
    UPDATE_USER_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    toUpdateProfileError,
    UPDATE_PROFILE_ERRORS.UNAVAILABLE,
  );
}
