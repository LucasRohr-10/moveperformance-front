"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { NavLink } from "@/components/layout/mobile-nav";
import type { AuthenticatedUser } from "@/lib/session";

import { AccountControl } from "./account-control";
import { MobileNavMenu } from "./mobile-nav-menu";
import { NotificationsControl } from "./notifications-control";

export interface MobileProfileHeaderProps {
  user: AuthenticatedUser;
  links: NavLink[];
  showPlan?: boolean;
  settingsHref?: string;
  // The staff has no notices: its header leaves the bell out.
  showNotifications?: boolean;
}

type Overlay = "notifications" | "account" | "menu" | null;

export function MobileProfileHeader({
  user,
  links,
  showPlan,
  settingsHref,
  showNotifications = true,
}: MobileProfileHeaderProps) {
  const [activeOverlay, setActiveOverlay] = useState<Overlay>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const notificationsTriggerRef = useRef<HTMLButtonElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);

  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setActiveOverlay(null);
  }

  useEffect(() => {
    if (!activeOverlay) return;

    function closeAndRestoreFocus(overlay: Overlay) {
      const triggerRef =
        overlay === "notifications"
          ? notificationsTriggerRef
          : overlay === "account"
            ? accountTriggerRef
            : overlay === "menu"
              ? menuTriggerRef
              : null;
      setActiveOverlay(null);
      triggerRef?.current?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveOverlay(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAndRestoreFocus(activeOverlay);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeOverlay]);

  function toggle(overlay: "notifications" | "account" | "menu") {
    setActiveOverlay((current) => (current === overlay ? null : overlay));
  }

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      <div className="flex h-10 items-center gap-0.5 rounded-full border border-line p-[3px]">
        <AccountControl
          user={user}
          isOpen={activeOverlay === "account"}
          onToggle={() => toggle("account")}
          triggerRef={accountTriggerRef}
          showPlan={showPlan}
          settingsHref={settingsHref}
        />
        {showNotifications ? (
          <NotificationsControl
            isOpen={activeOverlay === "notifications"}
            onToggle={() => toggle("notifications")}
            triggerRef={notificationsTriggerRef}
          />
        ) : null}
      </div>

      <button
        ref={menuTriggerRef}
        type="button"
        aria-expanded={activeOverlay === "menu"}
        aria-controls="mobile-profile-menu"
        aria-label={activeOverlay === "menu" ? "Cerrar menú" : "Abrir menú"}
        onClick={() => toggle("menu")}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {activeOverlay === "menu" ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <MobileNavMenu id="mobile-profile-menu" links={links} isOpen={activeOverlay === "menu"} />
    </div>
  );
}
