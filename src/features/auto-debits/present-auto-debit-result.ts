// By path: the checkout index also exports server-only code (next/headers).
import { planCheckoutHref } from "@/features/checkout/checkout-routes";
import { formatBusinessDate } from "@/features/subscriptions/present-subscriptions";
import { ROUTES } from "@/config/constants/routes.constants";
import { AUTO_DEBIT_STATUSES, type AutoDebitDto, type AutoDebitStatus } from "@/lib/api/types";
import { formatPrice } from "@/lib/money";

export type AutoDebitResultState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error" }
  | { kind: "loaded"; debit: AutoDebitDto; timedOut: boolean };

export interface AutoDebitResultModel {
  badge: { label: string; tone: "success" | "warning" | "danger" } | null;
  title: string;
  body: string | null;
  details: { label: string; value: string }[];
  action: { label: string; href: string } | null;
  // A button that asks the API again.
  retryLabel: string | null;
  isWaiting: boolean;
  isAlert: boolean;
}

const PROFILE_ACTION = { label: "Ir a mi perfil", href: ROUTES.DASHBOARD };

function result(
  copy: Pick<AutoDebitResultModel, "title"> & Partial<AutoDebitResultModel>,
): AutoDebitResultModel {
  return {
    badge: null,
    body: null,
    details: [],
    action: null,
    retryLabel: null,
    isWaiting: false,
    isAlert: false,
    ...copy,
  };
}

const presentAuthorized = (debit: AutoDebitDto): AutoDebitResultModel =>
  result({
    badge: { label: "Activo", tone: "success" },
    title: "Débito automático activo",
    details: [
      { label: "Plan", value: debit.planName },
      { label: "Monto de cada cobro", value: formatPrice(debit.amount) },
      ...(debit.nextChargeOn === null
        ? []
        : [{ label: "Próximo cobro", value: formatBusinessDate(debit.nextChargeOn) }]),
    ],
    action: PROFILE_ACTION,
  });

function presentPending(timedOut: boolean): AutoDebitResultModel {
  if (timedOut) {
    return result({
      badge: { label: "Pendiente", tone: "warning" },
      title: "Débito en proceso",
      body: "Mercado Pago todavía no confirmó tu débito. Puede tardar unos minutos.",
      retryLabel: "Intentar de nuevo",
    });
  }
  return result({
    badge: { label: "Pendiente", tone: "warning" },
    title: "Confirmando tu débito",
    body: "Estamos esperando la confirmación de Mercado Pago. No cierres esta página.",
    isWaiting: true,
  });
}

const presentCancelled = (debit: AutoDebitDto): AutoDebitResultModel =>
  result({
    badge: { label: "No activado", tone: "danger" },
    title: "Débito no activado",
    body: "El débito automático no se activó o fue cancelado.",
    action: { label: "Volver a intentar", href: planCheckoutHref(debit.planId) },
  });

const LOADED_RESULTS: Record<AutoDebitStatus, (debit: AutoDebitDto, timedOut: boolean) => AutoDebitResultModel> = {
  [AUTO_DEBIT_STATUSES.PENDING]: (_debit, timedOut) => presentPending(timedOut),
  [AUTO_DEBIT_STATUSES.AUTHORIZED]: presentAuthorized,
  [AUTO_DEBIT_STATUSES.CANCELLED]: presentCancelled,
};

export function presentAutoDebitResult(state: AutoDebitResultState): AutoDebitResultModel {
  switch (state.kind) {
    case "loading":
      return result({ title: "Consultando tu débito…", isWaiting: true });
    case "not-found":
      return result({
        title: "No encontramos el débito",
        body: "Revisá el link o volvé a tu perfil.",
        action: PROFILE_ACTION,
      });
    case "error":
      return result({
        title: "No pudimos consultar tu débito.",
        body: "Probá de nuevo en unos minutos.",
        retryLabel: "Reintentar",
        isAlert: true,
      });
    case "loaded":
      return LOADED_RESULTS[state.debit.status](state.debit, state.timedOut);
  }
}
