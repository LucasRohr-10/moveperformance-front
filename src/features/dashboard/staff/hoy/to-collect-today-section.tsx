import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ROUTES } from "@/config/constants/routes.constants";
import { formatSlotTime } from "@/features/bookings";
import { planPhrase, SERVICE_LABELS, toCollectHref } from "@/features/payments/staff";
import type { ToCollectTodayDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatExactPrice } from "@/lib/money";

import { ServiceDot } from "../service-dot";
import { getToCollectToday } from "./get-to-collect-today";
import { HoySectionError } from "./hoy-section-error";
import { InfoToggle } from "./info-toggle";

const INFO = "Cobros en mano de turnos de hoy que todavía no se registraron como pagados.";

async function loadToCollect(): Promise<ToCollectTodayDto | null> {
  try {
    return await getToCollectToday();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

type Item = ToCollectTodayDto["items"][number];

function summaryLine({ items, withoutAmount, clients }: ToCollectTodayDto): string {
  if (items.length === 0) return "No hay nada para cobrar hoy ✓";
  const count = `${clients} ${clients === 1 ? "cliente" : "clientes"}`;
  return withoutAmount > 0 ? `${count} · ${withoutAmount} todavía sin monto` : count;
}

export async function ToCollectTodaySection() {
  const data = await loadToCollect();
  if (!data) return <HoySectionError title="No pudimos cargar lo que hay para cobrar hoy" />;

  const isEmpty = data.items.length === 0;
  // With no price on any charge the total is $ 0, which would read as "nothing to collect".
  const hasNoPrices = data.total === 0 && data.withoutAmount > 0;

  return (
    <section aria-label="Cobrar hoy" className="flex min-w-0 flex-col rounded border border-line bg-card">
      <div className="group relative flex flex-col gap-0.5 p-3.5 has-focus-visible:ring-2 has-focus-visible:ring-white/40 lg:px-[18px] lg:py-4">
        <div className="flex flex-wrap items-center gap-x-1.5 pr-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted lg:text-[11px] lg:tracking-[0.18em]">
          <h2 className="m-0 text-[length:inherit] font-[inherit] tracking-[inherit]">
            {/* The whole header links to today's Por cobrar; the "i" is a sibling above it. */}
            <Link href={toCollectHref(undefined, { today: true })} className="outline-none after:absolute after:inset-0 after:content-['']">
              Cobrar hoy
            </Link>
          </h2>
          <InfoToggle label="Cobrar hoy" text={INFO} />
        </div>
        <span
          aria-hidden="true"
          className="absolute top-3.5 right-4 text-base text-muted transition group-hover:translate-x-0.5 group-hover:text-white"
        >
          →
        </span>
        <p
          className={cn(
            "mt-1 font-display text-[26px] leading-[1.1] font-extrabold tabular-nums lg:text-[30px]",
            (isEmpty || hasNoPrices) && "text-muted",
          )}
        >
          {isEmpty ? 0 : hasNoPrices ? "—" : formatExactPrice(data.total)}
        </p>
        <p className="text-xs text-muted">{summaryLine(data)}</p>
      </div>
      {isEmpty ? null : (
        <ul className="border-t border-line">
          {data.items.map((item) => (
            <ChargeRow key={item.chargeId} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ChargeRow({ item }: { item: Item }) {
  const { client } = item;

  return (
    <li className="relative grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-t border-[#1c1c1c] px-[18px] py-[11px] first:border-t-0 hover:bg-white/[0.04] has-focus-visible:ring-2 has-focus-visible:ring-inset has-focus-visible:ring-white/40">
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-full border border-line bg-[#0b0b0b] text-[10px] font-semibold"
      >
        {client?.initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold">
          {client ? (
            <Link
              href={`${ROUTES.STAFF_CLIENTS}/${client.id}`}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {client.name}
            </Link>
          ) : (
            "Cliente sin datos"
          )}
        </p>
        {item.paysWith ? (
          // The mockup's line; the card is narrow, so it wraps instead of being cut.
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <ServiceDot service={item.service} className="mt-1" />
            <span>
              {formatSlotTime(item.startsAt)} · Turno {SERVICE_LABELS[item.service]} · se paga con {planPhrase(item.service, item.paysWith.itemName)}
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-1.5 truncate text-xs text-muted">
            <ServiceDot service={item.service} />
            {SERVICE_LABELS[item.service]} · {formatSlotTime(item.startsAt)}
          </p>
        )}
      </div>
      <div className="text-right whitespace-nowrap">
        <p className="font-display text-[15px] font-bold tabular-nums">
          {item.amount === null ? "—" : formatExactPrice(item.amount)}
        </p>
        {item.hasAttended ? <p className="text-[11px] text-warning">ya vino</p> : null}
      </div>
    </li>
  );
}
