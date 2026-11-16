import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/config/constants/routes.constants";
import { todayBusinessDate } from "@/features/bookings/slots";
import type { MyAttendancePageDto } from "@/lib/api/types";

import { AttendanceRowView } from "./attendance-row";
import { groupAttendanceByMonth } from "./present-attendance";

interface AttendanceHistoryListProps {
  page: MyAttendancePageDto;
  /** The page builds the links: the list does not know where it lives. */
  hrefForPage: (page: number) => string;
}

function Paging({ page, hrefForPage }: AttendanceHistoryListProps) {
  const totalPages = Math.ceil(page.total / page.pageSize);
  if (totalPages <= 1) return null;
  const linkClass = buttonVariants({ variant: "secondary", size: "sm", touchTarget: true });

  return (
    <nav aria-label="Páginas de asistencia" className="mt-6 flex items-center justify-between gap-3">
      {page.page > 1 ? (
        <Link href={hrefForPage(page.page - 1)} className={linkClass}>
          Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-muted">
        Página {page.page} de {totalPages}
      </span>
      {page.page < totalPages ? (
        <Link href={hrefForPage(page.page + 1)} className={linkClass}>
          Siguiente
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function EmptyList({ page, hrefForPage }: AttendanceHistoryListProps) {
  if (page.total === 0) {
    return (
      <EmptyState
        title="Todavía no tenés turnos pasados."
        action={
          <Link href={ROUTES.BOOKINGS} className={buttonVariants({ variant: "primary", size: "sm", touchTarget: true })}>
            Reservar
          </Link>
        }
      />
    );
  }
  return (
    <EmptyState
      title="No hay turnos en esta página."
      action={
        <Link href={hrefForPage(1)} className={buttonVariants({ variant: "secondary", size: "sm", touchTarget: true })}>
          Volver al principio
        </Link>
      }
    />
  );
}

export function AttendanceHistoryList({ page, hrefForPage }: AttendanceHistoryListProps) {
  if (page.items.length === 0) {
    return (
      <Card padding="none">
        <EmptyList page={page} hrefForPage={hrefForPage} />
      </Card>
    );
  }

  return (
    <div>
      {groupAttendanceByMonth(page, todayBusinessDate()).map((group) => (
        <section key={group.monthKey} className="mt-6 first:mt-0">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-muted">{group.heading}</h2>
            <span className="text-xs text-muted">{group.attendedLabel}</span>
          </div>
          <Card padding="none" className="divide-y divide-line">
            {group.rows.map((row) => (
              <AttendanceRowView key={row.id} row={row} />
            ))}
          </Card>
        </section>
      ))}
      <Paging page={page} hrefForPage={hrefForPage} />
    </div>
  );
}
