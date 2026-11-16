"use client";

import Link from "next/link";
import { createContext, type FocusEvent, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import {
  autoDismisses,
  pushSnackbar,
  removeSnackbar,
  type SnackbarAction,
  type SnackbarEntry,
  type SnackbarInput,
  type SnackbarTone,
} from "./snackbar-stack";

export type { SnackbarAction, SnackbarInput, SnackbarTone };

export const SNACKBAR_DURATION_MS = 4_000;
const EXIT_MS = 150;

interface SnackbarContextValue {
  showSnackbar(input: SnackbarInput): void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (!context) throw new Error("useSnackbar must be used inside SnackbarProvider");
  return context;
}

/**
 * For a failure kept in state (a hook's `error`): shows it as an error snackbar
 * every time it appears. A retry clears the state first, so the same message
 * failing again shows again.
 */
export function useErrorSnackbar(message: string | null | undefined): void {
  const { showSnackbar } = useSnackbar();
  useEffect(() => {
    if (message) showSnackbar({ tone: "danger", title: message });
  }, [message, showSnackbar]);
}

// Mounted once in the root layout, so a snackbar shown right before a
// navigation is still on screen in the next page.
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SnackbarEntry[]>([]);
  const nextId = useRef(0);

  const showSnackbar = useCallback((input: SnackbarInput) => {
    nextId.current += 1;
    const entry = { ...input, id: `snackbar-${nextId.current}` };
    setStack((current) => pushSnackbar(current, entry));
  }, []);

  const dismiss = useCallback((id: string) => setStack((current) => removeSnackbar(current, id)), []);
  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {/* Below the sticky navbar when there is one (h-16 + 12px), else 16px from the top. */}
      <div className="pointer-events-none fixed inset-x-3 top-4 z-[60] mx-auto flex max-w-[420px] flex-col gap-2 [body:has([data-snackbar-anchor])_&]:top-[76px]">
        {stack.map((entry) => (
          <SnackbarItem key={entry.id} entry={entry} onDismiss={dismiss} />
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

// One neutral box for every tone; only the glyph and the progress bar carry the tone color.
const TONE_CLASSES: Record<SnackbarTone, { icon: string; bar: string }> = {
  success: { icon: "bg-success", bar: "bg-success" },
  danger: { icon: "bg-danger", bar: "bg-danger" },
  warning: { icon: "bg-warning", bar: "bg-warning" },
  info: { icon: "bg-info", bar: "bg-info" },
};

const TONE_GLYPH: Record<SnackbarTone, string> = { success: "✓", danger: "!", warning: "!", info: "i" };

function SnackbarItem({ entry, onDismiss }: { entry: SnackbarEntry; onDismiss: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const tone = TONE_CLASSES[entry.tone];
  const actions = entry.actions ?? (entry.action ? [entry.action] : []);
  const isTall = (entry.items?.length ?? 0) > 0 || (entry.groups?.length ?? 0) > 0 || actions.length > 0;
  const counting = autoDismisses(entry) && !pinned && !hovered && !focused && !leaving;

  const close = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    if (!counting) return;
    const timer = setTimeout(close, SNACKBAR_DURATION_MS);
    return () => clearTimeout(timer);
  }, [counting, close]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onDismiss(entry.id), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, onDismiss, entry.id]);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }

  return (
    <div
      role={entry.tone === "danger" ? "alert" : "status"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onClick={() => setPinned(true)}
      className={cn(
        "pointer-events-auto relative flex gap-3 overflow-hidden rounded-md border border-line-strong/50 bg-raised py-3 pl-4 pr-3.5 pb-3.5 text-[13px] leading-snug shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-opacity duration-150 motion-safe:animate-snackbar-in",
        isTall ? "items-start" : "items-center",
        leaving && "opacity-0",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("grid size-[22px] shrink-0 place-items-center rounded-full text-xs font-bold text-black", tone.icon)}
      >
        {TONE_GLYPH[entry.tone]}
      </span>
      <div className="flex flex-1 flex-col gap-0.5 ">
        <p data-snackbar-title className="text-sm font-semibold text-white">
          {entry.title}
        </p>
        {entry.message ? <p className="text-[#d4d4d4]">{entry.message}</p> : null}
        {entry.items && entry.items.length > 0 ? (
          <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-4 text-[#d4d4d4]">
            {entry.items.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        ) : null}
        {entry.groups && entry.groups.length > 0 ? (
          <div data-testid="snackbar-groups" className="mt-1 flex max-h-64 flex-col gap-3 overflow-y-auto">
            {entry.groups.map((group) => (
              <div key={group.items.join("|")}>
                <ul className="list-disc pl-4 text-[#d4d4d4]">
                  {group.items.map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ul>
                {group.note ? <p className="mt-1.5 text-[#d4d4d4]">{group.note}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
        {actions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <SnackbarActionControl key={action.label} action={action} onUsed={close} />
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" onClick={close} aria-label="Cerrar aviso" className="text-base leading-none text-muted hover:text-white">
        ×
      </button>
      {counting ? (
        <span
          data-testid="snackbar-progress"
          aria-hidden="true"
          className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left motion-safe:animate-snackbar-progress", tone.bar)}
        />
      ) : null}
    </div>
  );
}

const ACTION_CLASS =
  "shrink-0 whitespace-nowrap rounded border border-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white";

function SnackbarActionControl({
  action,
  onUsed,
}: {
  action: SnackbarAction;
  onUsed: () => void;
}) {
  if ("href" in action) {
    return (
      <Link href={action.href} onClick={onUsed} className={ACTION_CLASS}>
        {action.label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        action.onClick();
        onUsed();
      }}
      className={ACTION_CLASS}
    >
      {action.label}
    </button>
  );
}
