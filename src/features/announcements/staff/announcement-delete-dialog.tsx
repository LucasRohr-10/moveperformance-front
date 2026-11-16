import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Notice } from "@/components/ui/notice";
import type { AnnouncementDto } from "@/lib/api/types";

export interface AnnouncementDeleteDialogProps {
  announcement: AnnouncementDto;
  isBusy: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function AnnouncementDeleteDialog({ announcement, isBusy, onConfirm, onCancel }: AnnouncementDeleteDialogProps) {
  return (
    <ConfirmDialog
      title="¿Eliminar este comunicado?"
      confirmLabel="Eliminar"
      cancelLabel="Volver"
      tone="destructive"
      isBusy={isBusy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="mt-4 whitespace-pre-line border-l-2 border-line-strong py-0.5 pl-3 text-[13.5px] leading-relaxed">
        {announcement.body}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Deja de verse <b className="font-semibold text-white">ahora mismo</b> en la campanita de notificaciones de todos
        los clientes.
      </p>
      <Notice tone="warning" role={null} className="mt-4">
        No se puede deshacer. Si lo necesitás de nuevo, hay que escribirlo y publicarlo otra vez.
      </Notice>
    </ConfirmDialog>
  );
}
