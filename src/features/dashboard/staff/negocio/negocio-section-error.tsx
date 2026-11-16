import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import { ApiError } from "@/lib/api/errors";

import { dashboardHref, PERIOD_PARAMS, type DashboardParams } from "../dashboard-params";

const INVALID_RANGE_CODE = "DASHBOARD_INVALID_RANGE";
const UNSUPPORTED_CURRENCY_CODE = "DASHBOARD_UNSUPPORTED_CURRENCY";

/** The API refused the custom range (in the future, backwards or too long): trying again would fail the same way. */
export const isInvalidRangeError = (error: unknown): boolean =>
  error instanceof ApiError && error.body.code === INVALID_RANGE_CODE;

/** Plata found amounts that are not in pesos: the API never sums mixed currencies, and trying again changes nothing. */
export const isUnsupportedCurrencyError = (error: unknown): boolean =>
  error instanceof ApiError && error.body.code === UNSUPPORTED_CURRENCY_CODE;

/**
 * What a tab shows when its request fails. Reintentar goes to the same href, so the period and the service stay.
 * The tabs and the controls are outside the tab's `Suspense` and keep working.
 */
export function NegocioSectionError({ title, params }: { title: string; params: DashboardParams }) {
  return (
    <Card padding="none">
      <EmptyState
        title={title}
        description="Puede ser un problema temporario del servidor."
        role="alert"
        action={
          <Link href={dashboardHref(params)} className={buttonVariants({ variant: "secondary", touchTarget: true })}>
            Reintentar
          </Link>
        }
      />
    </Card>
  );
}

/**
 * What a tab shows when the URL carries a range the API refuses (typed by hand or from an old link). There is no
 * Reintentar: the link goes to the default period, keeping the tab, the comparison and the service.
 */
export function NegocioInvalidRange({ params }: { params: DashboardParams }) {
  const defaults = { ...params, period: PERIOD_PARAMS.LAST_MONTH, from: null, to: null, granularity: null };

  return (
    <Card padding="none">
      <EmptyState
        title="Ese rango de fechas no es válido."
        description="Tiene que terminar hoy o antes, y no puede pasar de 3 años."
        role="alert"
        action={
          <Link href={dashboardHref(defaults)} className={buttonVariants({ variant: "secondary", touchTarget: true })}>
            Ver el mes pasado
          </Link>
        }
      />
    </Card>
  );
}

/** What Plata shows when some amount is in another currency: a task for the technical team, so no Reintentar. */
export function NegocioUnsupportedCurrency() {
  return (
    <Card padding="none">
      <EmptyState
        title="Hay montos en otra moneda; avisale al equipo técnico."
        description="Plata solo suma pesos uruguayos, así que no puede mostrar este período."
        role="alert"
      />
    </Card>
  );
}
