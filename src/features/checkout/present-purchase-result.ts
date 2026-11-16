import { ROUTES } from "@/config/constants/routes.constants";
import { SERVICE_OPTIONS } from "@/features/bookings/service-options";
import {
  PAYMENT_METHODS,
  type PaymentMethod,
  type PurchaseKind,
  type PurchaseStatus,
  type PurchaseStatusDto,
  type ServiceType,
} from "@/lib/api/types";
import { formatPrice } from "@/lib/money";

import { bookingsHref, retryHref, reserveHref } from "./checkout-routes";
import { formatSlotDateTime } from "./business-time";
import { GENERIC_REJECTION_MESSAGE, rejectionMessage } from "./payment-rejection-reasons";
import { unpaidThings } from "./present-checkout";

export type ResultTone = "success" | "warning" | "danger" | "neutral";

export interface ResultAction {
  label: string;
  href: string;
}

export interface ResultDetail {
  label: string;
  value: string;
}

export interface PurchaseResultModel {
  badge: { label: string; tone: ResultTone };
  title: string;
  body: string;
  details: ResultDetail[];
  action: ResultAction | null;
  secondaryAction: ResultAction | null;
  canRecheck: boolean;
  isWaiting: boolean;
  /** Set only when the pick the user left behind timed out while they were paying. */
  selectionNote: string | null;
  /** The account data of a transfer still to pay, as staff wrote them. */
  transferDetails: string | null;
}

/** What the user still has waiting back in the booking flow, if anything. */
export interface PendingSelection {
  surface: "reservar" | "bookings";
  service: ServiceType;
}

export interface PurchaseResultInput {
  purchase: PurchaseStatusDto;
  timedOut: boolean;
  // The URL had status=rejected. It can only soften "pending", never prove a success (D11).
  providerSaysRejected: boolean;
  // The slots still waiting to be picked back up. Absent when there is nothing to resume.
  pendingSelection?: PendingSelection | null;
  // How many things the client may leave unpaid at MOVE (a staff setting). Absent when it is not known.
  unpaidLimit?: number | null;
  // It existed but timed out while they paid: say so instead of dropping it in silence.
  selectionExpired?: boolean;
}

type Badge = PurchaseResultModel["badge"];

const BADGES: Record<PurchaseStatus, Badge> = {
  pending: { label: "Pendiente", tone: "warning" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "Rechazado", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "danger" },
  expired: { label: "Vencido", tone: "danger" },
  // Only a payment recorded outside the app is waived; a Mercado Pago checkout never gets here.
  waived: { label: "No se cobra", tone: "neutral" },
};

const REVIEW_BADGE: Badge = { label: "En revisión", tone: "warning" };

const NOT_COMPLETED_TITLE = "Pago no completado";
const RETRY_LABEL = "Intentar de nuevo";

const IN_REVIEW_TITLE = "Estamos revisando tu pago";
const IN_REVIEW_BODY = (outcome: string): string =>
  `Mercado Pago todavía está procesando tu pago y puede demorar hasta 2 días hábiles. No pagues de nuevo: apenas se acredite, ${outcome}.`;

interface KindRules {
  itemLabel: string;
  approvedBody: string;
  notCompletedBody: string;
  timedOutBody: string;
  inReviewBody: string;
}

const KIND_RULES: Record<PurchaseKind, KindRules> = {
  plan: {
    itemLabel: "Plan",
    approvedBody: "Tu plan ya está activo.",
    notCompletedBody: "El pago no se completó. Podés intentarlo de nuevo.",
    timedOutBody:
      "No recibimos la confirmación de tu pago a tiempo. Si ya pagaste, tu plan se activa apenas se acredite el pago. Si no, intentá de nuevo.",
    inReviewBody: IN_REVIEW_BODY("tu plan se activa"),
  },
  booking: {
    itemLabel: "Turno",
    approvedBody: "Tu reserva está confirmada.",
    notCompletedBody: "El pago no se completó y liberamos el horario.",
    timedOutBody:
      "No recibimos la confirmación de tu pago a tiempo. Si ya pagaste, tu reserva se confirma apenas se acredite el pago. Si no, elegí el horario y intentá de nuevo.",
    inReviewBody: IN_REVIEW_BODY("tu reserva se confirma"),
  },
};

const RESERVE_LABEL = "Reservar un turno";
const PROFILE_ACTION: ResultAction = { label: "Ir a mi perfil", href: ROUTES.DASHBOARD };
const RESUME_LABEL = "Continuar con mis reservas";
const BACK_TO_SELECTION_LABEL = "Volver a la selección";
// The expiry is a UI convenience only — it can never touch a purchase or a paid booking.
const SELECTION_EXPIRED_NOTE =
  "Tu selección anterior venció. Tu pago y tu reserva no se vieron afectados.";

const serviceLabel = (service: ServiceType): string =>
  SERVICE_OPTIONS.find((option) => option.value === service)?.label ?? service;

const selectionHref = (selection: PendingSelection): string =>
  selection.surface === "bookings" ? bookingsHref(selection.service) : reserveHref(selection.service);

const resumeAction = (selection: PendingSelection | null | undefined, label: string): ResultAction | null =>
  selection ? { label, href: selectionHref(selection) } : null;

const WAITING = {
  badge: BADGES.pending,
  title: "Confirmando tu pago",
  body: "Estamos esperando la confirmación de Mercado Pago. No cierres esta página.",
};

const TIMED_OUT_TITLE = "Se agotó el tiempo de espera";

const retryAction = (purchase: PurchaseStatusDto, label = RETRY_LABEL): ResultAction => ({
  label,
  href: retryHref(purchase),
});

// A charge staff opened by hand can have no amount yet.
const UNDEFINED_AMOUNT = "A definir";
const amountText = (purchase: PurchaseStatusDto): string =>
  purchase.amount === null ? UNDEFINED_AMOUNT : formatPrice(purchase.amount);

const itemAndTotal = (purchase: PurchaseStatusDto): ResultDetail[] => [
  { label: KIND_RULES[purchase.kind].itemLabel, value: purchase.itemName },
  { label: "Total", value: amountText(purchase) },
];

// A bought plan is confirmed by its title and body alone; a booking also shows which
// service was booked and when — it is a reservation now, not a credit to spend later.
function approvedDetails(purchase: PurchaseStatusDto): ResultDetail[] {
  if (purchase.kind === "plan") return [];

  const [item, total] = itemAndTotal(purchase);
  const service: ResultDetail = { label: "Servicio", value: serviceLabel(purchase.service) };
  if (purchase.startsAt === null) return [item, service, total];
  return [item, service, { label: "Fecha y hora", value: formatSlotDateTime(purchase.startsAt) }, total];
}

// A period plan is named after its length ("Trimestral"); a pack has no length to name.
function approvedBody(purchase: PurchaseStatusDto): string {
  if (purchase.kind === "plan" && purchase.service === "performance") {
    return `Tu plan ${purchase.itemName.toLowerCase()} ya está activo.`;
  }
  return KIND_RULES[purchase.kind].approvedBody;
}

const BY_HAND_METHODS: readonly PaymentMethod[] = [PAYMENT_METHODS.CASH, PAYMENT_METHODS.TRANSFER];

/** Cash or transfer: nothing is waited from Mercado Pago, the client pays at MOVE. */
export function isPurchaseByHand(purchase: Pick<PurchaseStatusDto, "paymentMethod">): boolean {
  return BY_HAND_METHODS.includes(purchase.paymentMethod);
}

const BY_HAND_LABELS: Record<string, { medium: string; how: string }> = {
  [PAYMENT_METHODS.CASH]: { medium: "Efectivo", how: "en efectivo" },
  [PAYMENT_METHODS.TRANSFER]: { medium: "Transferencia", how: "por transferencia" },
};

const BY_HAND_BADGE: Badge = { label: "Confirmado", tone: "success" };

const BY_HAND_TITLES: Record<PurchaseKind, string> = {
  plan: "Tu plan ya está activo",
  booking: "Tu turno está reservado",
};

function byHandBody(purchase: PurchaseStatusDto, unpaidLimit: number | null | undefined): string {
  const pay = `Pagalo en MOVE ${BY_HAND_LABELS[purchase.paymentMethod].how}.`;
  if (purchase.kind === "booking" || unpaidLimit == null) return pay;
  return `${pay} Hasta que lo pagues podés tener como mucho ${unpaidThings(unpaidLimit)} sin pagar, contando el plan.`;
}

function byHandDetails(purchase: PurchaseStatusDto, amountRow: ResultDetail = { label: "A pagar en MOVE", value: amountText(purchase) }): ResultDetail[] {
  const toPay = [
    { label: KIND_RULES[purchase.kind].itemLabel, value: purchase.itemName },
    ...(purchase.kind === "booking" ? [{ label: "Servicio", value: serviceLabel(purchase.service) }] : []),
    { label: "Medio", value: BY_HAND_LABELS[purchase.paymentMethod].medium },
    amountRow,
  ];
  if (purchase.kind === "plan" || purchase.startsAt === null) return toPay;
  return [...toPay, { label: "Fecha y hora", value: formatSlotDateTime(purchase.startsAt) }];
}

// The purchase is made and the plan or turn is the client's: what is left is paying at MOVE, which staff records.
// Like an approved payment: whatever the client was in the middle of reserving leads, and the profile steps aside.
function presentByHand(
  purchase: PurchaseStatusDto,
  unpaidLimit: number | null | undefined,
  pendingSelection: PendingSelection | null | undefined,
): PurchaseResultModel {
  return result(
    { badge: BY_HAND_BADGE, title: BY_HAND_TITLES[purchase.kind], body: byHandBody(purchase, unpaidLimit) },
    {
      details: byHandDetails(purchase),
      action: resumeAction(pendingSelection, RESUME_LABEL) ?? { label: RESERVE_LABEL, href: reserveHref(purchase.service) },
      secondaryAction: PROFILE_ACTION,
      transferDetails: purchase.paymentMethod === PAYMENT_METHODS.TRANSFER ? purchase.transferDetails : null,
    },
  );
}

const BY_HAND_CLOSED_BADGES = {
  waived: BADGES.waived,
  // Nobody failed to pay: the booking was cancelled, so it is not the red "Cancelado" of a payment that broke.
  cancelled: { label: "Cancelado", tone: "neutral" },
} satisfies Record<"waived" | "cancelled", Badge>;

const SUBJECT_WORDS: Record<PurchaseKind, { thing: string; kept: string; cancelledTitle: string; cancelledBody: string }> = {
  plan: {
    thing: "plan",
    kept: "Tu plan sigue activo.",
    cancelledTitle: "Compra cancelada",
    cancelledBody: "Esta compra se canceló, así que ya no hay nada para pagar.",
  },
  booking: {
    thing: "turno",
    kept: "Tu reserva sigue confirmada.",
    cancelledTitle: "Reserva cancelada",
    cancelledBody: "Esta reserva se canceló, así que ya no hay nada para pagar.",
  },
};

// Staff marked it "No se cobra", or it was cancelled: there is no payment to wait for and no reason to try again.
function presentByHandClosed(purchase: PurchaseStatusDto, status: "waived" | "cancelled"): PurchaseResultModel {
  const words = SUBJECT_WORDS[purchase.kind];
  if (status === "waived") {
    return result(
      {
        badge: BY_HAND_CLOSED_BADGES.waived,
        title: "No hay nada para pagar",
        body: `El equipo de MOVE marcó que este ${words.thing} no se cobra. ${words.kept}`,
      },
      { action: PROFILE_ACTION },
    );
  }
  return result(
    { badge: BY_HAND_CLOSED_BADGES.cancelled, title: words.cancelledTitle, body: words.cancelledBody },
    {
      action: { label: RESERVE_LABEL, href: reserveHref(purchase.service) },
      secondaryAction: PROFILE_ACTION,
    },
  );
}

const FREE_AMOUNT = 0;

/** A purchase by hand that cost nothing (a 100 % discount) is settled on the spot: it comes back approved with $ 0. */
function isFreePurchase(purchase: Pick<PurchaseStatusDto, "status" | "paymentMethod" | "amount">): boolean {
  return purchase.status === "approved" && isPurchaseByHand(purchase) && purchase.amount === FREE_AMOUNT;
}

// Confirmed like any purchase by hand, but with nothing left to pay.
function presentFree(purchase: PurchaseStatusDto, pendingSelection: PendingSelection | null | undefined): PurchaseResultModel {
  return result(
    { badge: BY_HAND_BADGE, title: BY_HAND_TITLES[purchase.kind], body: "No hay nada para pagar: esta compra no tuvo costo." },
    {
      details: byHandDetails(purchase, { label: "Total", value: "Sin costo" }),
      action: resumeAction(pendingSelection, RESUME_LABEL) ?? { label: RESERVE_LABEL, href: reserveHref(purchase.service) },
      secondaryAction: PROFILE_ACTION,
    },
  );
}

function result(
  copy: { badge: Badge; title: string; body: string },
  rest: Partial<
    Pick<
      PurchaseResultModel,
      "details" | "action" | "secondaryAction" | "canRecheck" | "isWaiting" | "transferDetails"
    >
  > = {},
): PurchaseResultModel {
  return {
    details: [],
    action: null,
    secondaryAction: null,
    canRecheck: false,
    isWaiting: false,
    selectionNote: null,
    transferDetails: null,
    ...copy,
    ...rest,
  };
}

// The retry is offered only for a rejection already confirmed (by the API, or softened by the URL).
function presentRejected(
  purchase: PurchaseStatusDto,
  body: string,
  pendingSelection: PendingSelection | null | undefined,
): PurchaseResultModel {
  return result(
    { badge: BADGES.rejected, title: NOT_COMPLETED_TITLE, body },
    {
      action: retryAction(purchase),
      secondaryAction: resumeAction(pendingSelection, BACK_TO_SELECTION_LABEL),
    },
  );
}

// No "pay/pick again" while a payment may still be processing: the first one could be credited
// later and a second payment or a duplicate booking attempt would follow. The booking is not
// confirmed yet, so the slot being paid stays in the selection: resuming here brings it back
// along with the rest of the pick.
function presentStillProcessing(
  copy: { badge: Badge; title: string; body: string },
  pendingSelection: PendingSelection | null | undefined,
): PurchaseResultModel {
  return result(copy, {
    canRecheck: true,
    action: resumeAction(pendingSelection, RESUME_LABEL) ?? PROFILE_ACTION,
    secondaryAction: pendingSelection ? PROFILE_ACTION : null,
  });
}

// The latest payment decides, not the purchase: a rejected payment leaves the purchase pending so the
// client can try another card. The API wins over the URL, which only ever softens a "pending" (D11).
function presentPending({
  purchase,
  timedOut,
  providerSaysRejected,
  pendingSelection,
}: PurchaseResultInput): PurchaseResultModel {
  if (purchase.paymentStatus === "rejected") {
    return presentRejected(purchase, rejectionMessage(purchase.paymentStatusDetail), pendingSelection);
  }
  if (purchase.paymentStatus === "in_process") {
    return presentStillProcessing(
      { badge: REVIEW_BADGE, title: IN_REVIEW_TITLE, body: KIND_RULES[purchase.kind].inReviewBody },
      pendingSelection,
    );
  }
  if (providerSaysRejected) return presentRejected(purchase, GENERIC_REJECTION_MESSAGE, pendingSelection);
  if (!timedOut) return result(WAITING, { isWaiting: true });

  // The first payment may still be processing (the webhook is async): only once the API itself reports a real
  // rejection/cancellation/expiry (presentNotApproved) does "Intentar de nuevo" come back.
  return presentStillProcessing(
    { badge: BADGES.pending, title: TIMED_OUT_TITLE, body: KIND_RULES[purchase.kind].timedOutBody },
    pendingSelection,
  );
}

function presentNotApproved(
  purchase: PurchaseStatusDto,
  pendingSelection: PendingSelection | null | undefined,
): PurchaseResultModel {
  if (purchase.status === "expired" && purchase.kind === "booking") {
    return result(
      {
        badge: BADGES.expired,
        title: "Se venció el tiempo para pagar",
        body: "Liberamos el horario. Podés elegir otro.",
      },
      {
        action: retryAction(purchase, "Elegir otro horario"),
        secondaryAction: resumeAction(pendingSelection, BACK_TO_SELECTION_LABEL),
      },
    );
  }
  return result(
    { badge: BADGES[purchase.status], title: NOT_COMPLETED_TITLE, body: KIND_RULES[purchase.kind].notCompletedBody },
    { action: retryAction(purchase), secondaryAction: resumeAction(pendingSelection, BACK_TO_SELECTION_LABEL) },
  );
}

export function presentPurchaseResult(input: PurchaseResultInput): PurchaseResultModel {
  const model = presentStatus(input);
  return input.selectionExpired ? { ...model, selectionNote: SELECTION_EXPIRED_NOTE } : model;
}

function presentStatus(input: PurchaseResultInput): PurchaseResultModel {
  const { purchase, pendingSelection } = input;

  if (purchase.needsAttention) {
    return result(
      {
        badge: REVIEW_BADGE,
        title: "Revisamos tu pago",
        body: "Recibimos tu pago, pero necesitamos revisarlo. El equipo de MOVE te va a contactar.",
      },
      {
        details: itemAndTotal(purchase),
        action: PROFILE_ACTION,
        secondaryAction: resumeAction(pendingSelection, RESUME_LABEL),
      },
    );
  }
  if (isFreePurchase(purchase)) return presentFree(purchase, pendingSelection);
  if (purchase.status === "approved") {
    // Whatever was paid for is settled; the rest of the pick is what the user came back to
    // finish, so continuing with it leads and the profile steps aside.
    return result(
      {
        badge: BADGES.approved,
        title: "¡Listo! Tu pago fue aprobado.",
        body: approvedBody(purchase),
      },
      {
        details: approvedDetails(purchase),
        action: resumeAction(pendingSelection, RESUME_LABEL) ?? PROFILE_ACTION,
        secondaryAction: pendingSelection ? PROFILE_ACTION : null,
      },
    );
  }
  if (purchase.status === "pending" && isPurchaseByHand(purchase)) return presentByHand(purchase, input.unpaidLimit, pendingSelection);
  if ((purchase.status === "waived" || purchase.status === "cancelled") && isPurchaseByHand(purchase)) {
    return presentByHandClosed(purchase, purchase.status);
  }
  if (purchase.status === "pending") return presentPending(input);
  return presentNotApproved(purchase, pendingSelection);
}
