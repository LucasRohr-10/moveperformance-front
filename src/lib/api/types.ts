import type { UserRole } from "@/config/constants/user-roles.constants";

export interface AuthenticatedUser {
  id: string;
  // First name only.
  name: string;
  lastName: string | null;
  email: string;
  // E.164. Null for someone who signed up with Google and has not added it yet.
  phone: string | null;
  // YYYY-MM-DD. Null for staff and for someone who signed up with Google and has not added it yet.
  birthDate: string | null;
  role: UserRole;
}

export type ServiceType = "performance" | "rehab" | "recovery";

export interface Professional {
  id: string;
  name: string;
  active: boolean;
}

export interface TemplateDay {
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleTemplate {
  id: string;
  service: ServiceType;
  days: TemplateDay[];
  durationMinutes: number;
  gapMinutes: number;
  capacity: number;
  professionalId: string | null;
  professionalName: string | null;
  active: boolean;
}

export interface AvailabilityDay {
  date: string;
  available: number;
}

export type EligibilityReason = "PLAN_REQUIRED" | "PACKAGE_REQUIRED" | "NOT_APPLICABLE";

// Would the current plan/pack cover this slot, as of the last time it was checked —
// orientative, not a guarantee: the real check happens again, with a lock, on confirm.
export interface SlotEligibility {
  covered: boolean | null;
  reason: EligibilityReason | null;
}

// GET /api/v1/bookings/slots
export interface BookableSlot {
  id: string;
  service: ServiceType;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  capacity: number;
  available: number;
  isFull: boolean;
  alreadyBooked: boolean;
  // Same value on every slot of one response (one service + business date). Null/absent for
  // an anonymous listing — "sign in to see if you're covered", never "not covered". Optional
  // so existing fixtures that predate this field keep compiling; treat missing as null.
  eligibility?: SlotEligibility | null;
}

// POST /api/v1/bookings/batch-eligibility
export interface SlotEligibilityDto extends SlotEligibility {
  timeSlotId: string;
}

// POST /api/v1/bookings, POST /api/v1/bookings/:id/cancel, GET /api/v1/me/bookings
export interface BookingResponse {
  id: string;
  timeSlotId: string;
  service: ServiceType;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  label: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "expired";
  source: BookingSource;
  canCancel: boolean;
  cancelledAt: string | null;
}

// POST /api/v1/bookings/:id/cancel: contactForRefund is true when the client had already paid the booking.
export type CancelBookingResponse = BookingResponse & { contactForRefund: boolean };

// GET /api/v1/bookings/window (lastBookableDate is a YYYY-MM-DD business date)
export interface BookingWindowDto {
  bookingWindowDays: number;
  lastBookableDate: string;
}

export interface FailedSlotDto {
  timeSlotId: string;
  code: string;
  message: string;
}

export const REHAB_KINDS = {
  EVALUATION: "evaluation",
  FOLLOWUP: "followup",
} as const;
export type RehabKind = (typeof REHAB_KINDS)[keyof typeof REHAB_KINDS];

export const PAYMENT_METHODS = {
  MERCADO_PAGO: "mercado_pago",
  CASH: "cash",
  TRANSFER: "transfer",
  UNDECIDED: "undecided",
} as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];
// How staff records a payment received outside the app, and how a booking can be left to pay.
export type OfflinePaymentMethod = "cash" | "transfer";
export type BookingPaymentChoice = "cash" | "transfer" | "undecided";

// POST /api/v1/staff/clients/:clientId/batch-eligibility: the preview also says whether
// a slot not covered by a plan or package would be charged outside the app.
export interface StaffSlotEligibilityDto extends SlotEligibilityDto {
  chargedOffline: boolean;
}

// POST /api/v1/staff/clients/:clientId/bookings: the amount is never sent, the backend
// takes it from the staff prices in Configuración.
export interface StaffBookingItemInput {
  timeSlotId: string;
  rehabKind?: RehabKind;
}

export interface StaffBookingsInput {
  paymentMethod: BookingPaymentChoice;
  items: StaffBookingItemInput[];
}

export interface StaffBookedDto {
  bookingId: string;
  timeSlotId: string;
  service: ServiceType;
  startsAt: string;
  endsAt: string;
  label: string;
  source: "plan" | "package" | "staff_offline";
  rehabKind: RehabKind | null;
  offlineCharge: {
    id: string;
    status: "pending";
    paymentMethod: BookingPaymentChoice;
    amount: number | null;
    currency: string;
  } | null;
}

export interface StaffBookingsBatchDto {
  booked: StaffBookedDto[];
  failed: FailedSlotDto[];
}

// GET /api/v1/staff/clients/:clientId/offline-charge-allowance
export interface OfflineChargeAllowanceDto {
  open: number;
  limit: number;
  remaining: number;
}

export interface StaffPersonDto {
  id: string;
  name: string;
}

// One payment recorded by staff against an offline charge (a voided one stays in the list).
export interface OfflinePaymentDto {
  id: string;
  method: OfflinePaymentMethod;
  amount: number;
  currency: string;
  // YYYY-MM-DD business date.
  paidOn: string;
  note: string | null;
  hasReceipt: boolean;
  recordedAt: string;
  recordedBy: StaffPersonDto | null;
  voidedAt: string | null;
  voidedBy: StaffPersonDto | null;
  voidReason: string | null;
}

export type OfflineChargeStatus = "pending" | "approved" | "cancelled" | "waived";

// GET /api/v1/staff/offline-charges
export interface OfflineChargeDto {
  id: string;
  // "plan": the unpaid plan itself (no booking); "booking": a session, an evaluation or a booking staff made.
  kind: PurchaseKind;
  // YYYY-MM-DD business date; only on the charge of a plan.
  planStartsOn: string | null;
  // Only on the row of a turn booked with an unpaid plan: that turn has no amount of its own. The row's `id`,
  // `amount` and "Marcar como pagado" are the plan's.
  paysWith: { itemName: string } | null;
  client: StaffPaymentClientDto | null;
  bookingId: string | null;
  service: ServiceType;
  itemName: string;
  booking: { startsAt: string; status: BookingResponse["status"] } | null;
  slotStarted: boolean;
  status: OfflineChargeStatus;
  paymentMethod: BookingPaymentChoice;
  amount: number | null;
  currency: string;
  createdAt: string;
  bookedBy: StaffPersonDto | null;
  closedAt: string | null;
  closedBy: StaffPersonDto | null;
  closeReason: string | null;
  needsAttention: boolean;
  attentionReason: PaymentAttentionReason | null;
  attentionNote: string | null;
  // The registered payment that closed it, if any.
  payment: OfflinePaymentDto | null;
}

// GET /api/v1/staff/offline-charges/:id and the payment and waive actions.
export interface OfflineChargeDetailDto extends OfflineChargeDto {
  payments: OfflinePaymentDto[];
}

export interface OfflineChargeListDto {
  items: OfflineChargeDto[];
  total: number;
  limitPerClient: number;
}

// GET /api/v1/staff/offline-charges/receipt-upload
export interface ReceiptUploadDto {
  available: boolean;
  maxBytes: number;
  allowedTypes: string[];
}

// GET /api/v1/staff/offline-charges/:id/payments/:paymentId/receipt and /me/payments/:id/receipt
export interface ReceiptLinkDto {
  url: string;
  expiresAt: string;
}

// POST /api/v1/bookings/batch
export interface BookingsBatchDto {
  booked: BookingResponse[];
  failed: FailedSlotDto[];
}

export type PlanKind =
  | "period_plan"
  | "session_pack"
  | "single_session"
  | "evaluation";

// GET /api/v1/plans
export interface PlanDto {
  id: string;
  service: ServiceType;
  kind: PlanKind;
  slug: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  periodMonths: number | null;
  periodDays: number | null;
  sessionsIncluded: number | null;
  durationMinutes: number | null;
  featured: boolean;
  autoDebitEnabled: boolean;
}

// GET /api/v1/staff/plans: the public fields plus the state staff manage.
export interface StaffPlanDto extends PlanDto {
  isActive: boolean;
  sortOrder: number;
}

// Prices staff sets in Configuración for a booking charged outside the app; null = not set.
export interface OfflinePriceSettings {
  offlinePriceRehabEvaluation: number | null;
  offlinePriceRehabFollowup: number | null;
  offlinePriceRecoverySession: number | null;
  offlinePricePerformanceClass: number | null;
}

// GET and PATCH /api/v1/staff/settings
export interface SettingsValues extends OfflinePriceSettings {
  cancelLimitHours: number;
  bookingWindowDays: number;
  pendingPaymentMinutes: number;
  expiringSoonDays: number;
  noAttendanceDays: number;
  prolongedInactivityDays: number;
  // A proportion: 0.5 means "half of the usual frequency".
  frequencyDropRatio: number;
  // Days after a plan ends that staff wait for the renewal before counting a drop-out.
  renewalGraceDays: number;
  // Things a client may have unpaid at once (cash or transfer, plans and their bookings).
  offlineUnpaidLimit: number;
  offlineDiscountEnabled: boolean;
  // A whole percentage: 10 means 10% off. Null while the discount is off or not set.
  offlineDiscountPercent: number | null;
  transferEnabled: boolean;
  // Free text the client sees when choosing Transfer; null while transfers are off or not set.
  transferDetails: string | null;
}

// What GET /api/v1/staff/settings answers.
export type StaffSettingsDto = SettingsValues;

export type AttendanceStatus = "present" | "absent";

// What covers a booking: a plan, a package session, a follow-up, or a one-off payment.
export type BookingSource = "plan" | "package" | "payment" | "followup" | "staff_offline";

// GET /api/v1/staff/time-slots/:id/roster, POST /api/v1/staff/bookings/:id/attendance
export interface RosterItem {
  bookingId: string;
  client: { id: string; name: string; lastName: string | null };
  status: "pending_payment" | "confirmed" | "cancelled" | "expired";
  attendance: AttendanceStatus | null;
  source: BookingSource;
}

// Item of GET /api/v1/staff/clients's paginated response.
export interface ClientRow {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  nextBookingAt: string | null;
  lastAttendanceStatus: AttendanceStatus | null;
  // Set while the client is deactivated.
  deactivatedAt: string | null;
}

export const CLIENT_ACCOUNT_STATUSES = { ACTIVE: "active", DEACTIVATED: "deactivated" } as const;
export type ClientAccountStatus = (typeof CLIENT_ACCOUNT_STATUSES)[keyof typeof CLIENT_ACCOUNT_STATUSES];

// GET /api/v1/staff/clients?q=&page=&pageSize=&status=
export interface ClientPage {
  items: ClientRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClientBooking {
  id: string;
  slotId: string;
  service: ServiceType;
  startsAt: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "expired";
  attendance: AttendanceStatus | null;
}

export type ClientPaymentStatus = "up_to_date" | "overdue";

export interface ClientDeactivation {
  deactivatedAt: string;
  deactivatedByName: string | null;
  reason: string | null;
}

// GET /api/v1/staff/clients/:id/deactivation-preview: what deactivating the client would cancel.
export interface DeactivationPreview {
  upcomingBookings: number;
  hasCurrentPlan: boolean;
  autoDebits: number;
  // Recovery sessions that stay unused while the client is deactivated (a pack booking cancelled gives its session back).
  recoverySessionsLeft: number;
}

// POST /api/v1/staff/clients
export interface NewClientInput {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  password: string;
}

// PATCH /api/v1/staff/clients/:id: only the fields that changed are sent.
export interface ClientProfileChanges {
  name?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
}

export interface ClientDetail {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  // YYYY-MM-DD; age is in whole years, both null without a birth date.
  birthDate: string | null;
  age: number | null;
  clientSince: string;
  plan: { name: string; endsOn: string } | null;
  paymentStatus: ClientPaymentStatus | null;
  bookings: ClientBooking[];
  // Not null while the client is deactivated; the plan itself comes back unchanged.
  deactivation: ClientDeactivation | null;
}

// GET /api/v1/staff/time-slots?date=
export interface DailySlot {
  id: string;
  service: ServiceType;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
  professionalName: string | null;
  calendarBlockedAt: string | null;
  // Set when staff cancelled the slot (cancelReason is the reason they gave).
  cancelledAt: string | null;
  cancelReason: string | null;
  // Set when staff touched this slot by hand; templates no longer change it.
  staffEditedAt: string | null;
  // Added by hand, with no template behind it.
  isIndividual: boolean;
  // Who the template assigned; differs from professionalName when someone covers.
  templateProfessionalName: string | null;
  // Confirmed bookings with no attendance mark yet.
  unmarkedAttendance: number;
}

export type SubscriptionStatus = "active" | "scheduled" | "expired";

// GET /api/v1/me/subscriptions (dates are YYYY-MM-DD business dates in Montevideo)
export interface PerformanceSubscriptionDto {
  id: string;
  planId: string;
  planName: string;
  startsOn: string;
  endsOn: string;
  status: SubscriptionStatus;
  daysLeft: number;
  expiringSoon: boolean;
  // Bought with cash or transfer and not paid yet; null for older rows with no purchase.
  purchaseId: string | null;
  awaitingPayment: boolean;
}

export interface RecoveryPackDto {
  id: string;
  planId: string;
  planName: string;
  startsOn: string;
  endsOn: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsLeft: number;
  daysLeft: number;
  expiringSoon: boolean;
  purchaseId: string | null;
  awaitingPayment: boolean;
}

export interface MySubscriptionsDto {
  performance: PerformanceSubscriptionDto | null;
  upcomingPerformances: PerformanceSubscriptionDto[];
  recoveryPacks: RecoveryPackDto[];
}

export type CalendarConnectionStatus = "disconnected" | "connected" | "needs_reconnect";

// Entry of GET /api/v1/staff/calendar's `professionals`, and the response of
// PATCH /api/v1/staff/calendar/:professionalId.
export interface ProfessionalCalendarStatus {
  professionalId: string;
  professionalName: string;
  status: CalendarConnectionStatus;
  googleAccountEmail: string | null;
  calendarId: string | null;
  calendarName: string | null;
  lastPushAt: string | null;
  lastPullAt: string | null;
}

// GET /api/v1/staff/calendar, POST /api/v1/staff/calendar/:professionalId/sync
export interface CalendarStatus {
  configured: boolean;
  professionals: ProfessionalCalendarStatus[];
}

// GET /api/v1/staff/calendar/:professionalId/calendars
export interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
}

export type PurchaseKind = "plan" | "booking";
export type PurchaseStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired" | "waived";
// The state of the latest payment of a purchase, as the API stores it (Mercado Pago's own statuses, folded).
export type ProviderPaymentStatus = "pending" | "in_process" | "approved" | "rejected" | "cancelled" | "refunded";
export type SimulateOutcome = "approved" | "rejected";

// POST /api/v1/checkout/plan and /checkout/booking
export interface CheckoutResponseDto {
  purchaseId: string;
  externalReference: string;
  // null when the client chose cash or transfer: there is no provider to go to.
  redirectUrl: string | null;
  bookingId: string | null;
  holdExpiresAt: string | null;
}

export type UnpaidItemKind = "plan" | "booking" | "plan_booking";

export interface UnpaidItemDto {
  purchaseId: string;
  kind: UnpaidItemKind;
  label: string;
  amount: number | null;
  startsAt: string | null;
}

// GET /api/v1/checkout/offline-options
export interface OfflineOptionsDto {
  // null while staff has the discount off.
  discountPercent: number | null;
  // null while staff has transfers off.
  transferDetails: string | null;
  unpaid: { count: number; limit: number; items: UnpaidItemDto[] };
}

// GET /api/v1/checkout/purchases/:externalReference
export interface PurchaseStatusDto {
  externalReference: string;
  kind: PurchaseKind;
  status: PurchaseStatus;
  itemName: string;
  service: ServiceType;
  // null for a charge staff opened by hand with no amount yet ("A definir").
  amount: number | null;
  currency: string;
  planId: string;
  bookingId: string | null;
  startsAt: string | null; // ISO 8601, start of the booked slot (booking purchases only)
  needsAttention: boolean;
  // The latest payment of the purchase; null before any payment. A rejection does not close a purchase,
  // so this, not `status`, says why the last attempt failed.
  paymentStatus: ProviderPaymentStatus | null;
  // Mercado Pago's `status_detail` (e.g. cc_rejected_insufficient_amount). Never show it as it comes.
  paymentStatusDetail: string | null;
  paymentMethod: PaymentMethod;
  // Only for a pending transfer.
  transferDetails: string | null;
}

// POST /api/v1/payments/dev/simulate
export interface SimulatePaymentResponseDto {
  externalReference: string;
  status: PurchaseStatus;
}

export type PaymentOrigin = "one_time" | "auto_debit";

export type PaymentAttentionReason =
  | "booking_cancelled_by_staff"
  | "booking_cancelled_by_client"
  | "offline_booking_cancelled";

export interface StaffPaymentClientDto {
  id: string;
  name: string;
  email: string;
}

// GET /api/v1/staff/payments, POST /api/v1/staff/payments/:id/review
export interface StaffPaymentDto {
  purchaseId: string;
  externalReference: string;
  // null when the user who bought it no longer exists.
  client: StaffPaymentClientDto | null;
  kind: PurchaseKind;
  itemName: string;
  service: ServiceType;
  // null for an offline charge whose price is not set yet.
  amount: number | null;
  currency: string;
  status: PurchaseStatus;
  needsAttention: boolean;
  origin: PaymentOrigin;
  paymentMethod: PaymentMethod;
  createdAt: string;
  approvedAt: string | null;
  // null for an offline charge: it has no plan.
  planId: string | null;
  bookingId: string | null;
  attentionReason: PaymentAttentionReason | null;
  // What staff sees under the status, e.g. "17:00 del 12/11 · Mantenimiento de la sala".
  attentionNote: string | null;
}

export interface StaffPaymentPageDto {
  items: StaffPaymentDto[];
  total: number;
  page: number;
  pageSize: number;
}

// to_pay: chosen for cash or transfer and not recorded as paid by the team yet.
export type PaymentHistoryState = "approved" | "refunded" | "declined" | "processing" | "waiting" | "expired" | "to_pay";

// What an approved purchase gave the client (startsOn/endsOn are YYYY-MM-DD business dates, startsAt is ISO 8601).
export type DeliveredItemDto =
  | { type: "plan"; startsOn: string; endsOn: string; sessionsTotal: number | null }
  | { type: "booking"; startsAt: string };

// GET /api/v1/me/payments (one card of the client's payment history; id is the purchase id)
export interface MyPaymentDto {
  id: string;
  state: PaymentHistoryState;
  origin: PaymentOrigin;
  paymentMethod: "mercado_pago" | "cash" | "transfer";
  kind: PurchaseKind;
  service: ServiceType;
  itemName: string;
  amount: number;
  currency: string;
  createdAt: string;
  approvedAt: string | null;
  // YYYY-MM-DD business date the client paid, only for a payment recorded outside the app.
  paidOn: string | null;
  hasReceipt: boolean;
  // When the latest payment was created (the attempt); null when there is none.
  lastPaymentAt: string | null;
  // Only a refunded purchase has it: the closest thing to the refund date.
  refundedAt: string | null;
  paymentId: string | null;
  // Only a declined purchase has it: the provider's status detail. The UI never shows it as is.
  reasonCode: string | null;
  // Only an approved purchase has it, and null when what it gave can no longer be shown.
  delivered: DeliveredItemDto | null;
}

export interface MyPaymentPageDto {
  items: MyPaymentDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivitySummaryDto {
  /** "YYYY-MM" of the current month in Montevideo. */
  month: string;
  monthAttendances: number;
  frequencyPerWeek: number;
  streak: number;
  hasAttended: boolean;
}

export type AttendanceHistoryState = "present" | "absent" | "unmarked" | "cancelled";

export interface MyAttendanceItemDto {
  bookingId: string;
  service: ServiceType;
  startsAt: string;
  endsAt: string;
  /** The label the API builds, e.g. "Sesión Recovery · 45 min". */
  label: string;
  state: AttendanceHistoryState;
}

export interface MyAttendancePageDto {
  items: MyAttendanceItemDto[];
  total: number;
  page: number;
  pageSize: number;
  /** Presents of the whole month, for each month that appears in `items`. */
  months: { month: string; attended: number }[];
}

export const AUTO_DEBIT_STATUSES = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  CANCELLED: "cancelled",
} as const;

export type AutoDebitStatus = (typeof AUTO_DEBIT_STATUSES)[keyof typeof AUTO_DEBIT_STATUSES];
export type FrequencyType = "months" | "days";

// GET /api/v1/me/auto-debits, GET /me/auto-debits/:externalReference, DELETE /me/auto-debits/:id
// (nextChargeOn is a YYYY-MM-DD business date)
export interface AutoDebitDto {
  id: string;
  externalReference: string;
  planId: string;
  planName: string;
  service: "performance" | "recovery";
  status: AutoDebitStatus;
  amount: number;
  currency: "UYU";
  frequency: number;
  frequencyType: FrequencyType;
  nextChargeOn: string | null;
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: "client" | "provider" | "expired" | "deactivated" | null;
}

// POST /api/v1/me/auto-debits
export interface AutoDebitCheckoutDto {
  externalReference: string;
  redirectUrl: string;
}

// POST /api/v1/payments/dev/simulate-auto-debit
export type SimulatedDebitAction = "authorize" | "charge_approved" | "charge_rejected" | "cancel";

export const ALERT_TYPES = {
  EXPIRING: "expiring",
  EXPIRED: "expired",
  NO_ATTENDANCE: "no_attendance",
  PROLONGED_INACTIVITY: "prolonged_inactivity",
  FREQUENCY_DROP: "frequency_drop",
  RECONTACT: "recontact",
  CHECKIN_PAIN: "checkin_pain",
  CHECKIN_GOALS: "checkin_goals",
} as const;

export type AlertType = (typeof ALERT_TYPES)[keyof typeof ALERT_TYPES];
export type ContactChannel = "phone" | "whatsapp" | "email" | "in_person";
export type ContactOutcome = "reached" | "no_answer" | "left_message";
// The reason/template picked for the composed message; drives the email subject and heading.
export type ContactTemplate = "reminder" | "payment" | "miss_you" | "free";
export type InactivityReason =
  | "injury"
  | "vacation"
  | "temporary_pause"
  | "no_time"
  | "moving"
  | "return_later";

// GET /api/v1/staff/alerts, POST /api/v1/staff/alerts/:id/handle
// (endsOn, lastAttendanceOn and recontactOn are YYYY-MM-DD business dates; createdAt and since are instants)
export interface AlertDto {
  id: string;
  type: AlertType;
  status: "open" | "handled";
  client: { id: string; name: string; initials: string; phone: string | null; email: string };
  planName: string | null;
  endsOn: string | null;
  lastAttendanceOn: string | null;
  frequencyPerWeek: number;
  usualFrequencyPerWeek: number | null;
  contactsCount: number;
  pause: { reason: InactivityReason; since: string; recontactOn: string | null } | null;
  checkin: { id: string; painDetail: string | null; goalsDetail: string | null } | null;
  createdAt: string;
}

// GET /api/v1/staff/alerts/counts
export type AlertCountsDto = Record<AlertType, number> & { total: number };

// POST and PATCH /api/v1/staff/clients/:id/contact[/:contactId]
export interface ContactDto {
  id: string;
  channel: ContactChannel;
  // Null until the staff comes back to say how the contact went.
  outcome: ContactOutcome | null;
  note: string | null;
  staffName: string;
  alertType: AlertType | null;
  createdAt: string;
}

// GET /api/v1/staff/contacts/pending
export interface PendingContactDto {
  id: string;
  client: { id: string; name: string; initials: string };
  channel: ContactChannel;
  alertId: string | null;
  createdAt: string;
}

// POST /api/v1/staff/clients/:id/inactivity-reasons and /inactivity-reasons/end
export interface InactivityReasonDto {
  id: string;
  reason: InactivityReason;
  note: string | null;
  recontactOn: string | null;
  startedAt: string;
  endedAt: string | null;
  createdByName: string;
}

// GET /api/v1/staff/clients/:id/followup
export interface ClientFollowupDto {
  pause: InactivityReasonDto | null;
  pauses: InactivityReasonDto[];
  contacts: ContactDto[];
}

// GET /api/v1/me/checkins/pending
export interface PendingCheckinDto {
  checkin: { id: string; period: string; firstName: string } | null;
}

// POST /api/v1/me/checkins/:id
export interface CheckinAnswersDto {
  feeling: "struggling" | "good" | "very_good";
  pain: "none" | "mild";
  painDetail?: string;
  goals: "same" | "adjust";
  goalsDetail?: string;
}

export type CheckinFlag = "ok" | "pain" | "goals";

// ---- Edit a day (GET/POST /api/v1/staff/days…) ----
// Matches the backend as built (editar-dia-agenda-back).

export type DaySlotState = "active" | "cancelled" | "started";

export interface DayEditorSlotDto {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  booked: number;
  state: DaySlotState;
  // Reason staff gave when cancelling (only when state is "cancelled").
  cancelReason: string | null;
  // Who runs this slot: after a slot edit it can differ from its band and from its neighbours.
  professionalId: string | null;
  professionalName: string | null;
}

export interface DayBandValuesDto {
  /** HH:mm, Montevideo. */
  startTime: string;
  endTime: string;
  professionalId: string | null;
  professionalName: string | null;
  capacity: number;
}

// One template's stretch of the day ("Mañana", "Tarde").
export interface DayBandDto {
  templateId: string;
  /** Hours of the template that day, e.g. "08:00 – 10:45". */
  label: string;
  durationMinutes: number;
  gapMinutes: number;
  template: DayBandValuesDto;
  effective: DayBandValuesDto;
  isOpen: boolean;
  // Single day only; [] when the editor was asked for a range.
  slots: DayEditorSlotDto[];
  // Range only: active slots and their bookings across the range.
  activeSlots: number;
  bookedCount: number;
}

export interface DayServiceEditorDto {
  service: ServiceType;
  bands: DayBandDto[];
}

// A slot added by hand (no template).
export interface DayIndividualSlotDto extends DayEditorSlotDto {
  service: ServiceType;
}

export interface DayBusyProfessionalDto {
  professionalId: string;
  startsAt: string;
  endsAt: string;
  slotId: string;
}

// GET /api/v1/staff/days?from=&to=
export interface DayEditorDto {
  from: string;
  to: string;
  isRange: boolean;
  // First and last day that still have slots to edit.
  editableFrom: string;
  editableTo: string;
  services: DayServiceEditorDto[];
  individualSlots: DayIndividualSlotDto[];
  // Active professionals only.
  professionals: { id: string; name: string }[];
  busyProfessionals: DayBusyProfessionalDto[];
}

export interface DayBandDraftDto {
  templateId: string;
  isOpen: boolean;
  startTime?: string;
  endTime?: string;
  professionalId?: string | null;
  capacity?: number;
}

// One slot's own professional and/or capacity, on top of its band's. Only what changed.
export interface SlotEditDto {
  slotId: string;
  professionalId?: string | null;
  capacity?: number;
}

export interface NewSlotDto {
  service: ServiceType;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  professionalId: string | null;
}

// Body of POST /api/v1/staff/days/preview (and of /apply, plus expectedAffectedBookings).
export interface DayDraftDto {
  from: string;
  to?: string;
  reason?: string;
  closeWholeDay?: boolean;
  // Only the bands that changed.
  bands: DayBandDraftDto[];
  // Only the slots that changed.
  slotEdits: SlotEditDto[];
  cancelSlotIds: string[];
  reopenSlotIds: string[];
  addSlots: NewSlotDto[];
  removeSlotIds: string[];
}

export interface DayImpactBookingsDto {
  total: number;
  // Session goes back to the package.
  package: number;
  // Plan or follow-up: nothing consumed.
  planOrFollowup: number;
  // Paid apart: ends up under "Pagos → Para revisar".
  payment: number;
}

// Response of POST /api/v1/staff/days/preview and /apply
export interface DayImpactDto {
  cancelledSlots: number;
  createdSlots: number;
  modifiedSlots: number;
  affectedBookings: DayImpactBookingsDto;
}

export type CancellationPaymentOutcome =
  | "session_returned"
  | "nothing_consumed"
  | "payment_under_review"
  | "hold_released"
  | "offline_charge"
  // The cancelled offline charge was already paid: the payment waits in Pagos for review.
  | "offline_charge_paid";

// POST /api/v1/staff/bookings/:id/cancel
export interface CancelBookingResultDto {
  bookingId: string;
  paymentOutcome: CancellationPaymentOutcome;
}

export const INBOX_ITEM_SOURCES = {
  NOTICE: "notice",
  ANNOUNCEMENT: "announcement",
} as const;

export type InboxItemSource = (typeof INBOX_ITEM_SOURCES)[keyof typeof INBOX_ITEM_SOURCES];

export interface InboxActionDto {
  label: string;
  href: string;
}

// GET /api/v1/me/inbox. Title and body come written by the API (the front never composes them);
// `id` carries its source in front (`notice:<uuid>` or `announcement:<uuid>`); `type` is one of
// booking_cancelled_by_staff, booking_hold_expired, payment_approved_later, payment_declined,
// auto_debit_charged, auto_debit_cancelled or announcement.
export interface InboxItemDto {
  id: string;
  source: InboxItemSource;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  action: InboxActionDto | null;
}

export interface InboxDto {
  items: InboxItemDto[];
  unreadCount: number;
}

// GET /api/v1/me/inbox/unread-count
export interface UnreadCountDto {
  unreadCount: number;
}

// GET /api/v1/staff/announcements (visibleUntil is a YYYY-MM-DD business date; the rest are instants)
export interface AnnouncementDto {
  id: string;
  body: string;
  visibleUntil: string;
  createdAt: string;
  createdByName: string;
  updatedAt: string;
  updatedByName: string | null;
}

export interface StaffAnnouncementsDto {
  active: AnnouncementDto[];
  expired: AnnouncementDto[];
}

// GET/PUT /api/v1/staff/birthdays/settings
export interface BirthdaySettingsDto {
  message: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  // Whole hour in Montevideo, 6 to 22.
  sendHour: number;
}

// One client in GET /api/v1/staff/birthdays/today
export interface TodayBirthdayDto {
  clientId: string;
  name: string;
  lastName: string | null;
  phone: string | null;
  age: number;
  // ISO; when this year's email was queued.
  mailSentAt: string | null;
  whatsappOpenedAt: string | null;
}

export interface TodayBirthdaysDto {
  // YYYY-MM-DD, Montevideo.
  date: string;
  items: TodayBirthdayDto[];
}

// GET /api/v1/staff/dashboard/today
export interface TodaySummaryDto {
  // Non-cancelled slots today and their booked seats (confirmed + pending_payment holds).
  bookingsToday: { bookings: number; slots: number };
  attendanceUnmarked: { bookings: number; slots: number };
  paymentsToReview: { purchases: number };
  expiringSoon: { clients: number; endingTomorrow: number; windowDays: number };
  overdueCharges: { charges: number; total: number; withoutAmount: number };
  clientsAtRisk: { clients: number; urgent: number };
}

// GET /api/v1/staff/dashboard/to-collect-today
export interface ToCollectTodayDto {
  // Sorted by startsAt. client is null when the charge has no client to show.
  items: {
    chargeId: string;
    client: { id: string; name: string; initials: string } | null;
    service: ServiceType;
    startsAt: string;
    amount: number | null;
    hasAttended: boolean;
    // A turn booked with an unpaid plan, shown once per plan with the plan's amount.
    paysWith: { itemName: string } | null;
  }[];
  total: number;
  withoutAmount: number;
  // Distinct clients among items: the API counts them, the front never does.
  clients: number;
}

// GET /api/v1/staff/dashboard/birthdays-today (not TodayBirthdaysDto: that one is the Cumpleaños endpoint)
export interface BirthdaysTodayDto {
  message: string;
  whatsappEnabled: boolean;
  items: {
    clientId: string;
    name: string;
    lastName: string | null;
    phone: string | null;
    age: number;
    whatsappOpenedAt: string | null;
    booking: { service: ServiceType; startsAt: string };
  }[];
}

// GET /api/v1/staff/dashboard/stats/{money|slots|clients}
// Dates are YYYY-MM-DD business dates, inclusive. Ratios go from 0 to 1.
export type StatsGranularity = "day" | "week" | "month";

export interface StatsWindowDto {
  from: string;
  to: string;
  inProgress: boolean;
}

export interface StatsMetaDto {
  period: StatsWindowDto;
  comparison: (StatsWindowDto & { hasData: boolean }) | null;
  dataSince: string | null;
  granularity: StatsGranularity;
  granularityOptions: StatsGranularity[];
}

// change is null when previous is null or 0. "percent" for counts and money, "points" for ratios.
export interface MetricValueDto {
  current: number | null;
  previous: number | null;
  change: number | null;
  changeUnit: "percent" | "points";
}

// GET /api/v1/staff/dashboard/stats/money
export interface MoneyStatsDto {
  meta: StatsMetaDto;
  collected: MetricValueDto;
  refunds: MetricValueDto;
  perDay: MetricValueDto;
  perActiveClient: MetricValueDto;
  byService: {
    service: ServiceType;
    amount: number;
    previousAmount: number | null;
    /** 0–1 of `collected`, or null when it is 0. The front only formats it. */
    share: number | null;
    /** Percent against `previousAmount`, or null when there is nothing to compare with. */
    change: number | null;
  }[];
  byMethod: {
    method: "mercado_pago" | "cash" | "transfer";
    amount: number;
    previousAmount: number | null;
    share: number | null;
    change: number | null;
  }[];
  series: {
    from: string;
    to: string;
    inProgress: boolean;
    byService: Record<ServiceType, number>;
    total: number;
    previousTotal: number | null;
  }[];
  approvedNotApplied: number;
}

// GET /api/v1/staff/dashboard/stats/slots
export interface SlotsStatsDto {
  meta: StatsMetaDto;
  /** `booked` and `offered` are the current window's seats, for "N de M cupos". */
  occupancy: MetricValueDto & { booked: number; offered: number };
  attendance: MetricValueDto;
  cancellations: MetricValueDto;
  sameDayCancellations: number;
  seats: {
    service: ServiceType;
    offered: number;
    booked: number;
    /** 0–1, or null when nothing was offered. */
    occupancy: number | null;
    attended: number;
    notAttended: number;
    unmarked: number;
    /** Bookings of slots that have not started yet (confirmed + pending holds); 0 for a period that ended. */
    upcoming: number;
    free: number;
  }[];
  cancellationsByReason: {
    reason: "client" | "staff" | "studio_closed" | "deactivation" | "staff_unknown";
    count: number;
    sameDay: number;
  }[];
  busyHours: { hour: number; byService: Record<ServiceType, number>; total: number }[];
  /** `rate` is 0–1 (booked ÷ offered), or null when nothing was offered. */
  heatmap: { isoWeekday: number; hour: number; offered: number; booked: number; rate: number | null }[];
}

// GET /api/v1/staff/dashboard/stats/clients
export interface ClientsStatsDto {
  meta: StatsMetaDto;
  active: MetricValueDto;
  joins: MetricValueDto;
  /** `pending`: plans that ended in the period and are still inside the grace days (null with Rehab, like `current`). */
  leaves: MetricValueDto & { pending: number | null };
  /** Clients the staff deactivated in the period. Not a number of plans, so Rehab has it too. */
  staffLeaves: MetricValueDto;
  paused: MetricValueDto;
  renewal: MetricValueDto & { renewed: number; due: number; pending: number };
  series: {
    from: string;
    to: string;
    inProgress: boolean;
    active: number;
    previousActive: number | null;
    joins: number;
    leaves: number;
    /** Leaves in progress of this bar: still inside the grace days. They add to `leaves`, they are not included in it; 0 with Rehab. */
    leavesPending: number;
  }[];
  /** `rate` is 0–1 (renewed ÷ due), or null when nothing was due. */
  renewalByService: { service: "performance" | "recovery"; renewed: number; due: number; rate: number | null }[];
  pauseReasons: { reason: string; count: number }[];
}
