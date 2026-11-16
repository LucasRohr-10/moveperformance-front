"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ROUTES } from "@/config/constants/routes.constants";
import { cn } from "@/lib/cn";

import { MobileNav, type NavLink } from "./mobile-nav";

export interface NavbarProps {
  links: NavLink[];
  actions: ReactNode;
  mobileHeader?: ReactNode;
}

export function Navbar({ links, actions, mobileHeader }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header
      data-snackbar-anchor
      className={cn(
        "sticky top-0 z-50",
        mobileHeader
          ? "border-b border-line bg-bg md:bg-bg/90 md:backdrop-blur"
          : "border-b border-line bg-bg/90 backdrop-blur",
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex h-16 max-w-[1160px] items-center justify-between",
          mobileHeader ? "pr-3.5 pl-4 md:px-6" : "px-6",
        )}
      >
        <Link href={ROUTES.HOME} className="font-display text-xl font-black tracking-tight">
          MOVE<span className="align-super text-[10px]">&reg;</span>
        </Link>

        <nav className="hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted md:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "border-b-[1.5px] border-transparent pb-1 hover:text-white",
                pathname === link.href && "border-white text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 md:flex">{actions}</div>
          {mobileHeader ? (
            <div className="md:hidden">{mobileHeader}</div>
          ) : (
            <MobileNav links={links} actions={actions} />
          )}
        </div>
      </div>
    </header>
  );
}
