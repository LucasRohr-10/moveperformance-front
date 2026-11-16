import { USER_ROLES, type UserRole } from "./user-roles.constants";

export const ROUTES = {
  HOME: "/",
  PERFORMANCE: "/performance",
  REHAB: "/rehab",
  RECOVERY: "/recovery",
  RESERVE: "/reservar",
  PRIVACY: "/privacidad",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  COMPLETE_PROFILE: "/complete-profile",
  DASHBOARD: "/dashboard",
  BOOKINGS: "/bookings",
  PLANS: "/plans",
  // Public, unauthenticated plans page — distinct from the signed-in PLANS
  // (renewals) route above.
  PLANS_PUBLIC: "/planes",
  HISTORY: "/history",
  CLIENT_CHECKIN: "/check-in",
  CHECKOUT_PLAN: "/checkout/plan",
  CHECKOUT_BOOKING: "/checkout/reserva",
  CHECKOUT_RESULT: "/checkout/resultado",
  CHECKOUT_SIMULATOR: "/checkout/simulado",
  STAFF: "/staff",
  STAFF_CLIENTS: "/staff/clients",
  STAFF_BOOK: "/staff/book",
  STAFF_SCHEDULE: "/staff/schedule",
  STAFF_SCHEDULE_EDIT: "/staff/schedule/edit",
  STAFF_SCHEDULE_TEMPLATES: "/staff/schedule/templates",
  STAFF_SCHEDULE_PROFESSIONALS: "/staff/schedule/professionals",
  STAFF_PAYMENTS: "/staff/payments",
  STAFF_PLANS: "/staff/plans",
  STAFF_FOLLOW_UP: "/staff/follow-up",
  STAFF_ANNOUNCEMENTS: "/staff/announcements",
  STAFF_SETTINGS: "/staff/settings",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

// Each role's own area: where a signed-in user is sent after login and when
// they open a page that belongs to the other role.
export const HOME_BY_ROLE: Record<UserRole, Route> = {
  [USER_ROLES.CLIENT]: ROUTES.DASHBOARD,
  [USER_ROLES.STAFF]: ROUTES.STAFF,
};
