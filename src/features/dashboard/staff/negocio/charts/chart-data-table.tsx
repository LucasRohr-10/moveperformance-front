import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@/components/ui/table";

export interface ChartDataTableProps {
  /** The name of the table for a screen reader: what the chart above shows. */
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

/** "Ver datos": the chart's numbers as a table, for whoever cannot read the drawing (and anyone who wants the exact figure). */
export function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  return (
    <details className="mt-3 text-xs">
      <summary aria-label={`Ver datos: ${caption}`} className="w-fit cursor-pointer text-muted hover:text-white">
        Ver datos
      </summary>
      <Table caption={caption} className="mt-2">
        <TableHeader>
          {columns.map((column, index) => (
            <TableHeaderCell key={column} align={index === 0 ? "left" : "right"} className="px-3 py-2">
              {column}
            </TableHeaderCell>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, index) => (
                <TableCell key={index} align={index === 0 ? "left" : "right"} className="px-3 py-2 tabular-nums">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </details>
  );
}
