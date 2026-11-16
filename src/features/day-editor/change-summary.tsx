import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

import type { ChangeGroup, ChangeKind } from "./day-editor-model";
import type { EditorVariant } from "./day-editor-view";

export const REASON_MAX_LENGTH = 200;

const MARK: Record<ChangeKind, string> = { cancel: "×", add: "+", edit: "→", close: "×" };
const MARK_COLOR: Record<ChangeKind, string> = {
  cancel: "text-danger",
  add: "text-white",
  edit: "text-muted",
  close: "text-danger",
};

export interface ChangeSummaryProps {
  groups: ChangeGroup[];
  /** Said instead of the groups when there is nothing to list. */
  emptyHint: string;
  variant: EditorVariant;
}

// What saving would do, grouped by service (or by the days being closed).
export function ChangeSummary({ groups, emptyHint, variant }: ChangeSummaryProps) {
  const isMobile = variant === "mobile";

  if (groups.length === 0) {
    return <p className={cn("text-[13px] leading-normal text-muted", isMobile ? "mt-3" : "mt-2")}>{emptyHint}</p>;
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.scope} className={isMobile ? "pt-4 pb-1" : "pt-3.5 pb-1.5"}>
          <p className={cn("font-semibold", isMobile ? "mb-2.5 text-[13px]" : "mb-2 text-xs")}>{group.scope}</p>
          <ul className={cn("flex flex-col", isMobile ? "gap-2.5" : "gap-2")}>
            {group.items.map((item) => (
              <li
                key={item.text}
                className={cn(
                  "grid grid-cols-[16px_minmax(0,1fr)] items-baseline leading-[1.45]",
                  isMobile ? "gap-2.5 text-sm" : "gap-2 text-[13px]",
                )}
              >
                <span aria-hidden="true" className={cn("text-center text-[13px] font-semibold", MARK_COLOR[item.kind])}>
                  {MARK[item.kind]}
                </span>
                <span className="text-[#bdbdbd]">
                  {item.text}
                  {item.note ? <span className="text-[#7a7a7a]">{` · ${item.note}`}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export interface ReasonFieldProps {
  value: string;
  error: string | null;
  onChange: (reason: string) => void;
}

// Cancelling turnos tells each affected client why, so the backend wants a reason.
export function ReasonField({ value, error, onChange }: ReasonFieldProps) {
  return (
    <div className="pt-3.5">
      <Textarea
        label="Motivo *"
        value={value}
        maxLength={REASON_MAX_LENGTH}
        rows={3}
        error={error ?? undefined}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[72px] resize-none"
      />
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
        Le llega a cada cliente afectado por mail y como aviso en la app.
      </p>
    </div>
  );
}
