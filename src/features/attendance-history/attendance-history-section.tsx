import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MyAttendancePageDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { AttendanceHistoryList } from "./attendance-history-list";
import { getMyAttendance } from "./get-my-attendance";

interface AttendanceHistorySectionProps {
  page: number;
  hrefForPage: (page: number) => string;
}

// A failing API stays inside this card: the page keeps its heading and tabs. Next's own control-flow errors
// (redirect, prerender bail-outs) are rethrown untouched.
async function loadPage(page: number): Promise<MyAttendancePageDto | null> {
  try {
    return await getMyAttendance(page);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function AttendanceHistorySection({ page, hrefForPage }: AttendanceHistorySectionProps) {
  const data = await loadPage(page);
  if (!data) return <AttendanceHistoryErrorCard href={hrefForPage(page)} />;
  return <AttendanceHistoryList page={data} hrefForPage={hrefForPage} />;
}

export function AttendanceHistorySkeleton() {
  return (
    <Card aria-busy="true">
      <p className="text-sm text-muted">Cargando tu asistencia…</p>
    </Card>
  );
}

function AttendanceHistoryErrorCard({ href }: { href: string }) {
  return (
    <Card role="alert">
      <p className="text-sm font-medium">No pudimos cargar tu asistencia.</p>
      <p className="mt-1 text-xs text-muted">Probá de nuevo en unos minutos.</p>
      <Link href={href} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 min-h-11 sm:min-h-0")}>
        Reintentar
      </Link>
    </Card>
  );
}
