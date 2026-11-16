import Link from "next/link";

import { StatusDot } from "@/components/ui/status-dot";
import type { ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import type { BookingPlanBannerLine, BookingPlanBannerSessions } from "./present-booking-plan-banner";
import { presentBookingPlanBanner } from "./present-booking-plan-banner";
import type { SubscriptionsModel } from "./present-subscriptions";

export interface BookingPlanBannerProps {
  model: SubscriptionsModel | null;
  service: ServiceType;
}

const SURFACE = "rounded border border-[#2a2a2a] bg-[#0d0d0d]";

/** Compact "what you have" summary shown inside the booking flow itself — the Dashboard
 *  keeps the full card layout; this is just enough to orient the user around their pick. */
export function BookingPlanBanner({ model, service }: BookingPlanBannerProps) {
  const banner = presentBookingPlanBanner(model, service);
  if (!banner) return null;

  if (banner.emptyCta) {
    return (
      <div className={cn(SURFACE, "flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-4 sm:px-6 sm:py-5")}>
        <span className="text-sm text-[#bdbdbd]">{banner.emptyCta.text}</span>
        <Link
          href={banner.emptyCta.href}
          className="rounded border border-[#2a2a2a] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition-colors hover:border-[#e3262f] hover:text-[#e3262f]"
        >
          Ver planes
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(SURFACE, "divide-y divide-[#2a2a2a]")}>
      {banner.lines.map((line) => (
        <PlanLine key={line.id} line={line} />
      ))}
    </div>
  );
}

function PlanLine({ line }: { line: BookingPlanBannerLine }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[15px] font-semibold leading-tight text-white">{line.title}</span>
          {line.detail ? <span className="text-xs leading-relaxed text-[#bdbdbd]">{line.detail}</span> : null}
        </div>
        <StatusDot label={line.badge.label} tone={line.badge.tone} className="pt-0.5" />
      </div>
      {line.sessions ? <SessionsMeter sessions={line.sessions} /> : null}
    </div>
  );
}

// The number the user actually came for, at headline size, over the share of the pack
// still unused. "Sin sesiones" is the one state that earns the accent.
function SessionsMeter({ sessions }: { sessions: BookingPlanBannerSessions }) {
  const isExhausted = sessions.remainingPercent === 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          className={cn(
            "font-display text-[26px] font-black leading-none",
            isExhausted ? "text-[#e3262f]" : "text-white",
          )}
        >
          {sessions.leftValue}
        </span>
        <span className="text-xs text-[#8a8a8a]">{sessions.totalText}</span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#8a8a8a]">{sessions.caption}</span>
      </div>
      {/* Decorative: the count right above already reads as text for a screen reader. */}
      <span aria-hidden="true" className="block h-[3px] w-full rounded-full bg-[#2a2a2a]">
        <span
          className={cn("block h-full rounded-full", isExhausted ? "bg-[#e3262f]" : "bg-white")}
          style={{ width: `${sessions.remainingPercent}%` }}
        />
      </span>
    </div>
  );
}
