import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import type { NoteIcon, NoteTone, PaymentNoteModel } from "./payment-card-model";

// A thin bar of the state's color and a faint tint: the note hangs from its card instead of competing with it.
const TONE_CLASSES: Record<NoteTone, string> = {
  success: "border-success bg-success/5 text-success",
  warning: "border-warning bg-warning/5 text-warning",
  danger: "border-danger bg-danger/5 text-danger",
  info: "border-info bg-info/5 text-info",
  neutral: "border-line-strong bg-white/5 text-muted",
};

const ICON_SHAPES: Record<NoteIcon, ReactNode> = {
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.5" />
    </>
  ),
  cross: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  spinner: <path d="M21 12a9 9 0 11-9-9" />,
  "calendar-x": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M10 14l4 4M14 14l-4 4" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 010 12h-3" />
    </>
  ),
};

function NoteIconShape({ icon }: { icon: NoteIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("mt-0.5 size-[15px] shrink-0", icon === "spinner" && "motion-safe:animate-spin")}
    >
      {ICON_SHAPES[icon]}
    </svg>
  );
}

export function PaymentNote({ note }: { note: PaymentNoteModel }) {
  return (
    <div className={cn("flex items-start gap-2.5 border-l-2 px-3 py-2", TONE_CLASSES[note.tone])}>
      <NoteIconShape icon={note.icon} />
      <div>
        <p className="text-[12.5px] font-semibold text-white">{note.title}</p>
        {note.body ? <p className="mt-px text-xs leading-snug text-muted">{note.body}</p> : null}
      </div>
    </div>
  );
}
