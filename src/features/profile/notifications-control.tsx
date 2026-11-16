"use client";

import { type RefObject, useEffect, useRef } from "react";

import { inboxBellLabel, inboxCountText, InboxList, UnreadBadge, useInboxContext } from "@/features/inbox";
import type { InboxItemDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { MobileDropdownPanel } from "./mobile-dropdown-panel";

export interface NotificationsControlProps {
  isOpen: boolean;
  onToggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export function NotificationsControl({ isOpen, onToggle, triggerRef }: NotificationsControlProps) {
  const { unreadCount, list, loadList, markRead, openAction } = useInboxContext();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus();
    void loadList();
  }, [isOpen, loadList]);

  function handleOpenAction(item: InboxItemDto) {
    onToggle();
    openAction(item);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="mobile-notifications-panel"
        aria-label={inboxBellLabel(unreadCount)}
        onClick={onToggle}
        className={cn(
          "relative flex h-8 items-center gap-1.5 rounded-full pl-2 pr-2.5",
          isOpen && "bg-line",
        )}
      >
        <svg
          className="h-4 w-4 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <UnreadBadge count={unreadCount} />
      </button>

      {isOpen ? (
        <MobileDropdownPanel
          ref={panelRef}
          id="mobile-notifications-panel"
          role="dialog"
          aria-label="Notificaciones"
          position="left-3 right-3"
          className="flex max-h-[calc(100dvh-88px)] flex-col overflow-hidden"
        >
          <div className="flex flex-none items-center justify-between border-b border-line px-4 py-3.5">
            <span className="text-[10px] font-bold uppercase tracking-[2.5px] text-muted">
              Notificaciones
            </span>
            <span className="text-[11px] text-muted">{inboxCountText(unreadCount)}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <InboxList
              state={list}
              onRetry={() => void loadList()}
              onMarkRead={(id) => void markRead(id)}
              onOpenAction={handleOpenAction}
            />
          </div>
        </MobileDropdownPanel>
      ) : null}
    </>
  );
}
