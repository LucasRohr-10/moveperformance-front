"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/*
 * `/staff` is one route with Hoy and Negocio. A static import of a chart puts Recharts (~122 KB gzip) in the
 * chunk group of every client component of the route, so Hoy downloaded it without drawing a chart. Through
 * `next/dynamic` Recharts is its own chunk, fetched only when a chart is rendered. The wrapper has to be a
 * Client Component: `ssr: false` is not allowed in a Server Component.
 */

function StackedColumnsSkeleton() {
  return <Skeleton className="h-56 w-full bg-line" />;
}

function LineWithBarsSkeleton() {
  // The line (h-36) and the bars under it (h-28) in `line-with-bars-chart.tsx`.
  return <Skeleton className="h-64 w-full bg-line" />;
}

function DonutSkeleton() {
  // The donut is a fixed 150 px square (`SIZE` in donut-chart.tsx).
  return <Skeleton className="size-[150px] shrink-0 rounded-full bg-line" />;
}

export const LazyStackedColumnsChart = dynamic(
  () => import("./stacked-columns-chart").then((module) => module.StackedColumnsChart),
  { ssr: false, loading: StackedColumnsSkeleton },
);

export const LazyDonutChart = dynamic(() => import("./donut-chart").then((module) => module.DonutChart), {
  ssr: false,
  loading: DonutSkeleton,
});

export const LazyLineWithBarsChart = dynamic(
  () => import("./line-with-bars-chart").then((module) => module.LineWithBarsChart),
  { ssr: false, loading: LineWithBarsSkeleton },
);
