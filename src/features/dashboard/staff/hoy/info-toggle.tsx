"use client";

import { useId, useState } from "react";

export interface InfoToggleProps {
  /** What the number is called; the button's accessible name says "Qué significa {label}". */
  label: string;
  /** The definition, from the mockup. */
  text: string;
}

/**
 * The "i" next to a number. A button that opens the definition in place, so it works with keyboard and
 * touch (a hover tooltip does with neither). It is a sibling of the tile's link, never inside it: it
 * returns a fragment, and the definition takes a whole row of its parent's `flex-wrap`.
 */
export function InfoToggle({ label, text }: InfoToggleProps) {
  const [open, setOpen] = useState(false);
  const definitionId = useId();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={definitionId}
        aria-label={`Qué significa ${label}`}
        onClick={() => setOpen((current) => !current)}
        className="relative z-10 inline-flex size-[15px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-strong text-[9px] font-semibold normal-case tracking-normal text-muted before:absolute before:-inset-3 before:content-[''] hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        i
      </button>
      {open ? (
        <p id={definitionId} className="relative z-10 basis-full pt-1.5 text-xs font-normal normal-case tracking-normal text-[#bdbdbd]">
          {text}
        </p>
      ) : null}
    </>
  );
}
