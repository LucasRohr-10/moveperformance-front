"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export interface AnnouncementMenuProps {
  // The announcement being edited in the form cannot be picked to edit again.
  isEditing: boolean;
  onEdit(): void;
  onDelete(): void;
}

const ITEM_CLASS =
  "block w-full rounded px-2.5 py-2.5 text-left text-[13px] hover:bg-line disabled:cursor-not-allowed disabled:opacity-50";

// The "···" of an active announcement: what staff can do with it besides reading it.
export function AnnouncementMenu({ isEditing, onEdit, onDelete }: AnnouncementMenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function pick(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Acciones del comunicado"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded border border-line font-bold tracking-widest text-muted hover:text-white sm:h-8 sm:w-9",
          isOpen && "bg-card text-white",
        )}
      >
        <span aria-hidden="true">···</span>
      </button>
      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-10 mt-1.5 w-44 rounded border border-line-strong bg-card p-1.5 shadow-lg"
        >
          <button type="button" role="menuitem" disabled={isEditing} onClick={() => pick(onEdit)} className={ITEM_CLASS}>
            Editar
          </button>
          <button type="button" role="menuitem" onClick={() => pick(onDelete)} className={cn(ITEM_CLASS, "text-danger")}>
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}
