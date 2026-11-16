"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

interface TeamBioProps {
  bio: string;
}

export function TeamBio({ bio }: TeamBioProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 flex-1">
      <p className={cn("text-sm leading-relaxed text-muted", !expanded && "line-clamp-4")}>{bio}</p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 text-xs font-semibold text-white underline underline-offset-2"
        aria-expanded={expanded}
      >
        {expanded ? "Ver menos" : "Ver más"}
      </button>
    </div>
  );
}
