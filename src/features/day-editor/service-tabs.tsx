"use client";

import { useRef, type KeyboardEvent } from "react";

import type { ServiceType } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { SERVICE_LABELS } from "./band-labels";
import { SERVICE_ORDER } from "./day-editor-model";
import type { EditorVariant } from "./day-editor-view";

export interface ServiceTabsProps {
  selected: ServiceType;
  onSelect: (service: ServiceType) => void;
  variant: EditorVariant;
}

// Underlined tabs. On the phone they split the width in three and the layout pins them under the header.
export function ServiceTabs({ selected, onSelect, variant }: ServiceTabsProps) {
  const buttons = useRef<Partial<Record<ServiceType, HTMLButtonElement | null>>>({});
  const isMobile = variant === "mobile";

  function move(index: number) {
    const target = SERVICE_ORDER[(index + SERVICE_ORDER.length) % SERVICE_ORDER.length];
    onSelect(target);
    buttons.current[target]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const next: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: SERVICE_ORDER.length - 1,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    move(next[event.key]);
  }

  return (
    <div
      role="tablist"
      aria-label="Servicio"
      className={cn(
        "text-[11px] font-semibold uppercase",
        isMobile
          ? "grid grid-cols-3 tracking-[0.15em]"
          : "flex flex-wrap gap-7 border-b border-line tracking-[0.2em]",
      )}
    >
      {SERVICE_ORDER.map((service, index) => {
        const isSelected = service === selected;
        return (
          <button
            key={service}
            ref={(element) => {
              buttons.current[service] = element;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(service)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "-mb-px border-b-[1.5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              isMobile ? "h-12 text-center" : "pb-3.5",
              isSelected ? "border-white text-white" : "border-transparent text-muted",
            )}
          >
            {SERVICE_LABELS[service]}
          </button>
        );
      })}
    </div>
  );
}
