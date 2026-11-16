"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ROUTES } from "@/config/constants/routes.constants";
import { addDaysToDate } from "@/features/bookings";

import {
  COMPARE_PARAMS,
  dashboardHref,
  PERIOD_PARAMS,
  type CompareParam,
  type DashboardParams,
  type PeriodParam,
} from "../dashboard-params";

const PERIOD_OPTIONS: readonly { value: PeriodParam; label: string }[] = [
  { value: PERIOD_PARAMS.THIS_WEEK, label: "Esta semana" },
  { value: PERIOD_PARAMS.THIS_MONTH, label: "Este mes" },
  { value: PERIOD_PARAMS.LAST_MONTH, label: "Mes pasado" },
  { value: PERIOD_PARAMS.THIS_YEAR, label: "Este año (hasta hoy)" },
  { value: PERIOD_PARAMS.LAST_12_MONTHS, label: "Últimos 12 meses" },
  { value: PERIOD_PARAMS.CUSTOM, label: "Elegir fechas" },
];

const COMPARE_OPTIONS: readonly { value: CompareParam; label: string }[] = [
  { value: COMPARE_PARAMS.PREVIOUS, label: "Período anterior" },
  { value: COMPARE_PARAMS.LAST_YEAR, label: "Mismo período del año pasado" },
  { value: COMPARE_PARAMS.NONE, label: "No comparar" },
];

const RANGE_FIELDS = ["periodo", "desde", "hasta"];

// The API refuses a custom range of more than this many days, counting both ends: the date pickers stop short of it.
const MAX_RANGE_DAYS = 1096;

// What the GET form must carry besides the range: the view, the tab, the comparison and the service, with the
// defaults left out like in every href. The grouping goes: it may not exist for the new range.
function carriedFields(params: DashboardParams): [string, string][] {
  const [, query = ""] = dashboardHref({ ...params, granularity: null }).split("?");
  return [...new URLSearchParams(query)].filter(([name]) => !RANGE_FIELDS.includes(name));
}

export interface PeriodControlsProps {
  params: DashboardParams;
  /** Today's business date, from the server: the last day a range can end on. */
  today: string;
}

/** The "Período" and "Comparar con" menus. The URL is the state: every change replaces it. */
export function PeriodControls({ params, today }: PeriodControlsProps) {
  const router = useRouter();
  // "Elegir fechas" has nothing to ask the API until the range is applied, so opening it is local. This component
  // is not remounted when the URL moves ("atrás", a link), so what it shows follows the URL: when the period or the
  // range changes, the half-picked state is dropped and the dates start again from the URL.
  const urlRange = `${params.period}|${params.from}|${params.to}`;
  const [seenRange, setSeenRange] = useState(urlRange);
  const [picking, setPicking] = useState(false);
  const [from, setFrom] = useState(params.from ?? "");
  if (seenRange !== urlRange) {
    setSeenRange(urlRange);
    setPicking(false);
    setFrom(params.from ?? "");
  }
  const earliest = addDaysToDate(today, -(MAX_RANGE_DAYS - 1));
  const rangeOpen = params.period === PERIOD_PARAMS.CUSTOM || picking;

  const go = (next: DashboardParams) => router.replace(dashboardHref(next), { scroll: false });

  const changePeriod = (period: PeriodParam) => {
    if (period === PERIOD_PARAMS.CUSTOM) {
      setPicking(true);
      return;
    }
    setPicking(false);
    go({ ...params, period, from: null, to: null, granularity: null });
  };

  return (
    <>
      <Select
        label="Período"
        value={rangeOpen ? PERIOD_PARAMS.CUSTOM : params.period}
        onChange={(event) => changePeriod(event.target.value as PeriodParam)}
        className="mt-1 min-w-[190px] py-2 text-[13px]"
      >
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        label="Comparar con"
        value={params.compare}
        onChange={(event) => go({ ...params, compare: event.target.value as CompareParam })}
        className="mt-1 min-w-[190px] py-2 text-[13px]"
      >
        {COMPARE_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {rangeOpen ? (
        // Below the service chips in the DOM, so the chips stay on the menus' row. The `key` restarts the date
        // inputs when the URL brings another range; it goes on the wrapper because `<Form>` does not take one.
        <div key={`${params.from}|${params.to}`} className="order-last basis-full">
          <Form action={ROUTES.STAFF} replace scroll={false} className="flex flex-wrap items-end gap-3">
            {carriedFields(params).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <input type="hidden" name="periodo" value={PERIOD_PARAMS.CUSTOM} />
            <Input
              label="Desde"
              name="desde"
              type="date"
              required
              min={earliest}
              max={today}
              defaultValue={params.from ?? ""}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 py-2 text-[13px]"
            />
            <Input
              label="Hasta"
              name="hasta"
              type="date"
              required
              min={from || earliest}
              max={today}
              defaultValue={params.to ?? ""}
              className="mt-1 py-2 text-[13px]"
            />
            <Button type="submit" variant="secondary" touchTarget>
              Aplicar
            </Button>
          </Form>
        </div>
      ) : null}
    </>
  );
}
