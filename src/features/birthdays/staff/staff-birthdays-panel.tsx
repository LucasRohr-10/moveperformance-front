"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { BirthdaySettingsDto, TodayBirthdayDto, TodayBirthdaysDto } from "@/lib/api/types";

import { BirthdaySettingsForm } from "./birthday-settings-form";
import { BirthdaysTodayList } from "./birthdays-today-list";
import { getBirthdaySettings } from "./staff-birthdays-api";

type LoadState = "loading" | "error" | { settings: BirthdaySettingsDto };

export interface StaffBirthdaysPanelProps {
  // Loaded by Comunicados for the tab's count; null until it arrives or when it failed.
  today: TodayBirthdaysDto | null;
  // Loading today's list failed: the list shows the error and a retry instead.
  todayFailed: boolean;
  onRetryToday(): void;
  onTodayChange(today: TodayBirthdaysDto): void;
}

// The "Cumpleaños" tab of Comunicados: the greeting's settings and today's birthdays.
export function StaffBirthdaysPanel({ today, todayFailed, onRetryToday, onTodayChange }: StaffBirthdaysPanelProps) {
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(() => {
    getBirthdaySettings().then(
      (settings) => setState({ settings }),
      () => setState("error"),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setState("loading");
    load();
  }

  if (state === "loading") {
    return (
      <div role="status">
        <span className="sr-only">Cargando el saludo de cumpleaños…</span>
        <Skeleton className="h-64 w-full bg-card" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <Card padding="none">
        <EmptyState
          role="alert"
          title="No pudimos cargar el saludo de cumpleaños"
          description="Puede ser un problema temporario del servidor."
          action={
            <Button variant="secondary" touchTarget onClick={retry}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );
  }

  function replaceItem(recorded: TodayBirthdayDto) {
    if (!today) return;
    onTodayChange({
      ...today,
      items: today.items.map((item) => (item.clientId === recorded.clientId ? recorded : item)),
    });
  }

  const mailsSent = today?.items.filter((item) => item.mailSentAt !== null).length ?? 0;
  return (
    <>
      <BirthdaySettingsForm
        settings={state.settings}
        todayMailsSent={mailsSent}
        onSaved={(settings) => setState({ settings })}
      />
      {todayFailed ? (
        <Card padding="none" className="mt-4">
          <EmptyState
            role="alert"
            title="No pudimos cargar los cumpleaños de hoy"
            description="Puede ser un problema temporario del servidor."
            action={
              <Button variant="secondary" touchTarget onClick={onRetryToday}>
                Reintentar
              </Button>
            }
          />
        </Card>
      ) : null}
      {today && !todayFailed ? (
        <BirthdaysTodayList
          today={today}
          message={state.settings.message}
          whatsappEnabled={state.settings.whatsappEnabled}
          onRecorded={replaceItem}
        />
      ) : null}
    </>
  );
}
