import Link from "next/link";
import type { ReactNode } from "react";

import { ROUTES } from "@/config/constants/routes.constants";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between px-6">
          <Link href={ROUTES.HOME} className="font-display text-xl font-black tracking-tight">
            MOVE<span className="align-super text-[10px]">&reg;</span>
          </Link>
          <Link
            href={ROUTES.HOME}
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:text-white"
          >
            &larr; Volver al sitio
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
