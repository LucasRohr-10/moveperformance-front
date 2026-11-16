import Link from "next/link";
import type { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";

import { PageContainer } from "./page-container";

/** A link back up the trail; the current page is not one of these. */
export interface StaffBreadcrumb {
  label: string;
  href: string;
}

/**
 * The container every staff route shares. It used to be nine copies of the same
 * `div`, and the spacing below the title had already drifted between them.
 */
export function StaffPage({ children, className }: { children: ReactNode; className?: string }) {
  return <PageContainer className={className}>{children}</PageContainer>;
}

export interface StaffPageHeaderProps {
  title: string;
  /**
   * Only the ancestors. Top-level pages pass nothing: the sidebar already says
   * where you are, and an eyebrow repeating the title said the same word three
   * times. The detail routes do need it — it is their only way back.
   */
  breadcrumb?: StaffBreadcrumb[];
  description?: string;
  /** Right-aligned on the title's row: the page's primary action. */
  action?: ReactNode;
}

export function StaffPageHeader({
  title,
  breadcrumb,
  description,
  action,
}: StaffPageHeaderProps) {
  return (
    <header className="mb-9">
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav aria-label="Migas de pan" className="mb-3">
          <ol className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
            {breadcrumb.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-2">
                <Link href={crumb.href} className="hover:text-white">
                  {crumb.label}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
            <li aria-current="page" className="text-white">
              {title}
            </li>
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading as="h1" size="lg">
          {title}
        </Heading>
        {action}
      </div>

      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
    </header>
  );
}

/**
 * The `Suspense` fallback for a staff route: the real header, so the title does
 * not move when the content arrives, plus a block shaped like a panel. The
 * previous fallback was a small card reading "Cargando…", which jumped to a
 * seven-column table.
 */
export function StaffPageLoading({
  title,
  breadcrumb,
}: {
  title: string;
  breadcrumb?: StaffBreadcrumb[];
}) {
  return (
    <>
      <StaffPageHeader title={title} breadcrumb={breadcrumb} />
      <div role="status">
        <span className="sr-only">Cargando…</span>
        <Skeleton className="h-64 w-full bg-card" />
      </div>
    </>
  );
}
