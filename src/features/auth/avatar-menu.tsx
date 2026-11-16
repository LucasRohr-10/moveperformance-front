"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { cn } from "@/lib/cn";
import type { AuthenticatedUser } from "@/lib/session";

import { signOut } from "./sign-out";

export interface AvatarMenuLink {
  label: string;
  href: string;
}

// Rough height of the open panel (email line + sign-out button + padding),
// used only to decide whether it fits below the button.
const MENU_HEIGHT_ESTIMATE = 160;
// Matches the panel's w-56 (14rem). Used only to decide whether it fits to
// the left of the button — needed in narrow containers like the Staff
// sidebar footer, where right-0 would push it past the left edge.
const MENU_WIDTH_ESTIMATE = 224;

// Two-letter initials ("Staff Demo" -> "SD") for the sidebar variant's
// bigger avatar; the compact variant keeps its single-letter avatar.
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function AvatarMenu({
  user,
  links,
  variant = "compact",
}: {
  user: AuthenticatedUser;
  // Extra navigation links shown above "Cerrar sesión" (e.g. a way back into
  // the authenticated area for menus rendered on the public pages).
  links?: AvatarMenuLink[];
  // "compact": small circular trigger with a floating panel, used in navbars.
  // "sidebar": full-width row with name/email, used in the Staff sidebar footer.
  variant?: "compact" | "sidebar";
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(false);
  const [alignsLeft, setAlignsLeft] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { showSnackbar } = useSnackbar();

  // With cacheComponents, Next hides (not unmounts) this route on navigation —
  // close the menu and clear transient state so it doesn't reappear stuck open
  // (or showing a stale error) when the user comes back.
  useLayoutEffect(() => {
    return () => {
      setIsOpen(false);
      setIsSigningOut(false);
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    const result = await signOut();

    if (!result.ok) {
      // The server session may still be valid — don't pretend we logged out.
      showSnackbar({ tone: "danger", title: "No pudimos cerrar tu sesión. Probá de nuevo." });
      setIsSigningOut(false);
      return;
    }

    router.replace(ROUTES.HOME);
    router.refresh();
  }

  function toggleOpen() {
    setIsOpen((open) => {
      const next = !open;
      if (next && buttonRef.current) {
        const { bottom, right } = buttonRef.current.getBoundingClientRect();
        setOpensUpward(bottom + MENU_HEIGHT_ESTIMATE > window.innerHeight);
        setAlignsLeft(right - MENU_WIDTH_ESTIMATE < 0);
      }
      return next;
    });
  }

  if (variant === "sidebar") {
    return (
      <div className="w-full">
        {isOpen ? (
          <div id="avatar-menu-panel" role="menu" className="border-t border-line px-1.5 pt-2 pb-1">
            {links?.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2.5 rounded px-3 py-2.5 text-left text-xs font-bold text-white hover:bg-white hover:text-black"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-2.5 rounded px-3 py-2.5 text-left text-xs font-bold text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        ) : null}

        <button
          ref={buttonRef}
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls="avatar-menu-panel"
          aria-label={`Cuenta de ${user.name}`}
          onClick={() => setIsOpen((open) => !open)}
          className={cn(
            "flex w-full items-center gap-2.5 py-3.5 pr-3 pl-3.5 text-left transition-colors",
            isOpen ? "border-t border-line bg-card" : "border-t border-transparent hover:bg-card",
          )}
        >
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-white font-display text-xs text-black">
            {getInitials(user.name)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-xs font-bold text-white">{user.name}</span>
            <span className="truncate text-[10px] text-muted">{user.email}</span>
          </span>
          <svg
            className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-300", isOpen && "rotate-180")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="avatar-menu-panel"
        aria-label={`Cuenta de ${user.name}`}
        onClick={toggleOpen}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-xs font-semibold hover:bg-line"
      >
        {user.name.charAt(0).toUpperCase()}
      </button>

      {isOpen ? (
        <div
          id="avatar-menu-panel"
          role="menu"
          className={cn(
            "absolute w-56 rounded border border-line bg-card p-3 text-sm shadow-lg",
            opensUpward ? "bottom-10" : "top-10",
            alignsLeft ? "left-0" : "right-0",
          )}
        >
          <p className="truncate px-2 py-1 text-xs text-muted">{user.email}</p>
          {links?.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="mt-1 block w-full rounded px-2 py-1.5 text-left text-white hover:bg-line"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-1 w-full rounded px-2 py-1.5 text-left text-white hover:bg-line disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
