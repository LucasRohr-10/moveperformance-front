"use client";

import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSnackbar } from "@/components/ui/snackbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import type { Professional } from "@/lib/api/types";

import { createProfessional, listProfessionals, updateProfessional } from "./professionals-api";

type LoadStatus = "loading" | "ready" | "error";

const LOAD_FAILED = "No pudimos cargar los profesionales.";
const CREATE_FAILED = "No pudimos agregar el profesional. Probá de nuevo.";
const UPDATE_FAILED = "No pudimos cambiar el estado. Probá de nuevo.";

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function LoadingRows() {
  return (
    <TableBody>
      {[0, 1].map((row) => (
        <TableRow key={row}>
          <TableCell>
            <Skeleton className="h-4 w-40 bg-line" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20 bg-line" />
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </TableBody>
  );
}

export function ProfessionalsPanel() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const { showSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  function fetchProfessionals() {
    return listProfessionals()
      .then((loaded) => {
        setProfessionals(loaded);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  /** A retry or a reload after writing: show the skeleton again. */
  function load() {
    setStatus("loading");
    return fetchProfessionals();
  }

  useEffect(() => {
    void fetchProfessionals();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = new FormData(form).get("name");
    if (typeof name !== "string" || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await createProfessional({ name: name.trim() });
      form.reset();
      await load();
      showSnackbar({ tone: "success", title: "Profesional agregado" });
    } catch {
      showSnackbar({ tone: "danger", title: CREATE_FAILED });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(professional: Professional) {
    if (pendingIds.has(professional.id)) return;
    setPendingIds((ids) => new Set([...ids, professional.id]));
    try {
      await updateProfessional(professional.id, { active: !professional.active });
      await load();
      showSnackbar({ tone: "success", title: professional.active ? "Profesional desactivado" : "Profesional activado" });
    } catch {
      showSnackbar({ tone: "danger", title: UPDATE_FAILED });
    } finally {
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(professional.id);
        return next;
      });
    }
  }

  const activeCount = professionals.filter((professional) => professional.active).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Profesionales</h2>
        {status === "ready" ? (
          <span className="text-xs text-muted">
            {activeCount} activos de {professionals.length}
          </span>
        ) : null}
      </div>

      <Card>
        <form noValidate onSubmit={handleCreate} className="flex items-end gap-3">
          <Input label="Nombre" name="name" required />
          {/* Input's control renders at 42px (text-sm line-height + py-2.5 + border);
              Button's own text-[10px] line-height makes it ~35px, so bottom-aligning
              alone still left it looking sunken next to the labelled input. */}
          <Button
            type="submit"
            touchTarget
            disabled={isSubmitting}
            className="h-[42px]"
          >
            {isSubmitting ? "Agregando…" : "Agregar"}
          </Button>
        </form>
      </Card>

      <Card padding="none">
        {status === "error" ? (
          <EmptyState
            title={LOAD_FAILED}
            description="Puede ser un problema temporario del servidor."
            role="alert"
            action={
              <Button variant="secondary" touchTarget onClick={load}>
                Reintentar
              </Button>
            }
          />
        ) : status === "ready" && professionals.length === 0 ? (
          <EmptyState
            title="Todavía no hay profesionales"
            description="Agregá el primero con el formulario de arriba."
          />
        ) : (
          <>
          {status === "loading" ? (
            <p role="status" className="sr-only">
              Cargando profesionales…
            </p>
          ) : null}
          <Table caption="Profesionales">
            <TableHeader>
              <TableHeaderCell>Nombre</TableHeaderCell>
              <TableHeaderCell>Estado</TableHeaderCell>
              <TableHeaderCell align="right">Acciones</TableHeaderCell>
            </TableHeader>
            {status === "loading" ? (
              <LoadingRows />
            ) : (
              <TableBody>
                {professionals.map((professional) => (
                  <TableRow key={professional.id}>
                    <TableCell className="font-medium">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-soft text-xs font-semibold"
                        >
                          {initialsOf(professional.name)}
                        </span>
                        <span className="truncate">{professional.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={professional.active ? "Activo" : "Inactivo"}
                        tone={professional.active ? "success" : "neutral"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="ghost"
                        size="sm"
                        touchTarget
                        disabled={pendingIds.has(professional.id)}
                        onClick={() => toggleActive(professional)}
                      >
                        {professional.active ? "Desactivar" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
          </>
        )}
      </Card>
    </div>
  );
}
