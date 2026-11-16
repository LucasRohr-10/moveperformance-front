"use client";

import { useCallback, useEffect, useState } from "react";

import { StaffPageHeader } from "@/components/layout/staff-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSnackbar } from "@/components/ui/snackbar";
import { listTodayBirthdays, StaffBirthdaysPanel } from "@/features/birthdays";
import { apiErrorMessage } from "@/features/followup/api-error-message";
import type { AnnouncementDto, StaffAnnouncementsDto, TodayBirthdaysDto } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { AnnouncementCard } from "./announcement-card";
import { AnnouncementDeleteDialog } from "./announcement-delete-dialog";
import { AnnouncementForm } from "./announcement-form";
import { AnnouncementsViewToggle, type AnnouncementsView } from "./announcements-view-toggle";
import { groupExpiredByMonth } from "./group-expired-by-month";
import { deleteAnnouncement, listStaffAnnouncements } from "./staff-announcements-api";

type LoadState = "loading" | "error" | { data: StaffAnnouncementsDto };
type Tab = "general" | "birthdays";

const DELETE_FAILED_MESSAGE = "No pudimos eliminar el comunicado. Probá de nuevo.";

const DESCRIPTION = "Mensajes para todos los clientes. Les llegan a la campanita hasta la fecha que elijas.";

export function StaffAnnouncementsPanel() {
  const [tab, setTab] = useState<Tab>("general");
  // Today's birthdays, read up front for the tab's count; the birthday tab shows a failure with a retry.
  const [today, setToday] = useState<TodayBirthdaysDto | null>(null);
  const [todayFailed, setTodayFailed] = useState(false);
  const [state, setState] = useState<LoadState>("loading");
  const [view, setView] = useState<AnnouncementsView>("active");
  const [editing, setEditing] = useState<AnnouncementDto | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showSnackbar } = useSnackbar();

  // A reload after writing keeps what is on screen until the new lists arrive.
  const load = useCallback(() => {
    listStaffAnnouncements().then(
      (data) => setState({ data }),
      () => setState((current) => (typeof current === "object" ? current : "error")),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadToday = useCallback(() => {
    listTodayBirthdays().then(
      (loaded) => {
        setToday(loaded);
        setTodayFailed(false);
      },
      () => setTodayFailed(true),
    );
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  function retryToday() {
    setTodayFailed(false);
    loadToday();
  }

  function retry() {
    setState("loading");
    load();
  }

  function handleSaved() {
    if (editing) setEditing(null);
    else setView("active");
    load();
  }

  async function handleConfirmDelete(announcement: AnnouncementDto) {
    setIsDeleting(true);
    try {
      await deleteAnnouncement(announcement.id);
      showSnackbar({ tone: "success", title: "Comunicado eliminado." });
      if (editing?.id === announcement.id) setEditing(null);
    } catch (error) {
      showSnackbar({ tone: "danger", title: apiErrorMessage(error, DELETE_FAILED_MESSAGE) });
    } finally {
      setIsDeleting(false);
      setDeleting(null);
      load();
    }
  }

  const data = typeof state === "object" ? state.data : null;

  return (
    <div>
      <StaffPageHeader title="Comunicados" description={DESCRIPTION} />

      <AnnouncementsTabs tab={tab} birthdaysToday={today?.items.length ?? 0} onChange={setTab} />

      {tab === "birthdays" ? (
        <StaffBirthdaysPanel
          today={today}
          todayFailed={todayFailed}
          onRetryToday={retryToday}
          onTodayChange={setToday}
        />
      ) : null}

      <div hidden={tab !== "general"}>
        <AnnouncementForm
          key={editing?.id ?? "new"}
          original={editing ?? undefined}
          onSaved={handleSaved}
          onCancel={editing ? () => setEditing(null) : undefined}
        />

        <div className="mt-8">
          {state === "loading" ? <AnnouncementsLoading /> : null}
          {state === "error" ? (
            <Card padding="none">
              <EmptyState
                role="alert"
                title="No pudimos cargar los comunicados"
                description="Puede ser un problema temporario del servidor."
                action={
                  <Button variant="secondary" touchTarget onClick={retry}>
                    Reintentar
                  </Button>
                }
              />
            </Card>
          ) : null}
          {data ? (
            <AnnouncementsLists
              data={data}
              view={view}
              editingId={editing?.id}
              onViewChange={setView}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ) : null}
        </div>
        {deleting ? (
          <AnnouncementDeleteDialog
            announcement={deleting}
            isBusy={isDeleting}
            onConfirm={() => void handleConfirmDelete(deleting)}
            onCancel={() => setDeleting(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function AnnouncementsTabs({
  tab,
  birthdaysToday,
  onChange,
}: {
  tab: Tab;
  birthdaysToday: number;
  onChange(tab: Tab): void;
}) {
  const tabClass = (selected: boolean) =>
    cn(
      "-mb-px border-b-2 px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]",
      selected ? "border-white text-white" : "border-transparent text-muted",
    );
  return (
    <div role="tablist" className="mb-5 flex gap-0.5 border-b border-line">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "general"}
        onClick={() => onChange("general")}
        className={tabClass(tab === "general")}
      >
        Generales
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "birthdays"}
        onClick={() => onChange("birthdays")}
        className={tabClass(tab === "birthdays")}
      >
        Cumpleaños
        {birthdaysToday > 0 ? " " : null}
        {birthdaysToday > 0 ? (
          <span className="ml-1 inline-block rounded-full bg-white px-1.5 py-px text-[10px] tracking-normal text-black">
            {birthdaysToday}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function AnnouncementsLoading() {
  return (
    <div role="status">
      <span className="sr-only">Cargando comunicados…</span>
      <Skeleton className="h-40 w-full bg-card" />
    </div>
  );
}

interface AnnouncementsListsProps {
  data: StaffAnnouncementsDto;
  view: AnnouncementsView;
  editingId: string | undefined;
  onViewChange(view: AnnouncementsView): void;
  onEdit(announcement: AnnouncementDto): void;
  onDelete(announcement: AnnouncementDto): void;
}

function AnnouncementsLists({ data, view, editingId, onViewChange, onEdit, onDelete }: AnnouncementsListsProps) {
  if (data.active.length === 0 && data.expired.length === 0) {
    return (
      <Card padding="none">
        <EmptyState title="Todavía no publicaste comunicados" />
      </Card>
    );
  }

  return (
    <>
      <AnnouncementsViewToggle
        view={view}
        activeCount={data.active.length}
        expiredCount={data.expired.length}
        onChange={onViewChange}
      />
      <div className="mt-4">
        {view === "active" ? (
          <AnnouncementsGroup
            items={data.active}
            isExpired={false}
            editingId={editingId}
            onEdit={onEdit}
            onDelete={onDelete}
            emptyTitle="No hay comunicados activos."
          />
        ) : (
          <ExpiredGroups items={data.expired} editingId={editingId} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
    </>
  );
}

interface AnnouncementsGroupProps {
  items: AnnouncementDto[];
  isExpired: boolean;
  editingId: string | undefined;
  onEdit(announcement: AnnouncementDto): void;
  onDelete(announcement: AnnouncementDto): void;
  emptyTitle: string;
}

function AnnouncementsGroup({ items, isExpired, editingId, onEdit, onDelete, emptyTitle }: AnnouncementsGroupProps) {
  if (items.length === 0) {
    return (
      <Card padding="none">
        <EmptyState title={emptyTitle} />
      </Card>
    );
  }

  return (
    <Card padding="none">
      <ul className="divide-y divide-line">
        {items.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            isExpired={isExpired}
            isEditing={announcement.id === editingId}
            onEdit={() => onEdit(announcement)}
            onDelete={() => onDelete(announcement)}
          />
        ))}
      </ul>
    </Card>
  );
}

function ExpiredGroups({
  items,
  editingId,
  onEdit,
  onDelete,
}: {
  items: AnnouncementDto[];
  editingId: string | undefined;
  onEdit(announcement: AnnouncementDto): void;
  onDelete(announcement: AnnouncementDto): void;
}) {
  if (items.length === 0) {
    return (
      <Card padding="none">
        <EmptyState title="No hay comunicados vencidos." />
      </Card>
    );
  }

  return (
    <>
      {groupExpiredByMonth(items).map((group) => (
        <section key={group.heading} className="mt-6 first:mt-0">
          <h2 className="mb-2.5 text-[11px] uppercase tracking-[0.3em] text-muted">{group.heading}</h2>
          <AnnouncementsGroup
            items={group.items}
            isExpired
            editingId={editingId}
            onEdit={onEdit}
            onDelete={onDelete}
            emptyTitle=""
          />
        </section>
      ))}
    </>
  );
}
