"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { signOut } from "@/features/auth/sign-out";
import { cn } from "@/lib/cn";
import type { AuthenticatedUser } from "@/lib/session";

import { getInitials } from "./get-initials";
import { GradientAvatar } from "./gradient-avatar";
import { MobileDropdownPanel } from "./mobile-dropdown-panel";

export interface AccountControlProps {
  user: AuthenticatedUser;
  isOpen: boolean;
  onToggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  showPlan?: boolean;
  settingsHref?: string;
}

export function AccountControl({
  user,
  isOpen,
  onToggle,
  triggerRef,
  showPlan = true,
  settingsHref,
}: AccountControlProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { showSnackbar } = useSnackbar();
  const initials = getInitials(user.name);

  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  // With cacheComponents, Next hides (not unmounts) this route on navigation —
  // clear transient state so a stuck "Cerrando sesión…" or stale error doesn't
  // reappear when the user comes back (mirrors AvatarMenu's same guard).
  useLayoutEffect(() => {
    return () => {
      setIsSigningOut(false);
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    const result = await signOut();

    if (!result.ok) {
      showSnackbar({ tone: "danger", title: "No pudimos cerrar tu sesión. Probá de nuevo." });
      setIsSigningOut(false);
      return;
    }

    router.replace(ROUTES.HOME);
    router.refresh();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="mobile-account-panel"
        aria-label={`Cuenta de ${user.name}`}
        onClick={onToggle}
        className={cn("rounded-full", isOpen && "ring-2 ring-white")}
      >
        <GradientAvatar initials={initials} size={32} />
      </button>

      {isOpen ? (
        <MobileDropdownPanel
          ref={panelRef}
          id="mobile-account-panel"
          role="menu"
          aria-label={`Cuenta de ${user.name}`}
          position="right-3 w-[260px] max-w-[calc(100vw-24px)]"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <GradientAvatar initials={initials} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
          </div>

          {showPlan ? (
            <div className="mx-4 mb-3.5 flex items-center justify-between rounded-[10px] border border-line bg-card px-3 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[2px] text-white">Plan</span>
              <span className="text-[11px] text-muted">Próximamente</span>
            </div>
          ) : null}

          {settingsHref ? (
            <Link
              href={settingsHref}
              role="menuitem"
              className="block border-t border-line px-4 py-[13px] text-[11px] font-bold uppercase tracking-[2px] text-white hover:bg-card"
            >
              Ajustes
            </Link>
          ) : null}

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="block w-full border-t border-line px-4 py-[13px] text-left text-[11px] font-bold uppercase tracking-[2px] text-muted hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </MobileDropdownPanel>
      ) : null}
    </>
  );
}
