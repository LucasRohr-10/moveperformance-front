import type { ReactNode } from "react";

export interface NegocioCardProps {
  title: string;
  /** What sits on the right of the title: a toggle, the grouping links. */
  action?: ReactNode;
  children: ReactNode;
}

/** A card of Negocio: a title row and a body. Not a link: the numbers inside are what is read, not a place to go. */
export function NegocioCard({ title, action, children }: NegocioCardProps) {
  return (
    <section className="flex min-w-0 flex-col rounded border border-line bg-card">
      <div className="flex min-h-[52px] items-center justify-between gap-2.5 border-b border-line px-[18px] py-3">
        <h3 className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{title}</h3>
        {action}
      </div>
      <div className="flex-1 p-[18px]">{children}</div>
    </section>
  );
}
