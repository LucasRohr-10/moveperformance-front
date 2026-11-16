import type { ReactNode } from "react";

const TODAY_FORMAT = new Intl.DateTimeFormat("es-UY", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Montevideo",
});

// Built from the parts so the text does not depend on the punctuation ICU picks (no comma after the weekday).
function formatTodayEyebrow(): string {
  const parts = Object.fromEntries(TODAY_FORMAT.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.weekday} ${parts.day} de ${parts.month}`;
}

export interface DashboardHeaderProps {
  userName: string;
  /** The line under the greeting; it comes from its own request, so it brings its own `Suspense`. */
  children?: ReactNode;
}

export function DashboardHeader({ userName, children }: DashboardHeaderProps) {
  return (
    <header>
      <p className="m-0 text-[10px] font-medium uppercase tracking-[0.3em] text-muted lg:text-[11px] lg:tracking-[0.35em]">
        {formatTodayEyebrow()}
      </p>
      <h1 className="mt-3 mb-2.5 font-display text-[30px] leading-none font-black tracking-[-0.02em] uppercase lg:mt-3.5 lg:text-[44px]">
        {`Hola, ${userName}.`}
      </h1>
      {children}
    </header>
  );
}
