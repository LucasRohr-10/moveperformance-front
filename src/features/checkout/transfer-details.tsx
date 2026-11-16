"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { cn } from "@/lib/cn";

export const COPIED_VISIBLE_MS = 3000;

const COPY_LABEL = "Copiar datos";
const COPIED_LABEL = "Copiado";
const COPY_FAILED_MESSAGE = "No pudimos copiar. Copialo a mano.";

// aria-hidden: decorative only, the button name is its label.
function CopyIcon({ isCopied }: { isCopied: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-[13px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={isCopied ? 2.5 : 2}
    >
      {isCopied ? (
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      ) : (
        <>
          <rect x="9" y="9" width="12" height="12" rx="1" />
          <path d="M5 15V4a1 1 0 0 1 1-1h11" />
        </>
      )}
    </svg>
  );
}

// What staff wrote in Configuración, as it is, with a button to copy it.
// `textId` lets an option point at the text from its aria-describedby.
export function TransferDetails({ text, textId, className }: { text: string; textId?: string; className?: string }) {
  const { showSnackbar } = useSnackbar();
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Also reached when the browser has no clipboard API (navigator.clipboard is undefined).
      showSnackbar({ tone: "warning", title: COPY_FAILED_MESSAGE });
      return;
    }
    setIsCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsCopied(false), COPIED_VISIBLE_MS);
  }

  return (
    <div className={cn("mt-2 pl-4", className)}>
      <p id={textId} className="whitespace-pre-line border-l-2 border-line-strong pl-3 text-[13px] leading-relaxed text-white">{text}</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        touchTarget
        onClick={handleCopy}
        className={cn("mt-3 border-line-strong", isCopied && "border-success/50 text-success hover:bg-transparent")}
      >
        <CopyIcon isCopied={isCopied} />
        {isCopied ? COPIED_LABEL : COPY_LABEL}
      </Button>
    </div>
  );
}
