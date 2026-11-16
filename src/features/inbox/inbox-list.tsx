import { Fragment } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { InboxItemDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { formatInboxDate } from "./format-inbox-date";
import { type InboxIconTone, inboxIconFor } from "./inbox-type-icons";
import type { InboxListState } from "./use-inbox";

export interface InboxListProps {
  state: InboxListState;
  onRetry(): void;
  onMarkRead(id: string): void;
  onOpenAction(item: InboxItemDto): void;
  now?: Date;
}

const ICON_TONE_CLASSES: Record<InboxIconTone, string> = {
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  success: "border-success/40 bg-success/10 text-success",
  info: "border-info/40 bg-info/10 text-info",
};

const EMPTY_DESCRIPTION =
  "Acá te avisamos si cambia algo de tus turnos, pagos o débitos, y te llegan los comunicados de MOVE.";

export function InboxList({ state, onRetry, onMarkRead, onOpenAction, now }: InboxListProps) {
  if (state === "idle" || state === "loading") return <InboxLoading />;

  if (state === "error") {
    return (
      <EmptyState
        role="alert"
        className="py-8"
        title="No pudimos cargar tus avisos"
        description="Revisá tu conexión e intentá de nuevo."
        action={
          <Button type="button" variant="secondary" size="sm" touchTarget onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    );
  }

  if (state.items.length === 0) {
    return <EmptyState className="py-8" title="No tenés avisos" description={EMPTY_DESCRIPTION} />;
  }

  const reference = now ?? new Date();
  return (
    <ul className="divide-y divide-line">
      {state.items.map((item) => (
        <InboxRow
          key={item.id}
          item={item}
          now={reference}
          onMarkRead={onMarkRead}
          onOpenAction={onOpenAction}
        />
      ))}
    </ul>
  );
}

function InboxLoading() {
  return (
    <div role="status" className="divide-y divide-line">
      <span className="sr-only">Cargando avisos…</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="space-y-2 px-4 py-3.5">
          <Skeleton className="h-2.5 w-[55%] bg-line" />
          <Skeleton className="h-2.5 w-[92%] bg-line" />
          <Skeleton className="h-2.5 w-[30%] bg-line" />
        </div>
      ))}
    </div>
  );
}

const LABELLED_LINE = /^(Motivo): (.*)$/;

// The back writes one line per fact; a "Motivo: …" line gets its label in bold white.
function InboxBody({ body, isUnread }: { body: string; isUnread: boolean }) {
  return (
    <p className={cn("mt-1 whitespace-pre-line text-[12.5px] leading-relaxed", isUnread ? "text-white" : "text-muted")}>
      {body.split("\n").map((line, index) => {
        const labelled = LABELLED_LINE.exec(line);
        return (
          <Fragment key={index}>
            {index > 0 ? "\n" : null}
            {labelled ? (
              <>
                <strong className="font-semibold text-white">{labelled[1]}</strong> {labelled[2]}
              </>
            ) : (
              line
            )}
          </Fragment>
        );
      })}
    </p>
  );
}

interface InboxRowProps {
  item: InboxItemDto;
  now: Date;
  onMarkRead(id: string): void;
  onOpenAction(item: InboxItemDto): void;
}

function InboxRow({ item, now, onMarkRead, onOpenAction }: InboxRowProps) {
  const isUnread = item.readAt === null;
  const icon = inboxIconFor(item.type);

  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[26px] flex-none items-center justify-center rounded-full border text-xs font-bold",
            ICON_TONE_CLASSES[icon.tone],
            !isUnread && "opacity-45",
          )}
        >
          {icon.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("text-[13.5px] leading-snug", isUnread ? "font-semibold text-white" : "font-medium text-muted")}>
              {item.title}
            </p>
            <time dateTime={item.createdAt} className="flex-none text-[11px] text-muted">
              {formatInboxDate(item.createdAt, now)}
            </time>
          </div>
          <InboxBody body={item.body} isUnread={isUnread} />
          {item.action || isUnread ? (
            <div className="mt-2.5 flex flex-nowrap items-center justify-between gap-3">
              {item.action ? (
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "primary", size: "sm", touchTarget: true }), "whitespace-nowrap")}
                  onClick={() => onOpenAction(item)}
                >
                  {item.action.label}
                </button>
              ) : null}
              {isUnread ? (
                <button
                  type="button"
                  className="ml-auto inline-flex min-h-11 items-center whitespace-nowrap text-[11px] text-muted underline underline-offset-[3px] hover:text-white sm:min-h-0"
                  onClick={() => onMarkRead(item.id)}
                >
                  Marcar como leído
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
