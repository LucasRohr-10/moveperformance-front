"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

export interface NavLink {
  label: string;
  href: string;
}

export function MobileNav({
  links,
  actions,
}: {
  links: NavLink[];
  actions?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((open) => !open)}
        className="rounded border border-line p-2 hover:bg-card"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {isOpen ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen ? (
        <nav
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-16 border-b border-line bg-bg px-6 py-4"
        >
          <ul className="flex flex-col gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            {links.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="block hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {actions ? (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-4">
              {actions}
            </div>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
