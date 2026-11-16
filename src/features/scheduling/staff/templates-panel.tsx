"use client";

import { useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSnackbar } from "@/components/ui/snackbar";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { Professional, ScheduleTemplate } from "@/lib/api/types";

import { listProfessionals } from "./professionals-api";
import { TemplateForm } from "./template-form";
import {
  bookingsCountText,
  skippedDaysText,
  type DaySuggestions,
  daySuggestionsFrom,
  formatTemplateDays,
  messagesSnackbar,
  saveErrorSnackbar,
} from "./template-form-model";
import { TemplateList, TemplateTableHeader } from "./template-list";
import {
  createTemplate,
  listTemplates,
  previewTemplateImpact,
  removeTemplate,
  updateTemplate,
  type TemplateChange,
  type TemplateInput,
} from "./templates-api";

type LoadStatus = "loading" | "ready" | "error";

const SAVE_ERROR_MESSAGE = "No se pudo guardar la plantilla. Intentá de nuevo.";
const REMOVE_ERROR_MESSAGE = "No se pudo eliminar el turno. Intentá de nuevo.";
const INVALID_FORM_MESSAGE = "Revisá los datos de la plantilla.";
const IMPACT_ERROR_MESSAGE = "No se pudo verificar el impacto del cambio. Intentá de nuevo.";

type FormMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; template: ScheduleTemplate };

type PendingConfirmation =
  | {
      kind: "update";
      template: ScheduleTemplate;
      change: TemplateChange;
      affectedBookings: number;
      skippedEditedDays: string[];
    }
  | { kind: "remove"; template: ScheduleTemplate; affectedBookings: number };

function LoadingRows() {
  return (
    <TableBody>
      {[0, 1, 2].map((row) => (
        <TableRow key={row}>
          {[0, 1, 2, 3, 4].map((cell) => (
            <TableCell key={cell}>
              <Skeleton className="h-4 w-20 bg-line" />
            </TableCell>
          ))}
          <TableCell />
        </TableRow>
      ))}
    </TableBody>
  );
}

function updateDescription(affectedBookings: number, skippedEditedDays: string[]): string {
  const base = `Hay ${bookingsCountText(affectedBookings)} en horarios que esta plantilla deja de generar. No se cancelan: siguen en pie.`;
  return skippedEditedDays.length > 0 ? `${base} ${skippedDaysText(skippedEditedDays)}` : base;
}

function removeDescription(template: ScheduleTemplate, affectedBookings: number): string {
  if (affectedBookings > 0) {
    return `Hay ${bookingsCountText(affectedBookings)} en horarios de esta plantilla. No se cancelan: siguen en pie. Deja de generar turnos nuevos.`;
  }
  return `${formatTemplateDays(template.days)}, ${template.service}. Deja de generar turnos nuevos; los que ya están reservados no se cancelan.`;
}

export function TemplatesPanel() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const { showSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);

  // The form starts collapsed: a disclosure behind "+ Nueva plantilla" rather
  // than permanently open, matching the reviewed design — reading the list is
  // the common case, creating one is occasional.
  const [formMode, setFormMode] = useState<FormMode>({ kind: "closed" });
  const isFormOpen = formMode.kind !== "closed";
  const newTemplateTriggerRef = useRef<HTMLButtonElement>(null);

  function closeForm({ restoreFocus } = { restoreFocus: false }) {
    setFormMode({ kind: "closed" });
    if (restoreFocus) newTemplateTriggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isFormOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeForm({ restoreFocus: true });
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen]);

  function fetchAll() {
    return Promise.all([listTemplates(), listProfessionals()])
      .then(([loadedTemplates, loadedProfessionals]) => {
        setTemplates(loadedTemplates);
        setProfessionals(loadedProfessionals);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  /** A retry or a reload after writing: show the skeleton again. */
  function load() {
    setStatus("loading");
    return fetchAll();
  }

  useEffect(() => {
    void fetchAll();
  }, []);

  // The form shows the suggestions it gets back, on the days they belong to.
  function showSaveError(caught: unknown): DaySuggestions | undefined {
    showSnackbar(saveErrorSnackbar(caught, SAVE_ERROR_MESSAGE));
    return daySuggestionsFrom(caught);
  }

  function markPending(id: string, isPending: boolean) {
    setPendingIds((ids) => {
      const next = new Set(ids);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleCreate(input: TemplateInput): Promise<DaySuggestions | undefined> {
    setIsSubmitting(true);
    try {
      const created = await createTemplate(input);
      await load();
      closeForm({ restoreFocus: true });
      showSnackbar({ tone: "success", title: "Plantilla creada" });
      if (created.skippedEditedDays?.length) {
        showSnackbar({ tone: "info", title: skippedDaysText(created.skippedEditedDays) });
      }
    } catch (caught) {
      return showSaveError(caught);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveUpdate(id: string, change: TemplateChange): Promise<DaySuggestions | undefined> {
    setIsSubmitting(true);
    try {
      await updateTemplate(id, change);
      await load();
      closeForm({ restoreFocus: true });
      showSnackbar({ tone: "success", title: "Cambios guardados." });
    } catch (caught) {
      return showSaveError(caught);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(template: ScheduleTemplate, input: TemplateInput): Promise<DaySuggestions | undefined> {
    // The preview and the PATCH take the same body, so what the pop-up warns
    // about is exactly what gets saved.
    const { service, ...change } = input;
    void service;
    setIsSubmitting(true);
    try {
      const impact = await previewTemplateImpact(template.id, change);
      const { affectedBookings } = impact;
      const skippedEditedDays = impact.skippedEditedDays ?? [];
      if (affectedBookings === 0) {
        const failure = await saveUpdate(template.id, change);
        if (!failure && skippedEditedDays.length > 0) {
          showSnackbar({ tone: "info", title: skippedDaysText(skippedEditedDays) });
        }
        return failure;
      }
      setConfirmation({ kind: "update", template, change, affectedBookings, skippedEditedDays });
    } catch (caught) {
      showSnackbar(saveErrorSnackbar(caught, IMPACT_ERROR_MESSAGE));
      return daySuggestionsFrom(caught);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveRequest(template: ScheduleTemplate) {
    markPending(template.id, true);
    try {
      const { affectedBookings } = await previewTemplateImpact(template.id, { active: false });
      setConfirmation({ kind: "remove", template, affectedBookings });
    } catch {
      showSnackbar({ tone: "danger", title: IMPACT_ERROR_MESSAGE });
    } finally {
      markPending(template.id, false);
    }
  }

  async function handleRemove(id: string) {
    setConfirmation(null);
    if (pendingIds.has(id)) return;
    markPending(id, true);
    try {
      await removeTemplate(id);
      await load();
      showSnackbar({ tone: "success", title: "Plantilla eliminada" });
    } catch {
      showSnackbar({ tone: "danger", title: REMOVE_ERROR_MESSAGE });
    } finally {
      markPending(id, false);
    }
  }

  async function handleConfirmUpdate(pending: Extract<PendingConfirmation, { kind: "update" }>) {
    setConfirmation(null);
    await saveUpdate(pending.template.id, pending.change);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Turnos de la semana</h2>
        <div className="flex items-center gap-3">
          {status === "ready" ? (
            <span className="text-xs text-muted">{templates.length} plantillas</span>
          ) : null}
          <button
            ref={newTemplateTriggerRef}
            type="button"
            aria-expanded={isFormOpen}
            aria-controls="new-template-form"
            onClick={() =>
              isFormOpen ? closeForm() : setFormMode({ kind: "create" })
            }
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {isFormOpen ? "Cerrar" : "+ Nueva plantilla"}
          </button>
        </div>
      </div>

      {formMode.kind !== "closed" ? (
        <Card>
          <TemplateForm
            key={formMode.kind === "edit" ? formMode.template.id : "create"}
            initial={formMode.kind === "edit" ? formMode.template : undefined}
            professionals={professionals}
            isSubmitting={isSubmitting}
            onSubmit={(input) =>
              formMode.kind === "edit" ? handleEdit(formMode.template, input) : handleCreate(input)
            }
            onInvalid={(messages) => showSnackbar(messagesSnackbar(messages, INVALID_FORM_MESSAGE))}
            onCancel={() => closeForm({ restoreFocus: true })}
          />
        </Card>
      ) : null}

      <Card padding="none">
        {status === "error" ? (
          <EmptyState
            title="No pudimos cargar los turnos"
            description="Puede ser un problema temporario del servidor."
            role="alert"
            action={
              <Button variant="secondary" touchTarget onClick={load}>
                Reintentar
              </Button>
            }
          />
        ) : status === "ready" && templates.length === 0 ? (
          <EmptyState
            title="Todavía no hay turnos configurados"
            description="Creá el primero con el formulario de arriba; de ahí salen los turnos de cada semana."
          />
        ) : (
          <>
            {status === "loading" ? (
              <p role="status" className="sr-only">
                Cargando turnos…
              </p>
            ) : null}
            <Table caption="Templates de turnos">
              <TemplateTableHeader />
              {status === "loading" ? (
                <LoadingRows />
              ) : (
                <TemplateList
                  templates={templates}
                  pendingIds={pendingIds}
                  onEdit={(template) => setFormMode({ kind: "edit", template })}
                  onRemove={handleRemoveRequest}
                />
              )}
            </Table>
          </>
        )}
      </Card>

      {confirmation?.kind === "update" ? (
        <ConfirmDialog
          title="¿Guardar los cambios?"
          description={updateDescription(confirmation.affectedBookings, confirmation.skippedEditedDays)}
          confirmLabel="Guardar igual"
          isBusy={isSubmitting}
          onConfirm={() => handleConfirmUpdate(confirmation)}
          onCancel={() => setConfirmation(null)}
        />
      ) : null}
      {confirmation?.kind === "remove" ? (
        <ConfirmDialog
          title="¿Eliminar este turno de la semana?"
          description={removeDescription(confirmation.template, confirmation.affectedBookings)}
          confirmLabel={confirmation.affectedBookings > 0 ? "Eliminar plantilla" : "Eliminar turno"}
          tone="destructive"
          isBusy={pendingIds.has(confirmation.template.id)}
          onConfirm={() => handleRemove(confirmation.template.id)}
          onCancel={() => setConfirmation(null)}
        />
      ) : null}

    </div>
  );
}
