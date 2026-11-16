// The role is decided by the API (GET /api/v1/users/me); the frontend only
// reads it to choose where to send each user.
export const USER_ROLES = {
  CLIENT: "client",
  STAFF: "staff",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
