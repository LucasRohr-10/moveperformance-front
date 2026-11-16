import Link from "next/link";

import type { TodaySummaryDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import type { HoyTileDef } from "./hoy-tiles";
import { InfoToggle } from "./info-toggle";

export interface HoyTileProps {
  def: HoyTileDef;
  summary: TodaySummaryDto;
}

/**
 * An article whose title link stretches over the whole tile: the "i" must be a sibling of that link, not
 * inside it, because an interactive element nested in a link is invalid.
 */
export function HoyTile({ def, summary }: HoyTileProps) {
  const value = def.value(summary);
  const isZero = value === 0;

  return (
    <article className="group relative flex min-w-0 flex-col gap-0.5 rounded border border-line bg-card p-3.5 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-white/40 hover:border-line-strong lg:px-[18px] lg:py-4">
      <div className="flex flex-wrap items-center gap-x-1.5 pr-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted lg:text-[11px] lg:tracking-[0.18em]">
        <h2 className="m-0 text-[length:inherit] font-[inherit] tracking-[inherit]">
          <Link href={def.href} className="outline-none after:absolute after:inset-0 after:content-['']">
            {def.label}
          </Link>
        </h2>
        <InfoToggle label={def.label} text={def.info(summary)} />
      </div>
      <span
        aria-hidden="true"
        className="absolute top-3.5 right-4 text-base text-muted transition group-hover:translate-x-0.5 group-hover:text-white"
      >
        →
      </span>
      <p className={cn("mt-1 font-display text-[26px] leading-[1.1] font-extrabold tabular-nums lg:text-[30px]", isZero && "text-muted")}>
        {value}
      </p>
      <p className="text-xs text-muted">{isZero ? def.zeroNote(summary) : def.note(summary)}</p>
    </article>
  );
}
