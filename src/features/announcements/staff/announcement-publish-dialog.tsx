import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { formatVisibleUntil } from "./announcement-dates";

export interface AnnouncementPublishDialogProps {
  body: string;
  visibleUntil: string;
  isBusy: boolean;
  onConfirm(): void;
  onCancel(): void;
}

// Asked before a new announcement goes out: it reaches every client and cannot be taken back by the form.
export function AnnouncementPublishDialog({
  body,
  visibleUntil,
  isBusy,
  onConfirm,
  onCancel,
}: AnnouncementPublishDialogProps) {
  return (
    <ConfirmDialog
      title="¿Publicar a todos los clientes?"
      confirmLabel="Publicar"
      cancelLabel="Volver"
      isBusy={isBusy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Lo van a ver <b className="font-semibold text-white">todos</b> en la campanita hasta el{" "}
        {formatVisibleUntil(visibleUntil)}.
      </p>
      <p className="mt-4 whitespace-pre-line border-l-2 border-line-strong py-0.5 pl-3 text-[13.5px] leading-relaxed">
        {body}
      </p>
    </ConfirmDialog>
  );
}
