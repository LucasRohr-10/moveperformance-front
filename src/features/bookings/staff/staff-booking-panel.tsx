"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/constants/routes.constants";
import { getClient } from "@/features/clients/staff/clients-api";
import { ApiError } from "@/lib/api/errors";
import type { ClientRow, MySubscriptionsDto } from "@/lib/api/types";

import { ClientPicker } from "./client-picker";
import type { OfflinePrices } from "./offline-price";
import { SelectedClientBar } from "./selected-client-bar";
import { getClientSubscriptions, getOfflineChargeAllowance } from "./staff-booking-api";
import { StaffBookingGrid } from "./staff-booking-grid";

interface ChosenClient {
  id: string;
  name: string;
}

type Plans =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; subscriptions: MySubscriptionsDto; offlineRoom: number | null; chargesFailed: boolean };

type PlansOutcome = Plans | { status: "refused"; message: string };

type PanelNotice = { kind: "message"; message: string } | { kind: "deactivated"; clientId: string };

// The backend refuses these two with a message made for Staff.
const REFUSED_CODES = ["ACCOUNT_DEACTIVATED", "CLIENT_NOT_FOUND"];
const DEACTIVATED_COPY = "Este cliente está dado de baja. Reactivalo desde su ficha para reservarle.";
const CLIENT_FAILED_COPY = "No pudimos cargar al cliente. Probá de nuevo.";

function refusalOf(error: unknown): string | null {
  return error instanceof ApiError && REFUSED_CODES.includes(error.body.code) ? error.body.message : null;
}

function nameOf(client: { name: string; lastName: string | null }): string {
  return `${client.name} ${client.lastName ?? ""}`.trim();
}

/** The plans are what the calendar needs; the charges only give the cap, so their failure does not stop the booking. */
async function fetchPlans(clientId: string): Promise<PlansOutcome> {
  const [subscriptions, allowance] = await Promise.allSettled([
    getClientSubscriptions(clientId),
    getOfflineChargeAllowance(clientId),
  ]);
  if (subscriptions.status === "rejected") {
    const message = refusalOf(subscriptions.reason);
    return message ? { status: "refused", message } : { status: "error" };
  }
  return {
    status: "ready",
    subscriptions: subscriptions.value,
    offlineRoom: allowance.status === "fulfilled" ? allowance.value.remaining : null,
    chargesFailed: allowance.status === "rejected",
  };
}

function PlansLoading() {
  return (
    <div role="status">
      <span className="sr-only">Cargando sus planes…</span>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

/** Staff picks a client and books in that client's own calendar; the cart starts empty with every client. */
export function StaffBookingPanel({
  initialClientId,
  prices,
}: {
  initialClientId: string | null;
  prices: OfflinePrices;
}) {
  const router = useRouter();
  const [client, setClient] = useState<ChosenClient | null>(null);
  const [plans, setPlans] = useState<Plans>({ status: "loading" });
  const [notice, setNotice] = useState<PanelNotice | null>(null);
  const [isEntering, setIsEntering] = useState(initialClientId !== null);
  // The client on screen (or being entered), readable from async callbacks and the URL effect.
  const currentIdRef = useRef<string | null>(null);
  // Only the latest request may write: a slow answer for a client already left is dropped.
  const requestRef = useRef(0);

  function leave(next: PanelNotice | null) {
    requestRef.current += 1;
    currentIdRef.current = null;
    setClient(null);
    setIsEntering(false);
    setNotice(next);
  }

  function loadPlans(clientId: string, requestId: number, isReload: boolean) {
    void fetchPlans(clientId).then((outcome) => {
      // Only the client on screen may receive plans, whatever asked for them.
      if (requestId !== requestRef.current || clientId !== currentIdRef.current) return;
      if (outcome.status === "refused") {
        if (isReload) return;
        leave({ kind: "message", message: outcome.message });
        router.replace(ROUTES.STAFF_BOOK, { scroll: false });
        return;
      }
      // A failed reload keeps what is on screen instead of replacing the calendar with an error.
      if (outcome.status === "error" && isReload) return;
      setPlans(outcome);
    });
  }

  function open(next: ChosenClient) {
    requestRef.current += 1;
    currentIdRef.current = next.id;
    setClient(next);
    setIsEntering(false);
    setNotice(null);
    setPlans({ status: "loading" });
    loadPlans(next.id, requestRef.current, false);
  }

  function pick(row: ClientRow) {
    open({ id: row.id, name: nameOf(row) });
    router.replace(`${ROUTES.STAFF_BOOK}?clientId=${encodeURIComponent(row.id)}`, { scroll: false });
  }

  function change() {
    leave(null);
    router.replace(ROUTES.STAFF_BOOK, { scroll: false });
  }

  function retry() {
    if (!client) return;
    requestRef.current += 1;
    setPlans({ status: "loading" });
    loadPlans(client.id, requestRef.current, false);
  }

  // A booking that finishes after Staff moved on to another client must not reload for the new one.
  function reload(clientId: string) {
    if (clientId !== currentIdRef.current) return;
    requestRef.current += 1;
    loadPlans(clientId, requestRef.current, true);
  }

  // The URL is the way in: the page with ?clientId, and a later change of it (the sidebar link back to a bare Reservar).
  // What this panel writes to the URL itself already matches the client on screen, so it is skipped.
  useEffect(() => {
    if (initialClientId === currentIdRef.current) return;
    if (initialClientId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is the external state being followed
      leave(null);
      return;
    }
    const clientId = initialClientId;
    requestRef.current += 1;
    const requestId = requestRef.current;
    currentIdRef.current = clientId;
    setIsEntering(true);
    getClient(clientId)
      .then((detail) => {
        if (requestId !== requestRef.current) return;
        if (detail.deactivation) {
          leave({ kind: "deactivated", clientId });
          return;
        }
        open({ id: clientId, name: nameOf(detail) });
      })
      .catch((error: unknown) => {
        if (requestId !== requestRef.current) return;
        leave({ kind: "message", message: refusalOf(error) ?? CLIENT_FAILED_COPY });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change of the URL's client starts this
  }, [initialClientId]);

  const noticeView = notice ? (
    <Notice tone="warning">
      {notice.kind === "deactivated" ? (
        <>
          {DEACTIVATED_COPY}{" "}
          <Link href={`${ROUTES.STAFF_CLIENTS}/${notice.clientId}`} className="underline underline-offset-2">
            Abrir su ficha →
          </Link>
        </>
      ) : (
        notice.message
      )}
    </Notice>
  ) : null;

  if (!client) {
    return (
      <div className="space-y-6">
        {noticeView}
        {isEntering ? <PlansLoading /> : <ClientPicker onPick={pick} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SelectedClientBar name={client.name} onChange={change} />
      {plans.status === "loading" ? <PlansLoading /> : null}
      {plans.status === "error" ? (
        <Notice tone="danger" role="alert">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>No pudimos cargar sus planes.</span>
            <Button type="button" variant="secondary" size="sm" touchTarget onClick={retry}>
              Reintentar
            </Button>
          </div>
        </Notice>
      ) : null}
      {plans.status === "ready" ? (
        <>
          {plans.chargesFailed ? <Notice tone="warning">No pudimos ver sus cobros por fuera.</Notice> : null}
          <StaffBookingGrid
            key={client.id}
            subscriptions={plans.subscriptions}
            staff={{ client, offlineRoom: plans.offlineRoom, prices, onBooked: () => reload(client.id) }}
          />
        </>
      ) : null}
    </div>
  );
}
