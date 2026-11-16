"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavHref } from "@/components/layout/active-nav-link";
import type { NavLink } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/cn";

export interface MobileNavMenuProps {
  id: string;
  links: NavLink[];
  isOpen: boolean;
}

export function MobileNavMenu({ id, links, isOpen }: MobileNavMenuProps) {
  const pathname = usePathname();
  const activeHref = activeNavHref(pathname, links);

  if (!isOpen) return null;

  return (
    <nav
      id={id}
      className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-bg p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
    >
      <ul>
        {links.map((link) => (
          <li key={link.label} className="border-b border-line">
            <Link
              href={link.href}
              aria-current={link.href === activeHref ? "page" : undefined}
              className={cn(
                "block py-3.5 text-xs font-semibold tracking-[3px] uppercase text-muted",
                link.href === activeHref && "text-white",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
