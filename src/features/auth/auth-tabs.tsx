import Link from "next/link";

import { cn } from "@/lib/cn";
import { ROUTES } from "@/config/constants/routes.constants";

const TABS = [
  { key: "login", label: "Iniciar sesión", href: ROUTES.LOGIN },
  { key: "register", label: "Crear cuenta", href: ROUTES.REGISTER },
] as const;

export function AuthTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav
      aria-label="Acceso"
      className="mt-10 grid grid-cols-2 rounded bg-soft p-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em]"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "rounded py-2.5",
            tab.key === active ? "bg-card text-white" : "text-muted hover:text-white",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
