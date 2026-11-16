import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import type { ScheduleTemplate } from "@/lib/api/types";

import { templateDayRows } from "./template-form-model";

export interface TemplateListProps {
  templates: ScheduleTemplate[];
  pendingIds: Set<string>;
  onEdit: (template: ScheduleTemplate) => void;
  onRemove: (template: ScheduleTemplate) => void;
}

export function TemplateList({ templates, pendingIds, onEdit, onRemove }: TemplateListProps) {
  return (
    <TableBody>
      {templates.map((template) => {
        const isPending = pendingIds.has(template.id);
        return (
          <TableRow key={template.id}>
            <TableCell className="capitalize">{template.service}</TableCell>
            <TableCell>
              <dl className="grid w-fit grid-cols-[auto_auto] gap-x-6 gap-y-1">
                {templateDayRows(template.days).map(({ day, hours }) => (
                  <div key={day} className="contents">
                    <dt className="text-muted">{day}</dt>
                    <dd className="tabular-nums">{hours}</dd>
                  </div>
                ))}
              </dl>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {`${template.durationMinutes} min + ${template.gapMinutes} de margen`}
            </TableCell>
            <TableCell>{template.capacity}</TableCell>
            <TableCell className="text-muted">{template.professionalName ?? "—"}</TableCell>
            <TableCell align="right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  touchTarget
                  disabled={isPending}
                  onClick={() => onEdit(template)}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  touchTarget
                  disabled={isPending}
                  onClick={() => onRemove(template)}
                >
                  Eliminar
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
}

export function TemplateTableHeader() {
  return (
    <TableHeader>
      <TableHeaderCell>Servicio</TableHeaderCell>
      <TableHeaderCell>Días y horarios</TableHeaderCell>
      <TableHeaderCell>Duración</TableHeaderCell>
      <TableHeaderCell>Cupo</TableHeaderCell>
      <TableHeaderCell>Profesional</TableHeaderCell>
      <TableHeaderCell align="right">Acciones</TableHeaderCell>
    </TableHeader>
  );
}
