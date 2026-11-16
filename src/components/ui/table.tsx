import { cva, type VariantProps } from "class-variance-authority";
import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

/*
 * Compound components rather than a column-config prop. The six hand-rolled
 * staff tables put arbitrary markup in their cells — links, `StatusBadge`,
 * two-line name + slug stacks, rows of three buttons — and a config array would
 * need a render function per column anyway, which is just `<TableCell>` with
 * extra indirection. Compound components also map one-to-one onto the existing
 * markup, so migrating a table is a rename, not a rewrite.
 *
 * Visual reference: the plans table (`features/plans/staff/staff-plans-panel.tsx`).
 */

const alignVariants = cva("", {
  variants: {
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: {
    align: "left",
  },
});

type AlignProps = VariantProps<typeof alignVariants>;

/** A table needs an accessible name: a `caption` or, failing that, an `aria-label`. */
type TableNameProps =
  | { caption: string; "aria-label"?: never }
  | { caption?: never; "aria-label": string };

export type TableProps = Omit<
  TableHTMLAttributes<HTMLTableElement>,
  "aria-label" | "children"
> &
  TableNameProps & {
    children: ReactNode;
    /** Applied to the scroll wrapper, which is this component's root element. */
    className?: string;
  };

/**
 * Scrollable wrapper + `<table>`. The wrapper is the root, so `className`
 * (margins, `max-w-*`) lands on it; the table's own look is fixed.
 *
 * The caption is visually hidden: the staff tables are introduced by a page
 * heading, so rendering it would duplicate that text on screen while the name
 * is what assistive technology is missing.
 */
export function Table({ caption, className, children, ...props }: TableProps) {
  return (
    // `relative` makes the wrapper the containing block of the `sr-only` labels (absolute): otherwise they escape the
    // clip, sit at the table's far right and widen the whole page on a phone.
    <div className={cn("relative overflow-x-auto", className)}>
      <table className="w-full text-left text-sm" {...props}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

/** `<thead>` plus its single row: pass the header cells directly. */
export function TableHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={className} {...props}>
      <tr className="border-b border-line">{children}</tr>
    </thead>
  );
}

export interface TableHeaderCellProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "align">,
    AlignProps {}

export function TableHeaderCell({ className, align, ...props }: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted",
        alignVariants({ align }),
        className,
      )}
      {...props}
    />
  );
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-line last:border-b-0", className)} {...props} />
  );
}

export interface TableCellProps
  extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "align">,
    AlignProps {}

export function TableCell({ className, align, ...props }: TableCellProps) {
  return <td className={cn("px-5 py-4", alignVariants({ align }), className)} {...props} />;
}
