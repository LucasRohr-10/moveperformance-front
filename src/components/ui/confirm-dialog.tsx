"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ConfirmDialogProps {
  title: string;
  /** Why it matters: consequences, what is not undone, what could go wrong. Optional when `children` say it. */
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `destructive` reddens the confirm button; use it when data or state is lost. */
  tone?: "primary" | "destructive";
  /** Working on the confirmed action: both buttons are disabled and Escape/backdrop do not close. */
  isBusy?: boolean;
  /** Disables only the confirm button (e.g. data it depends on has not loaded); the person can still go back. */
  isConfirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Own content between the title and the buttons, e.g. a summary of what is being confirmed. */
  children?: ReactNode;
}

/**
 * Replaces `window.confirm` for the consequential staff actions. The native
 * dialog renders in the browser's own light chrome, which is the one thing in a
 * dark-only product that cannot be themed, and it cannot show more than a bare
 * string — one of these confirmations is a whole paragraph.
 *
 * Focus is managed the same way `features/profile/mobile-profile-header.tsx`
 * does it: Escape and the backdrop close, focus returns to whatever opened the
 * dialog. Tab cycles inside, so the page behind is unreachable while it is open.
 *
 * Cancel takes the initial focus: these are confirmations for actions that are
 * hard or impossible to undo, so the safe choice is the one under the cursor.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "primary",
  isBusy = false,
  isConfirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read once, on mount: the button that opened the dialog may re-render or
    // unmount while it is open, so the element is captured now and focused back
    // on close.
    const opener = document.activeElement;
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (!isBusy) onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded border border-line-strong bg-card p-6"
      >
        <h2 id={`${id}-title`} className="text-base font-semibold">
          {title}
        </h2>
        {description ? (
          <p id={`${id}-description`} className="mt-3 text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            data-autofocus
            type="button"
            variant="secondary"
            touchTarget
            disabled={isBusy}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "destructive" ? "destructive" : "primary"}
            touchTarget
            disabled={isBusy || isConfirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
