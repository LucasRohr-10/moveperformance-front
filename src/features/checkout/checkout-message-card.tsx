import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export interface CheckoutMessageCardProps {
  title: string;
  body: string;
  action: { label: string; href: string } | null;
  isAlert?: boolean;
  children?: ReactNode;
}

export function CheckoutMessageCard({ title, body, action, isAlert, children }: CheckoutMessageCardProps) {
  return (
    <Card role={isAlert ? "alert" : undefined}>
      <h2 className="font-display text-2xl font-extrabold uppercase">{title}</h2>
      <p className="mt-3 text-sm text-muted">{body}</p>
      {action ? (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: "secondary", fullWidth: true, touchTarget: true }), "mt-6")}
        >
          {action.label}
        </Link>
      ) : null}
      {children}
    </Card>
  );
}

export function CheckoutSkeleton() {
  return (
    <Card aria-busy="true">
      <p className="text-sm text-muted">Cargando…</p>
    </Card>
  );
}
