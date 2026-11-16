import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AnnouncementDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { formatDayMonth, formatVisibleUntil } from "./announcement-dates";
import { AnnouncementMenu } from "./announcement-menu";

export interface AnnouncementCardProps {
  announcement: AnnouncementDto;
  isExpired: boolean;
  isEditing: boolean;
  onEdit(): void;
  onDelete(): void;
}

// One announcement of a list; the list's card draws the dividers between them. Only an active one can be
// deleted: an expired one is already gone from every client's bell.
export function AnnouncementCard({ announcement, isExpired, isEditing, onEdit, onDelete }: AnnouncementCardProps) {
  const { body, visibleUntil, createdAt, createdByName, updatedAt, updatedByName } = announcement;

  return (
    <li className={cn("px-[18px] py-4", isEditing && "ring-1 ring-inset ring-white")}>
      <div className="flex items-start justify-between gap-4">
        <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{body}</p>
        {isExpired ? (
          <Button variant="secondary" size="sm" touchTarget disabled={isEditing} onClick={onEdit} className="flex-none">
            {isEditing ? "Editando…" : "Editar"}
          </Button>
        ) : (
          <AnnouncementMenu isEditing={isEditing} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-muted">
        <StatusBadge label={isExpired ? "Vencido" : "Activo"} tone={isExpired ? "neutral" : "success"} />
        <span>Visible hasta el {formatVisibleUntil(visibleUntil)}</span>
        <span>
          Publicado el {formatDayMonth(createdAt)} por {createdByName}
        </span>
        {updatedByName ? (
          <span>
            Editado el {formatDayMonth(updatedAt)} por {updatedByName}
          </span>
        ) : null}
      </div>
    </li>
  );
}
