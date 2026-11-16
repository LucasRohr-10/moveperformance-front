"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { describedBy, Field, controlClass } from "@/components/ui/field";
import { useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { businessDateOf } from "@/features/checkout/business-time";
import { apiErrorMessage, apiFieldErrors } from "@/features/followup/api-error-message";
import type { AnnouncementDto } from "@/lib/api/types";

import { AnnouncementPublishDialog } from "./announcement-publish-dialog";
import { type AnnouncementFormErrors, validateAnnouncementForm } from "./announcement-form-values";
import { ANNOUNCEMENT_MAX_LENGTH } from "./announcements.constants";
import { editAnnouncement, publishAnnouncement } from "./staff-announcements-api";

export interface AnnouncementFormProps {
  // Present when editing: the form starts from it and sends only what changed.
  original?: AnnouncementDto;
  onSaved(announcement: AnnouncementDto): void;
  onCancel?(): void;
}

const SAVE_FAILED_MESSAGE = "No pudimos guardar el comunicado. Probá de nuevo.";

function fieldErrorsOf(error: unknown): AnnouncementFormErrors {
  const fromApi = apiFieldErrors(error);
  const errors: AnnouncementFormErrors = {};
  if (fromApi.body) errors.body = fromApi.body;
  if (fromApi.visibleUntil) errors.visibleUntil = fromApi.visibleUntil;
  return errors;
}

export function AnnouncementForm({ original, onSaved, onCancel }: AnnouncementFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // A ref, not state: two clicks in the same tick both see the same render's state.
  const isSavingRef = useRef(false);
  const [body, setBody] = useState(original?.body ?? "");
  const [visibleUntil, setVisibleUntil] = useState(original?.visibleUntil ?? "");
  const [errors, setErrors] = useState<AnnouncementFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  // A new announcement waits here for the staff to confirm it reaches everyone.
  const [pendingPublish, setPendingPublish] = useState<{ body: string; visibleUntil: string } | null>(null);
  const { showSnackbar } = useSnackbar();
  const showInvalidFields = useInvalidFieldsFeedback();
  const today = businessDateOf(new Date().toISOString());
  const isEditing = original !== undefined;

  // Editing starts from the card the staff picked, which may be far down the page.
  useEffect(() => {
    if (isEditing) bodyRef.current?.focus();
  }, [isEditing]);

  function save(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isSavingRef.current) return;

    const values = { body, visibleUntil };
    const found = validateAnnouncementForm(values, today, original);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      showInvalidFields(formRef.current, found);
      return;
    }

    const trimmed = body.trim();
    if (!original) {
      setPendingPublish({ body: trimmed, visibleUntil });
      return;
    }

    const patch = {
      ...(trimmed !== original.body && { body: trimmed }),
      ...(visibleUntil !== original.visibleUntil && { visibleUntil }),
    };
    if (Object.keys(patch).length === 0) {
      onCancel?.();
      return;
    }
    void submit(() => editAnnouncement(original.id, patch));
  }

  async function submit(request: () => Promise<AnnouncementDto>): Promise<void> {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setErrors({});
    try {
      const saved = await request();
      showSnackbar({ tone: "success", title: original ? "Cambios guardados." : "Comunicado publicado." });
      if (!original) {
        setBody("");
        setVisibleUntil("");
      }
      onSaved(saved);
    } catch (error) {
      const fieldErrors = fieldErrorsOf(error);
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) {
        showSnackbar({ tone: "danger", title: apiErrorMessage(error, SAVE_FAILED_MESSAGE) });
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
      setPendingPublish(null);
    }
  }

  const bodyId = `${formId}-body`;
  const counterId = `${formId}-counter`;
  const dateId = `${formId}-date`;
  return (
    <Card padding="sm">
      <form ref={formRef} onSubmit={save} noValidate>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {isEditing ? "Editar comunicado" : "Nuevo comunicado"}
        </p>
        <Field id={bodyId} label="Mensaje" error={errors.body} className="mt-4">
          <textarea
            ref={bodyRef}
            id={bodyId}
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Por ejemplo: el lunes feriado abrimos de 8:00 a 14:00."
            aria-invalid={Boolean(errors.body)}
            aria-describedby={describedBy(bodyId, errors.body, counterId)}
            className={controlClass(errors.body, "leading-relaxed")}
          />
          <p id={counterId} className="mt-1.5 text-right text-xs text-muted">
            {body.length}/{ANNOUNCEMENT_MAX_LENGTH}
          </p>
        </Field>
        <div className="mt-4 flex flex-wrap items-end gap-3.5">
          <Field id={dateId} label="Visible hasta" error={errors.visibleUntil} className="min-w-44 flex-1">
            <input
              id={dateId}
              type="date"
              min={today}
              value={visibleUntil}
              onChange={(event) => setVisibleUntil(event.target.value)}
              aria-invalid={Boolean(errors.visibleUntil)}
              aria-describedby={describedBy(dateId, errors.visibleUntil)}
              className={controlClass(errors.visibleUntil)}
            />
          </Field>
          <div className="flex gap-2">
            {isEditing ? (
              <Button type="button" variant="secondary" size="md" touchTarget disabled={isSaving} onClick={onCancel}>
                Cancelar
              </Button>
            ) : null}
            <Button type="submit" touchTarget disabled={isSaving}>
              {isEditing ? "Guardar cambios" : "Publicar"}
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Les llega a la campanita de <span className="text-white">todos los clientes</span> y se ve hasta el final
          del día que elijas.
        </p>
      </form>
      {pendingPublish ? (
        <AnnouncementPublishDialog
          {...pendingPublish}
          isBusy={isSaving}
          onConfirm={() => void submit(() => publishAnnouncement(pendingPublish))}
          onCancel={() => setPendingPublish(null)}
        />
      ) : null}
    </Card>
  );
}
